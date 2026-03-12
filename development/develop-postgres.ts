import fs0 from "fs";
import path from "path";
import { Option, Command } from "@if3250_k01_g08_itx/build-tools/commander";
import { $ } from "@if3250_k01_g08_itx/build-tools/dax";

const dataDirectory = path.resolve(import.meta.dirname, ".private", "postgres");

const cli = new Command()
	.name("run-postgres")
	.description("Initialize and start a local PostgreSQL instance for development")
	.addOption(new Option("--pg-bin <path>", "Path to the PostgreSQL bin directory (containing initdb and postgres executables)"))
	.addOption(new Option("--port <port>", "Port for the PostgreSQL server to listen on").default("5432").argParser(v => parseInt(v)))
	.addOption(new Option("--init-only", "Only initialize the data directory, don't start the server").default(false))
	.parse();
const opts = cli.opts<{
	pgBin?: string;
	port: number;
	initOnly: boolean;
}>();

async function resolvePgExecutable(name: string): Promise<string> {
	if(opts.pgBin != null && opts.pgBin.length > 0) {
		const resolved = path.join(opts.pgBin, name);
		console.log(`Using explicit path: ${resolved}`);
		return resolved;
	}
	const found = await $.which(name);
	if(found != null) {
		console.log(`Found ${name} on PATH: ${found}`);
		return found;
	}
	console.error(
		`Could not find "${name}" on PATH.\n` +
		"Please either:\n" +
		"  - Add PostgreSQL bin directory to your PATH, or\n" +
		"  - Use --pg-bin <path> to specify it explicitly"
	);
	process.exit(1);
}

const initdbPath = await resolvePgExecutable("initdb");
const postgresPath = await resolvePgExecutable("postgres");

if(!fs0.existsSync(dataDirectory)) {
	console.log(`Initializing PostgreSQL data directory at: ${dataDirectory}`);
	await $`${initdbPath} -D ${dataDirectory}`;
}
if(opts.initOnly) {
	console.log("Data directory initialized. Skipping server start (--init-only).");
	process.exit(0);
}
console.log(`Starting PostgreSQL server with data directory: ${dataDirectory}`);
console.log(`Listening on port: ${opts.port}`);
console.log("Press Ctrl+C to stop the server.\n");
await $`${postgresPath} -D ${dataDirectory} -p ${opts.port}`;
