import fs from "fs/promises";
import path from "path";
import { Command } from "@if3250_k01_g08_itx/build-tools/commander";

const cli = new Command()
	.parse();
const cliOptions = cli.opts<object>();

const baseDirectory = path.join(import.meta.dirname, "..");
await fs.rm(path.join(baseDirectory, "dist"), { force: true, recursive: true });
