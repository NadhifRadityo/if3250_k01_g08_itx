import * as constants from "next/constants.js";
import debug from "next/dist/compiled/debug/index.js";

const log = debug("build:plugin:withBuildMetadata");

export default async function withBuildMetadata(nextConfig = {}, { phase }) {
	log("Initializing plugin...");
	const path = await import("path");
	const fs = await import("fs/promises");
	const zlib = await import("zlib");
	const crypto = await import("crypto");
	const { execFile } = await import("child_process");
	const { default: mignore } = await import("ignore");

	const global = {
		get staticBuildDate() { return globalThis.__next_build_metadata_static_build_date__; },
		set staticBuildDate(value) { globalThis.__next_build_metadata_static_build_date__ = value; },
		get watcher() { return globalThis.__next_build_metadata_watcher__; },
		set watcher(value) { globalThis.__next_build_metadata_watcher__ = value; },
		get promiseResolver() { return globalThis.__next_build_metadata_promise_resolver__; },
		set promiseResolver(value) { globalThis.__next_build_metadata_promise_resolver__ = value; },
		get generateReasons() { return globalThis.__next_build_metadata_generate_reasons__; },
		set generateReasons(value) { globalThis.__next_build_metadata_generate_reasons__ = value; },
		get debounceHandle() { return globalThis.__next_build_metadata_debounce_handle__; },
		set debounceHandle(value) { globalThis.__next_build_metadata_debounce_handle__ = value; }
	};
	const options = {
		base: process.cwd(),
		allowReadFileDirectly: true,
		includeUnstaged: true,
		includeUntracked: true,
		dev: phase == constants.PHASE_DEVELOPMENT_SERVER,
		...nextConfig
	};
	const gitRoot = await (async () => {
		const base = options.base;
		const dirRoot = path.parse(base).root;
		let dir = base;
		let attempts = 0;
		while(dir != dirRoot && attempts++ < 30) {
			try {
				await fs.access(path.join(dir, ".git"), fs.constants.R_OK);
				const stat = await fs.stat(path.join(dir, ".git"));
				if(stat.isDirectory()) return dir;
				const gitDirContent = await fs.readFile(path.join(dir, ".git"), "utf8");
				const gitDirIndex = gitDirContent.includes("gitdir:") ? gitDirContent.indexOf("gitdir:") + "gitdir:".length : 0;
				const gitDirEndIndex = (gitDirContent.indexOf("\n", gitDirIndex) + 1) || gitDirContent.length;
				const gitDir = gitDirContent.slice(gitDirIndex, gitDirEndIndex).trim();
				return path.join(dir, gitDir);
			} catch(_) {
				dir = path.dirname(dir);
			}
		}
		throw new Error("Cannot find git project");
	})();
	const gitFile = (gitRoot, ...args) => path.join(gitRoot, ".git", ...args);
	const gitArgs = (changeDir, gitRoot, ...args) => ["-C", changeDir, `--git-dir=${path.join(gitRoot, ".git")}`, `--work-tree=${gitRoot}`, ...args];
	const generateSHA1 = string => { const shasum = crypto.createHash("sha1"); shasum.update(string); return shasum.digest("hex"); };
	const runCmd = async (cwd, cmd, args) => {
		log(`Executing ${JSON.stringify(`${cmd} ${args.join(" ")}`)}`);
		return new Promise((resolve, reject) => {
			const childProcess = execFile(cmd, args, { cwd, encoding: "utf-8" }, (error, stdout, stderr) => {
				if(error == null && childProcess.exitCode < 0)
					error = new Error(`Command failed with exit code ${childProcess.exitCode}: ${cmd} ${args.join(" ")}\n${stderr}`);
				if(error != null) {
					reject(error);
					return;
				}
				resolve(stdout);
			});
			childProcess.addListener("error", e => reject(e));
		});
	};
	const parseGitDate = (timeStamp, timeOffset) => {
		const timestampMs = parseInt(timeStamp, 10) * 1000;
		const offsetSign = timeOffset[0] == "+" ? 1 : -1;
		const offsetHours = parseInt(timeOffset.slice(1, 3), 10);
		const offsetMinutes = parseInt(timeOffset.slice(3, 5), 10);
		const offsetMs = offsetSign * (offsetHours * 3600 + offsetMinutes * 60) * 1000;
		return new Date(timestampMs - offsetMs);
	};
	const parseGitCommitObject = commitObject => {
		const fullRegex = /^(?:commit\s+\d+[\d\0]+)(tree\s+[a-zA-Z0-9]{40})((?:\r?\nparent\s+[a-zA-Z0-9]{40})+)(\r?\nauthor\s(?:[^<]+)\s+<(?:[^>]+)>\s+(?:[0-9]+)\s+(?:[+-][0-9]{4}))(\r?\ncommitter\s(?:[^<]+)\s+<(?:[^>]+)>\s+(?:[0-9]+)\s+(?:[+-][0-9]{4}))(\r?\ngpgsig\s+(?:-+\s*BEGIN\s+[a-zA-Z0-9_.\-$\s]+\s*-+)\s*?(?:\r?\n.*)*?\r?\n\s*(?:-+\s*END\s+[a-zA-Z0-9_.\-$\s]+\s*-+))?\r?\n\r?\n((?:.|\r?\n)+)$/gm;
		const fullMatcher = fullRegex.exec(commitObject);
		if(fullMatcher == null)
			return null;
		const treeRegex = /tree\s+([a-zA-Z0-9]{40})/gm;
		const parentRegex = /parent\s+([a-zA-Z0-9]{40})/gm;
		const authorRegex = /author\s(?<name>[^<]+)\s+<(?<email>[^>]+)>\s+(?<timeStamp>[0-9]+)\s+(?<timeOffset>[+-][0-9]{4})/gm;
		const committerRegex = /committer\s(?<name>[^<]+)\s+<(?<email>[^>]+)>\s+(?<timeStamp>[0-9]+)\s+(?<timeOffset>[+-][0-9]{4})/gm;
		const gpgSigRegex = /gpgsig\s+((?:-+\s*BEGIN\s+[a-zA-Z0-9_.\-$\s]+\s*-+)\s*?(?:\r?\n.*)*?\r?\n\s*(?:-+\s*END\s+[a-zA-Z0-9_.\-$\s]+\s*-+))\s*/gm;
		const tree = treeRegex.exec(fullMatcher[1].trim())[1].trim();
		const parents = [...fullMatcher[2].trim().matchAll(parentRegex)].map(m => m[1].trim());
		const author = authorRegex.exec(fullMatcher[3].trim()).groups;
		const committer = committerRegex.exec(fullMatcher[4].trim()).groups;
		const gpgSig = fullMatcher[5] != null ? gpgSigRegex.exec(fullMatcher[5].trim())[1] : null;
		author.name = author.name.trim();
		author.email = author.email.trim();
		author.timeStamp = author.timeStamp.trim();
		author.timeOffset = author.timeOffset.trim();
		author.time = parseGitDate(author.timeStamp, author.timeOffset);
		committer.name = committer.name.trim();
		committer.email = committer.email.trim();
		committer.timeStamp = committer.timeStamp.trim();
		committer.timeOffset = committer.timeOffset.trim();
		committer.time = parseGitDate(committer.timeStamp, committer.timeOffset);
		return { tree, parents, author, committer, gpgSig };
	};
	const getGitHeadCommitId = async ({ base, gitRoot, allowReadFileDirectly }) => {
		let readFileError = null;
		if(allowReadFileDirectly) {
			try {
				const headRefContent = await fs.readFile(gitFile(gitRoot, "HEAD"), "utf-8");
				const headRefIndex = headRefContent.includes("ref:") ? headRefContent.indexOf("ref:") + "ref:".length : 0;
				const headRefEndIndex = (headRefContent.indexOf("\n", headRefIndex) + 1) || headRefContent.length;
				const headRef = headRefContent.slice(headRefIndex, headRefEndIndex).trim();
				if(!headRef)
					throw new Error("Git HEAD file does not have ref");
				const commitId = (await fs.readFile(gitFile(gitRoot, headRef), "utf-8")).trim();
				if(!commitId)
					throw new Error("Git REF file is empty");
				return commitId;
			} catch(e) {
				readFileError = e;
			}
		}
		try {
			const commitId = (await runCmd(base, "git", gitArgs(base, gitRoot, "rev-parse", "HEAD"))).trim();
			if(!commitId) throw new Error("Output of `git rev-parse HEAD` is empty");
			return commitId;
		} catch(e) {
			if(readFileError != null)
				e.cause = readFileError;
			throw e;
		}
	};
	const getGitCommitObject = async ({ base, gitRoot, commitId, allowReadFileDirectly }) => {
		let readFileError = null;
		if(allowReadFileDirectly) {
			try {
				const commitObjectFile = gitFile(gitRoot, "objects", commitId.slice(0, 2), commitId.slice(2));
				const commitObject = await new Promise((resolve, reject) => fs.readFile(commitObjectFile).then(
					c => zlib.inflate(c, (e, r) => { if(e != null) reject(e); else resolve(r.toString("utf-8")); }),
					e => reject(e)));
				const parsedCommitObject = parseGitCommitObject(commitObject);
				if(parsedCommitObject == null)
					throw new Error("Cannot parse commit object file");
				return parsedCommitObject;
			} catch(e) {
				readFileError = e;
			}
		}
		try {
			const commitObject = await runCmd(base, "git", gitArgs(base, gitRoot, "cat-file", "-p", commitId));
			const parsedCommitObject = parseGitCommitObject(commitObject);
			if(parsedCommitObject == null)
				throw new Error("Cannot parse commit object file");
			return parsedCommitObject;
		} catch(e) {
			if(readFileError != null)
				e.cause = readFileError;
			throw e;
		}
	};
	const getGitFileStats = async ({ base, gitRoot, includeUnstaged, includeUntracked }) => {
		const listFiles = (await runCmd(base, "git", gitArgs(base, gitRoot,
			"ls-files", ...(includeUnstaged ? ["--modified"] : []), ...(includeUntracked ? ["--others"] : []),
			"--exclude-standard", "--exclude='node_modules'", "--exclude='.next'")))
			.split("\n").map(f => f.trim()).filter(f => f.length > 0);
		const fileStatsSettled = await Promise.allSettled(listFiles.map(async f => [f.replaceAll("\\", "/"), await fs.stat(path.join(gitRoot, f))]));
		const errors = fileStatsSettled.filter(s => s.status == "rejected" && s.reason.code != "ENOENT").map(s => s.reason);
		if(errors.length > 0)
			throw new Error("Cannot stat files", { cause: errors });
		return fileStatsSettled.filter(s => s.status == "fulfilled").map(s => s.value);
	};
	const staticBuildDate = global.staticBuildDate ??= (new Date()).toISOString();
	const generateBuildMetadata = async () => {
		const { base, allowReadFileDirectly, includeUnstaged, includeUntracked, dev } = options;
		const commitIdPromise = getGitHeadCommitId({ base, gitRoot, allowReadFileDirectly });
		const commitObjectPromise = commitIdPromise.then(v => getGitCommitObject({ base, gitRoot, commitId: v, allowReadFileDirectly }));
		const unstagedUntrackedFileStatsPromise = includeUnstaged || includeUntracked ? getGitFileStats({ base, gitRoot, includeUnstaged, includeUntracked }) : null;
		const [commitId, commitObject, unstagedUntrackedFileStats] = await Promise.all(
			[commitIdPromise, commitObjectPromise, unstagedUntrackedFileStatsPromise]);
		const unstagedUntrackedId = unstagedUntrackedFileStats == null || unstagedUntrackedFileStats.length == 0 ? null :
			generateSHA1(unstagedUntrackedFileStats.map(([f, s]) => `${f}:${s.ino}:${s.size}:${s.blocks}:${s.mtime}`).join("\n"));
		const buildId = `${dev ? "DEV-" : ""}${commitId}${unstagedUntrackedId != null ? `-${unstagedUntrackedId}` : ""}`;
		const buildDate = new Date(Math.max(Date.parse(staticBuildDate), ...(unstagedUntrackedFileStats != null ? unstagedUntrackedFileStats.map(([_, s]) => s.mtime.getTime()) : [])));
		log(`Generated new build id: ${buildId} ${buildDate.toISOString()}`);
		const buildMetadata = {
			BUILD_ID: buildId,
			BUILD_DATE: buildDate.toISOString(),
			BUILD_COMMIT_ID: commitId,
			BUILD_COMMIT_TREE: commitObject.tree,
			BUILD_COMMIT_PARENTS: JSON.stringify(commitObject.parents),
			BUILD_COMMIT_AUTHOR_NAME: commitObject.author.name,
			BUILD_COMMIT_AUTHOR_EMAIL: commitObject.author.email,
			BUILD_COMMIT_AUTHOR_TIME: commitObject.author.time.toISOString(),
			BUILD_COMMIT_AUTHOR_TIMESTAMP: commitObject.author.timeStamp,
			BUILD_COMMIT_AUTHOR_TIMEOFFSET: commitObject.author.timeOffset,
			BUILD_COMMIT_COMMITTER_NAME: commitObject.committer.name,
			BUILD_COMMIT_COMMITTER_EMAIL: commitObject.committer.email,
			BUILD_COMMIT_COMMITTER_TIME: commitObject.committer.time.toISOString(),
			BUILD_COMMIT_COMMITTER_TIMESTAMP: commitObject.committer.timeStamp,
			BUILD_COMMIT_COMMITTER_TIMEOFFSET: commitObject.committer.timeOffset,
			BUILD_COMMIT_GPG_SIGNATURE: commitObject.gpgSig ?? ""
		};
		for(const [metadataKey, metadataValue] of Object.entries(buildMetadata)) {
			process.env[`NEXT_PUBLIC_${metadataKey}`] = metadataValue;
			if(nextConfig.env != null)
				nextConfig.env[`NEXT_PUBLIC_${metadataKey}`] = metadataValue;
			if(nextConfig.publicRuntimeConfig != null)
				nextConfig.publicRuntimeConfig[metadataKey] = metadataValue;
		}
		return buildMetadata;
	};
	const scheduleGenerateBuildMetadata = reason => {
		const promiseResolver = global.promiseResolver ??= Promise.withResolvers();
		const generateReasons = global.generateReasons ??= [];
		if(reason != null)
			generateReasons.push(reason);
		if(global.debounceHandle != null)
			clearTimeout(global.debounceHandle);
		const handle = global.debounceHandle = setTimeout(() => {
			if(global.debounceHandle != handle)
				return;
			global.debounceHandle = null;
			const generateReasons = global.generateReasons != null ? [...new Set(global.generateReasons)] : null;
			if(generateReasons != null)
				global.generateReasons = null;
			log(`Generating build id${generateReasons != null && generateReasons.length > 0 ? ` because ${
				generateReasons.length > 1 ? generateReasons.slice(0, -1).join(", ") + ", and " + generateReasons.at(-1) : generateReasons[0]}` : ""}`);
			const promiseResolver = global.promiseResolver;
			const promise = generateBuildMetadata().then(
				result => {
					if(promiseResolver?.__promise == promise) {
						promiseResolver.resolve(result);
						promiseResolver.__promise = null;
						if(global.promiseResolver == promiseResolver)
							global.promiseResolver = null;
					}
					return result;
				},
				error => {
					if(promiseResolver?.__promise == promise) {
						promiseResolver.reject(error);
						promiseResolver.__promise = null;
						if(global.promiseResolver == promiseResolver)
							global.promiseResolver = null;
					}
					throw error;
				}
			);
			if(promiseResolver != null)
				promiseResolver.__promise = promise;
		}, 500);
		return promiseResolver.promise;
	};

	await scheduleGenerateBuildMetadata("plugin initialization");
	if(process.env.NEXT_PRIVATE_WORKER && phase == constants.PHASE_DEVELOPMENT_SERVER && global.watcher == null) {
		const watcher = global.watcher = fs.watch(options.base, { recursive: true, persistent: false });
		let ignore;
		let ignorePromise = null;
		const reloadIgnore = () => {
			if(ignorePromise != null)
				return ignorePromise;
			const promise = ignorePromise = (async () => {
				log("Reloading ignore rules");
				const gitignoreFiles = (await runCmd(options.base, "git", gitArgs(options.base, gitRoot, "ls-files", "*.gitignore")))
					.split("\n").map(l => l.trim()).filter(f => f.length > 0);
				const gitignoreEntries = (await Promise.all(gitignoreFiles.map(async f =>
					(await fs.readFile(path.join(options.base, f), "utf-8")).split("\n").map(l => l.trim())
						.filter(l => l.length > 0 && !l.startsWith("#")).map(p => path.posix.join(path.dirname(f), p))
				))).flat();
				ignore = mignore();
				ignore.add(".git/");
				ignore.add("node_modules/");
				ignore.add(".next/");
				for(const gitignoreEntry of gitignoreEntries)
					ignore.add(gitignoreEntry);
			})().finally(() => {
				if(ignorePromise == promise)
					ignorePromise = null;
			});
			return promise;
		};
		await reloadIgnore();
		(async () => {
			for await(const event of watcher) {
				if(event.filename == null)
					continue;
				if(event.filename.includes(".gitignore"))
					await reloadIgnore();
				if(ignore.ignores(event.filename) || ignore.ignores(event.filename + "/"))
					continue;
				scheduleGenerateBuildMetadata("changes detected");
			}
		})();
	}
	const BuildMetadataPlugin = class BuildMetadataPlugin {
		PLUGIN_NAME = BuildMetadataPlugin.name;
		apply(compiler) {
			compiler.hooks.beforeCompile.tapPromise(this.PLUGIN_NAME, async () => {
				await global.promiseResolver?.promise;
			});
		}
	};
	return {
		generateBuildId: async () => {
			const metadata = await scheduleGenerateBuildMetadata("Next.js requested it");
			return metadata.BUILD_ID;
		},
		webpack(config, options) {
			log("Adding build id plugin...");
			const DefinePlugin = options.webpack.DefinePlugin;
			const definePlugin = config.plugins.find(p => p instanceof options.webpack.DefinePlugin);
			const metadataKeys = new Set([
				"BUILD_ID",
				"BUILD_DATE",
				"BUILD_COMMIT_ID",
				"BUILD_COMMIT_TREE",
				"BUILD_COMMIT_PARENTS",
				"BUILD_COMMIT_AUTHOR_NAME",
				"BUILD_COMMIT_AUTHOR_EMAIL",
				"BUILD_COMMIT_AUTHOR_TIME",
				"BUILD_COMMIT_AUTHOR_TIMESTAMP",
				"BUILD_COMMIT_AUTHOR_TIMEOFFSET",
				"BUILD_COMMIT_COMMITTER_NAME",
				"BUILD_COMMIT_COMMITTER_EMAIL",
				"BUILD_COMMIT_COMMITTER_TIME",
				"BUILD_COMMIT_COMMITTER_TIMESTAMP",
				"BUILD_COMMIT_COMMITTER_TIMEOFFSET",
				"BUILD_COMMIT_GPG_SIGNATURE"
			]);
			for(const metadataKey of metadataKeys)
				definePlugin.definitions[`process.env.NEXT_PUBLIC_${metadataKey}`] = DefinePlugin.runtimeValue(() => JSON.stringify(process.env[`NEXT_PUBLIC_${metadataKey}`]));
			definePlugin.definitions = new Proxy(definePlugin.definitions, {
				deleteProperty: (target, property) => {
					if(!metadataKeys.has(property))
						return Reflect.deleteProperty(target, property);
					log(`Deleting definition for ${property} was denied`);
					return false;
				},
				set: (target, property, value, receiver) => {
					if(!metadataKeys.has(property))
						return Reflect.set(target, property, value, receiver);
					log(`Setting definition for ${property} was denied`);
					return true;
				}
			});
			config.plugins = [...config.plugins, new BuildMetadataPlugin()];

			if(typeof nextConfig.webpack == "function")
				return nextConfig.webpack(config, options);
			return config;
		}
	};
}
