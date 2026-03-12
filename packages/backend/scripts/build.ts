import path from "path";
import { Command } from "@if3250_k01_g08_itx/build-tools/commander";
import { swc, json, rollup, replace, commonjs, progress, bundleStats, nodeResolve, importMetaAssets } from "@if3250_k01_g08_itx/build-tools/rollup";

const cli = new Command()
	.parse();
const cliOptions = cli.opts<object>();

const baseDirectory = path.join(import.meta.dirname, "..");
const compilation = await rollup({
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
		replace({
			preventAssignment: true,
			values: Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith("BACKEND_"))
				.map(([k, v]) => [`import.meta.env.${k}`, JSON.stringify(v)] as const))
		}),
		progress(),
		bundleStats()
	]
});
await compilation.write({
	dir: path.join(baseDirectory, "dist/production/bundle"),
	format: "esm",
	entryFileNames: "[name].mjs",
	sourcemap: true
});
await compilation.close();
