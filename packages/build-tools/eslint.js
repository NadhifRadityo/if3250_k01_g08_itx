import path from "path";
import { includeIgnoreFile } from "@eslint/compat";
import { defineConfig } from "eslint/config";
import globals from "globals";
import eslintTypescript from "typescript-eslint";

export default defineConfig([
	includeIgnoreFile(path.join(import.meta.dirname, ".gitignore")),
	{
		languageOptions: {
			parser: eslintTypescript.parser,
			parserOptions: {
				project: path.join(import.meta.dirname, "tsconfig.json"),
				tsconfigRootDir: import.meta.dirname
			},
			globals: {
				...globals.node
			}
		}
	}
]);
