# Code Style Guide

This document explains the coding conventions enforced by our ESLint configuration (`eslint.config.js`) and the TypeScript strictness options in `tsconfig.json`.

## Table of Contents

- [Formatting](#formatting)
- [Equality Operators](#equality-operators)
- [Boolean Expressions](#boolean-expressions)
- [Imports](#imports)
- [Unused Code](#unused-code)
- [Curly Braces](#curly-braces)
- [TypeScript Rules](#typescript-rules)
- [TypeScript Compiler Strictness](#typescript-compiler-strictness)
- [Why `==` Works With `strictNullChecks`](#why--works-with-strictnullchecks)

---

## Formatting

All stylistic rules are enforced via `@stylistic/eslint-plugin`. These are **warnings**, so they won't block CI but will show up in editors.

| Rule | Convention |
| --- | --- |
| Indentation | **Tabs**, including inside `switch` cases |
| Semicolons | **Always** required |
| Trailing commas | **Never** (comma-dangle off) |
| Quotes | **Double quotes** (`"`). Template literals only when needed for interpolation or avoiding escapes |
| Arrow parens | Omit when there is a single parameter: `x => x + 1` |
| Object curlies | Spaces inside: `{ a, b }` |
| Trailing spaces | Not allowed |
| Brace style | **1TBS** (`if {`) with single-line blocks allowed |
| Operator linebreak | Operator goes **after** the line break: `a +\nb` |
| Ternaries | Multiline ternaries have no enforced style |
| Keyword spacing | No space after `if`, `for`, `while`, `catch`, `switch`, `await`. Space after all other keywords |
| Member delimiters | Semicolons in multiline interfaces/types; commas in single-line |
| Multi-spaces | Not allowed (except end-of-line comments) |
| Max statements per line | Up to 5 |

### Examples

```ts
// ✅ Correct
if(condition) {
	doSomething();
}

const obj = { a: 1, b: 2 };

const fn = x => x + 1;

interface User {
	name: string;
	age: number;
}

type Pair = { key: string, value: number };

// ❌ Wrong
if (condition) {    // space after if
  doSomething()     // spaces instead of tabs, missing semicolon
}

const obj = {a: 1, b: 2}   // no spaces inside curlies

const fn = (x) => x + 1;   // unnecessary parens
```

---

## Equality Operators

**Use `==` and `!=`. Never use `===` or `!==`.**

This is enforced via `no-restricted-syntax` — using `===` or `!==` is an **error**.

```ts
// ✅ Correct
if(value == null) { ... }
if(a != b) { ... }

// ❌ Error
if(value === null) { ... }
if(a !== b) { ... }
```

This is an intentional decision that works hand-in-hand with strict boolean expressions and `strictNullChecks`. See [the explainer below](#why--works-with-strictnullchecks) for the full rationale.

---

## Boolean Expressions

The rule `@typescript-eslint/strict-boolean-expressions` is set to **error** with all coercion disabled:

```js
{
	allowString: false,
	allowNumber: false,
	allowNullableObject: false
}
```

This means you **cannot** use truthy/falsy coercion in conditions. Every condition must evaluate to an actual `boolean`.

```ts
// ❌ Error — string is not boolean
const name = "Alice";
if(name) { ... }

// ✅ Correct
if(name.length > 0) { ... }

// ❌ Error — number is not boolean
const count = 5;
if(count) { ... }

// ✅ Correct
if(count > 0) { ... }

// ❌ Error — nullable object is not boolean
const user: User | null = getUser();
if(user) { ... }

// ✅ Correct
if(user != null) { ... }
```

This eliminates entire categories of bugs where `""`, `0`, or `NaN` are accidentally treated as "missing."

---

## Imports

Import ordering is enforced by `eslint-plugin-perfectionist` and grouped in this order:

1. **Built-in** modules (`node:fs`, `node:path`, etc.)
2. **External** packages (`hono`, `zod`, `drizzle-orm`, etc.)
3. *(blank line)*
4. **Internal** workspace imports and subpath imports
5. *(blank line)*
6. **Relative** imports (parent, sibling, index)
7. Side-effect styles, TS equals imports, unknown

Within a group there are **no blank lines** between imports. Named imports are sorted by line-length (ascending).

```ts
// ✅ Correct ordering
import path from "node:path";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "@/db";

import { helper } from "./helper";
```

**Unused imports** are automatically flagged as warnings by `eslint-plugin-unused-imports` and can be auto-fixed. Variables prefixed with `_` are excluded from unused-variable checks.

---

## Unused Code

Handled by `eslint-plugin-unused-imports`:

- **Unused imports** → warning (auto-fixable)
- **Unused variables** → warning, except those prefixed with `_`
- **Unused function arguments** → only checked after the last used argument; `_`-prefixed args are ignored
- **Unused catch-binding variables** → warned unless prefixed with `_`

```ts
// ✅ Fine — underscore prefix signals intentional disuse
const [_first, second] = pair;

try { ... } catch(_e) { ... }

function handler(_req: Request, res: Response) {
	res.send("ok");
}
```

---

## Curly Braces

The `curly` rule is set to `"multi-or-nest"`:

- **Single-statement** bodies may omit braces
- **Multi-statement** bodies must use braces
- Nested `if`/`else` always requires braces

```ts
// ✅ Both valid
if(done) return;

if(done) {
	cleanup();
	return;
}
```

---

## TypeScript Rules

These apply to `.ts` files only:

| Rule | Severity | What it does |
| --- | --- | --- |
| `no-explicit-any` | off | `any` is allowed — use responsibly |
| `no-unused-vars` | off | Handled by `unused-imports` plugin instead |
| `no-useless-constructor` | off | Empty constructors are allowed (e.g., DI) |
| `no-unnecessary-type-assertion` | error | Don't assert a type that is already known |
| `no-unnecessary-boolean-literal-compare` | error | Don't write `x === true` when `x` is already `boolean` |
| `no-non-null-asserted-optional-chain` | error | Don't write `foo?.bar!` — contradictory |
| `no-non-null-asserted-nullish-coalescing` | error | Don't write `foo! ?? bar` — contradictory |
| `non-nullable-type-assertion-style` | error | Prefer `as T` over `as NonNullable<T>` when applicable |

---

## TypeScript Compiler Strictness

The `tsconfig.json` takes a selective approach to strictness rather than enabling the blanket `strict: true` flag.

### `strict: false`

The umbrella `strict` flag is **off**. Instead, individual strict checks are cherry-picked:

| Option | Enabled | Purpose |
| --- | --- | --- |
| `strictNullChecks` | ✅ | `null` and `undefined` are distinct types — you must handle them explicitly |
| `strictBindCallApply` | ✅ | `bind()`, `call()`, and `apply()` are type-checked against the function signature |
| `strictPropertyInitialization` | ✅ | Class properties must be initialized in the constructor or have a definite assignment assertion |
| `strictFunctionTypes` | ❌ (commented) | Contravariant parameter checking for function types — currently disabled for flexibility |

### What `strict: true` would add (and why it's off)

Enabling `strict: true` would also turn on:

- **`noImplicitAny`** — errors on implicit `any` types. Currently off because `no-explicit-any` is also off; the codebase tolerates `any` where practical.
- **`noImplicitThis`** — errors when `this` has an implicit `any` type. Off for flexibility with certain patterns.
- **`alwaysStrict`** — emits `"use strict"` in every file. Unnecessary with ESM (`"type": "module"`) since ES modules are strict by default.
- **`useUnknownInCatchVariables`** — types `catch` variables as `unknown` instead of `any`.
- **`strictFunctionTypes`** — contravariant function parameter checking.

The selected options give strong null safety and initialization guarantees without being overly restrictive on `any` usage.

---

## Why `==` Works With `strictNullChecks`

At first glance, banning `===` might seem unsafe. In most JavaScript projects it would be. This project makes it safe through **two complementary rules** that eliminate the scenarios where `==` causes problems.

### The usual argument for `===`

The classic reason to prefer `===` is that `==` performs type coercion, leading to surprises:

```js
0 == ""       // true  (number coerced to string)
0 == false    // true  (boolean coerced to number)
"" == false   // true  (both coerced)
null == undefined // true (spec-defined special case)
```

### Why it's safe here

This project layers three safeguards that neutralize those risks:

#### 1. `strictNullChecks` (TypeScript)

With `strictNullChecks` enabled, `null` and `undefined` are **not** assignable to other types. The compiler forces you to narrow nullable types before using them. This means you always know at the type level whether a value can be `null` or `undefined`.

```ts
function greet(name: string) {
	// TypeScript guarantees `name` is a string here — never null or undefined.
	// `name == 0` would be a type error because string and number aren't comparable.
}
```

#### 2. `strict-boolean-expressions` (ESLint)

With `allowString: false`, `allowNumber: false`, and `allowNullableObject: false`, you can never rely on truthy/falsy coercion. You must write explicit comparisons:

```ts
// You can't write: if(value) { ... }
// You must write:  if(value != null) { ... }
```

This forces every condition to be explicit about what it is checking, so there is no hidden coercion path.

#### 3. TypeScript's type system itself

TypeScript will flag comparisons between incompatible types. You cannot accidentally write `someNumber == someString` — the compiler will error because those types have no overlap.

```ts
const count: number = 5;
const name: string = "Alice";

if(count == name) { }  // TS Error: This comparison appears to be unintentional
                        // because the types 'number' and 'string' have no overlap.
```

### The one place `==` is actually better

The `null == undefined` coercion becomes a **feature**:

```ts
// With ==, one check covers both null and undefined:
if(value == null) { ... }

// With ===, you'd need two checks:
if(value === null || value === undefined) { ... }
```

Since `strictNullChecks` ensures you only reach this comparison when the type is genuinely `T | null | undefined`, the `==` version is both shorter and equally safe.

### Summary

| Layer | Prevents |
| --- | --- |
| `strictNullChecks` | Null/undefined sneaking into non-nullable positions |
| `strict-boolean-expressions` | Truthy/falsy coercion hiding bugs |
| TypeScript type overlap checks | Comparing unrelated types like `number == string` |

Together, these make `==` as safe as `===` while being more ergonomic for null checks. The `===`/`!==` ban is enforced to keep the codebase consistent.
