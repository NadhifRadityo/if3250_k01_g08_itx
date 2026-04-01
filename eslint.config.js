import path from "path";
import { fileURLToPath } from "url";
import eslintNext from "@next/eslint-plugin-next";
import { includeIgnoreFile, convertIgnorePatternToMinimatch } from "@eslint/compat";
import eslintJavascript from "@eslint/js";
import eslintStylistic from "@stylistic/eslint-plugin";
import eslintPerfectionist from "eslint-plugin-perfectionist";
import eslintUnusedImports from "eslint-plugin-unused-imports";
import { defineConfig } from "eslint/config";
import globals from "globals";
import eslintTypescript from "typescript-eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignoreFile = path.join(__dirname, ".gitignore");
const tsConfigFile = path.join(__dirname, "tsconfig.json");

export default defineConfig([
	includeIgnoreFile(gitignoreFile),
	{ name: "Ignore next.lock", ignores: [convertIgnorePatternToMinimatch("next.lock/")] },
	eslintJavascript.configs.recommended,
	{ files: ["**/*.ts", "**/*.tsx"], extends: [eslintTypescript.configs.recommended] },
	eslintStylistic.configs.recommended,
	eslintNext.configs.recommended,
	{
		languageOptions: {
			parser: eslintTypescript.parser,
			parserOptions: {
				project: tsConfigFile,
				tsconfigRootDir: __dirname
			},
			globals: {
				...globals.browser,
				...globals.node
			}
		},
		plugins: {
			"perfectionist": eslintPerfectionist,
			"unused-imports": eslintUnusedImports
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
			"no-empty-pattern": "off",
			"curly": ["warn", "multi-or-nest"],
			"eqeqeq": "off",
			"import/no-anonymous-default-export": "off",
			"no-bitwise": "off",
			"no-return-assign": "off",
			"no-unused-vars": "off",
			"no-useless-constructor": "off",
			"no-empty": ["error", { "allowEmptyCatch": true }],
			"no-constant-condition": ["warn", { "checkLoops": false }],
			"object-shorthand": "off",
			"require-await": "off",
			"no-restricted-syntax": [
				"error",
				{
					"selector": "BinaryExpression[operator='===']",
					"message": "Use == instead of ==="
				},
				{
					"selector": "BinaryExpression[operator='!==']",
					"message": "Use != instead of !=="
				}
			],
			"unused-imports/no-unused-imports": ["warn"],
			"unused-imports/no-unused-vars": ["warn", {
				vars: "all",
				varsIgnorePattern: "^_",
				args: "after-used",
				argsIgnorePattern: "^_",
				caughtErrors: "all",
				caughtErrorsIgnorePattern: "^_"
			}],
			"perfectionist/sort-imports": ["warn", {
				newlinesBetween: 0,
				type: "natural",
				groups: [
					"value-builtin",
					"value-react",
					"value-react-thirdparty",
					"value-next",
					"value-payload",
					"value-radix",
					"value-external",
					"value-externalUrl",
					"type-builtin",
					"type-external",
					{ newlinesBetween: 1 },
					"value-projectConfig",
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
						groupName: "value-payload",
						elementNamePattern: ["^payload$", "^payload/.+$", "^@payloadcms/.+$"]
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
						groupName: "value-projectConfig",
						elementNamePattern: ["^@payload-config$"]
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
			"perfectionist/sort-named-imports": ["warn", {
				type: "line-length",
				order: "asc",
				fallbackSort: { type: "natural", order: "asc" },
				groups: ["value-import", "type-import"]
			}],
			"@next/next/no-html-link-for-pages": ["error", "app/"],
			"@stylistic/no-trailing-spaces": ["warn"],
			"@stylistic/arrow-parens": ["warn", "as-needed"],
			"@stylistic/semi": ["warn", "always"],
			"@stylistic/no-extra-semi": ["warn"],
			"@stylistic/comma-dangle": ["warn", "never"],
			"@stylistic/indent": ["warn", "tab", { SwitchCase: 1 }],
			"@stylistic/jsx-closing-bracket-location": ["warn", "line-aligned"],
			"@stylistic/jsx-indent-props": ["warn", "tab"],
			"@stylistic/jsx-quotes": ["warn", "prefer-double"],
			"@stylistic/jsx-self-closing-comp": "off",
			"@stylistic/keyword-spacing": ["warn", {
				after: true,
				overrides: {
					if: { after: false },
					for: { after: false },
					while: { after: false },
					catch: { after: false },
					switch: { after: false },
					await: { after: false }
				}
			}],
			"@stylistic/no-tabs": "off",
			"@stylistic/object-curly-spacing": ["warn", "always"],
			"@stylistic/quotes": ["warn", "double", { avoidEscape: true, allowTemplateLiterals: "avoidEscape" }],
			"@stylistic/member-delimiter-style": ["warn", {
				multilineDetection: "brackets",
				multiline: {
					delimiter: "semi",
					requireLast: true
				},
				singleline: {
					delimiter: "comma",
					requireLast: false
				}
			}],
			"@stylistic/indent-binary-ops": ["warn", "tab"],
			"@stylistic/multiline-ternary": "off",
			"@stylistic/operator-linebreak": ["warn", "after"],
			"@stylistic/brace-style": ["warn", "1tbs", { allowSingleLine: true }],
			"@stylistic/max-statements-per-line": ["warn", { max: 5 }],
			"@stylistic/lines-between-class-members": "off",
			"@stylistic/space-before-function-paren": "off",
			"@stylistic/jsx-one-expression-per-line": "off",
			"@stylistic/quote-props": "off",
			"@stylistic/no-multi-spaces": ["warn", { ignoreEOLComments: true }]
		}
	}
]);
