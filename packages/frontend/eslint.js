import path from "path";
import eslintNext from "@next/eslint-plugin-next";
import { includeIgnoreFile, convertIgnorePatternToMinimatch } from "@eslint/compat";
import eslintPerfectionist from "eslint-plugin-perfectionist";
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
				...globals.node,
				...globals.browser
			}
		}
	},
	{ name: "Ignore next.lock", ignores: [convertIgnorePatternToMinimatch("next.lock/")] },
	{ files: ["**/*.ts", "**/*.tsx"], extends: [eslintTypescript.configs.recommended] },
	eslintNext.configs.recommended,
	{
		plugins: {
			"perfectionist": eslintPerfectionist
		}
	},
	{
		files: ["**/*.ts", "**/*.tsx"],
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unused-vars": "off",
			"@typescript-eslint/no-useless-constructor": "off",
			"@typescript-eslint/no-unnecessary-type-assertion": "error",
			"@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
			"@typescript-eslint/no-non-null-asserted-optional-chain": "error",
			"@typescript-eslint/no-non-null-asserted-nullish-coalescing": "error",
			"@typescript-eslint/non-nullable-type-assertion-style": "error",
			"@typescript-eslint/strict-boolean-expressions": ["error", {
				allowString: false,
				allowNumber: false,
				allowNullableObject: false
			}]
		}
	},
	{
		rules: {
			"perfectionist/sort-imports": ["warn", {
				newlinesBetween: 0,
				type: "natural",
				groups: [
					"value-builtin",
					"value-react",
					"value-react-thirdparty",
					"value-next",
					"value-radix",
					"value-external",
					"value-externalUrl",
					"type-builtin",
					"type-external",
					{ newlinesBetween: 1 },
					"value-projectUtils",
					"value-projectComponents",
					"value-projectComponentsExt",
					"value-internal",
					"value-subpath",
					"type-internal",
					"type-subpath",
					{ newlinesBetween: 1 },
					"value-parent",
					"value-sibling",
					"value-index",
					"type-parent",
					"type-sibling",
					"type-index",
					"side-effect-style",
					"ts-equals-import",
					"unknown"
				],
				customGroups: [
					{
						groupName: "value-react",
						elementNamePattern: ["^react$", "^react/.+$", "^@react/.+$"]
					},
					{
						groupName: "value-react-thirdparty",
						elementNamePattern: ["^react-[^/]+?$", "^react-[^/]+?/.+$"]
					},
					{
						groupName: "value-next",
						elementNamePattern: ["^next$", "^next/.+$", "^@next/.+$"]
					},
					{
						groupName: "value-radix",
						elementNamePattern: ["^radix-ui$", "^radix-ui/.+$", "^@radix-ui/.+$"]
					},
					{
						groupName: "value-externalUrl",
						elementNamePattern: ["^https?://.+$"]
					},
					{
						groupName: "value-projectUtils",
						elementNamePattern: ["^@/utils/.+$"]
					},
					{
						groupName: "value-projectComponents",
						elementNamePattern: ["^@/components/[^/]+$"]
					},
					{
						groupName: "value-projectComponentsExt",
						elementNamePattern: ["^@/components/.+$"]
					}
				]
			}],
			"@next/next/no-html-link-for-pages": ["error", "packages/frontend/app/"],
			"@stylistic/jsx-closing-bracket-location": ["warn", "line-aligned"],
			"@stylistic/jsx-indent-props": ["warn", "tab"],
			"@stylistic/jsx-quotes": ["warn", "prefer-double"],
			"@stylistic/jsx-self-closing-comp": "off",
			"@stylistic/jsx-one-expression-per-line": "off"
		}
	}
]);
