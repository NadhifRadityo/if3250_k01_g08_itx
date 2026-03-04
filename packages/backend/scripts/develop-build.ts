import path from "path";
import { Command } from "@if3250_k01_g08_itx/build-tools/commander";
import { swc, json, watch, commonjs, progress, bundleStats, nodeResolve, importMetaAssets } from "@if3250_k01_g08_itx/build-tools/rollup";

const cli = new Command()
	.parse();
const cliOptions = cli.opts<object>();

const baseDirectory = path.join(import.meta.dirname, "..");
const watcher = watch({
	input: path.join(baseDirectory, "src/index.ts"),
	plugins: [
		json(),
		swc(),
		commonjs({
			extensions: [".js", ".node"],
			ignoreDynamicRequires: true
		}),
		nodeResolve({
			extensions: [".ts", ".mts", ".js", ".mjs"],
			preferBuiltins: true
		}),
		importMetaAssets(),
		progress(),
		bundleStats()
	],
	output: {
		dir: path.join(baseDirectory, "dist/development/bundle"),
		format: "esm",
		entryFileNames: "[name].mjs",
		sourcemap: true
	}
});
watcher.on("event", event => {
	switch(event.code) {
		case "START":
			console.log("Build started...");
			break;
		case "BUNDLE_START":
			console.log(`Bundling ${event.input}...`);
			break;
		case "BUNDLE_END":
			console.log(`Bundled in ${event.duration}ms`);
			event.result.close();
			break;
		case "END":
			console.log("Waiting for changes...");
			break;
		case "ERROR":
			console.error("Build error:", event.error);
			break;
	}
});
