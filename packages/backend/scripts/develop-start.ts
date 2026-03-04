import { fork, type ChildProcess } from "child_process";
import fs0 from "fs";
import fs from "fs/promises";
import path from "path";
import { Command } from "@if3250_k01_g08_itx/build-tools/commander";

const cli = new Command()
	.parse();
const cliOptions = cli.opts<object>();

const bundleDir = path.join(import.meta.dirname, "../dist/development/bundle");
const entryFile = path.join(bundleDir, "index.mjs");
if(!fs0.existsSync(bundleDir))
	await fs.mkdir(bundleDir, { recursive: true });

let childProcess: ChildProcess | null = null;
function killChild() {
	return new Promise<void>(resolve => {
		if(childProcess == null) {
			resolve();
			return;
		}
		const currentProcess = childProcess;
		currentProcess.once("exit", () => {
			console.log("[develop-start] Process killed.");
			if(childProcess == currentProcess)
				childProcess = null;
			resolve();
		});
		currentProcess.kill("SIGTERM");
		setTimeout(() => { try { currentProcess.kill("SIGKILL"); } catch(_) { } }, 5000);
	});
}
function spawnChild() {
	if(!fs0.existsSync(entryFile))
		return;
	console.log("[develop-start] Starting index.mjs...");
	childProcess = fork(entryFile, { stdio: "inherit" });
	childProcess.on("exit", code => {
		childProcess = null;
		if(code != null && code != 0)
			console.log(`[develop-start] Process exited with code ${code}. Waiting for changes...`);
		else
			console.log("[develop-start] Process exited.");
	});
	childProcess.on("error", err => {
		childProcess = null;
		console.error(`[develop-start] Process error: ${err.message}. Waiting for changes...`);
	});
}

const DEBOUNCE_MS = 300;
let debounceHandle: ReturnType<typeof setTimeout> | null = null;
let handlingChange = false;

if(fs0.existsSync(entryFile))
	spawnChild();
else
	console.log("[develop-start] index.mjs removed. Waiting for it to reappear...");
for await(const _ of fs.watch(bundleDir, { persistent: true })) {
	if(debounceHandle != null)
		clearTimeout(debounceHandle);
	const handle = debounceHandle = setTimeout(async () => {
		if(debounceHandle == handle)
			debounceHandle = null;
		if(handlingChange) return;
		handlingChange = true;
		try {
			if(fs0.existsSync(entryFile)) {
				if(childProcess != null)
					await killChild();
				spawnChild();
				return;
			}
			if(childProcess != null) {
				await killChild();
				console.log("[develop-start] index.mjs removed. Waiting for it to reappear...");
			}
		} finally {
			handlingChange = false;
		}
	}, DEBOUNCE_MS);
}
