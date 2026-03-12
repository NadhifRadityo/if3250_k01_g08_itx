import React, { ComponentProps } from "react";
import ReactJSXDevRuntime from "react/jsx-dev-runtime";
import ReactJSXRuntime from "react/jsx-runtime";
import * as ReactIs from "react-is";

import { ReactRegExpExecArray } from "./reactRegex";

type IsJSXElementConstructorAny<T> = T extends React.JSXElementConstructor<infer P> ? 0 extends (1 & P) ? 1 : 0 : 0;
export type ReactRegExpExtractElementInfo<E extends keyof React.JSX.IntrinsicElements | React.JSXElementConstructor<any> = React.JSXElementConstructor<any>> =
	(E extends any ? React.ReactElement<ComponentProps<E>, IsJSXElementConstructorAny<E> extends 1 ? any : E> : never) &
	{ node: React.ReactNode, children: ReactRegExpExtractElement<React.JSXElementConstructor<any>>[] } &
	{ [key in `c${number}`]?: ReactRegExpExtractElement<React.JSXElementConstructor<any>> };
export type ReactRegExpExtractElementClone<E extends keyof React.JSX.IntrinsicElements | React.JSXElementConstructor<any> = React.JSXElementConstructor<any>> =
	React.FunctionComponent<Partial<React.ComponentProps<E>>> &
	ReactRegExpExtractElementInfo<E>;
export type ReactRegExpExtractElementModifier<E extends keyof React.JSX.IntrinsicElements | React.JSXElementConstructor<any> = React.JSXElementConstructor<any>> =
	<E2 extends (IsJSXElementConstructorAny<E> extends 1 ? keyof React.JSX.IntrinsicElements | React.JSXElementConstructor<any> : E)>
	(modifier: (Component: ReactRegExpExtractElementClone<E2>) => React.ReactNode) => React.ReactNode;
export type ReactRegExpExtractElement<E extends keyof React.JSX.IntrinsicElements | React.JSXElementConstructor<any> = React.JSXElementConstructor<any>> =
	ReactRegExpExtractElementModifier<E> &
	ReactRegExpExtractElementInfo<E>;
export interface ReactRegExpExtractArray extends Array<ReactRegExpExtractElement> {
	matches?: Record<string, ReactRegExpExtractElement>;
	groups?: Record<string, ReactRegExpExtractElement | undefined>;
}

const componentCloneSymbol = Symbol.for("ReactRegExpExtractComponentClone");
function overrideCreateElement() {
	// This is really messy. We want a clean JSX syntax rather than using object-like creation.
	// But JSX internally call `React.createElement` which is in internal DOM tree. But, the underlying
	// components is masked with `componentClone`. We need to bypass this by modifying (temporarily)
	// `React.createElement` then after it's done we revert it back to the original one.
	const reverts = [] as (() => void)[];
	const originalCreateElement = React.createElement;
	React.createElement = (function(type: any, props: any, ...children: any[]) {
		if(type[componentCloneSymbol] != true)
			return originalCreateElement.call(this, type, props, ...children);
		const type0 = type as ReactRegExpExtractElementClone;
		const propsCopy = { ...props };
		if(children.length > 1) {
			const childrenCopy = [...children];
			Object.freeze(childrenCopy);
			propsCopy.children = childrenCopy;
		} else
			propsCopy.children = children[0];
		return type0(propsCopy);
	}) as any;
	reverts.push(() => { React.createElement = originalCreateElement; });

	{
		const originalJsx = ReactJSXRuntime.jsx;
		const originalJsxs = ReactJSXRuntime.jsxs;
		ReactJSXRuntime.jsx = (function(type: any, props: any, key: any) {
			if(type[componentCloneSymbol] != true)
				return originalJsx.call(this, type, props, key);
			const type0 = type as ReactRegExpExtractElementClone;
			const propsCopy = { ...props };
			return type0(propsCopy);
		}) as any;
		ReactJSXRuntime.jsxs = (function(type: any, props: any, key: any) {
			if(type[componentCloneSymbol] != true)
				return originalJsxs.call(this, type, props, key);
			const type0 = type as ReactRegExpExtractElementClone;
			const propsCopy = { ...props };
			return type0(propsCopy);
		}) as any;
		reverts.push(() => {
			ReactJSXRuntime.jsx = originalJsx;
			ReactJSXRuntime.jsxs = originalJsxs;
		});
	}

	if(process.env.NODE_ENV == "development") {
		const originalJsxDev = ReactJSXDevRuntime.jsxDEV;
		ReactJSXDevRuntime.jsxDEV = (function(type: any, props: any, key: any, isStaticChildren: any, source: any, self: any) {
			if(type[componentCloneSymbol] != true)
				return originalJsxDev.call(this, type, props, key, isStaticChildren, source, self);
			const type0 = type as ReactRegExpExtractElementClone;
			const propsCopy = { ...props };
			return type0(propsCopy);
		}) as any;
		reverts.push(() => {
			ReactJSXDevRuntime.jsxDEV = originalJsxDev;
		});
	}
	return () => {
		for(const revert of reverts.reverse())
			revert();
	};
}
function makeModifierFunction(componentClone: ReactRegExpExtractElementClone): ReactRegExpExtractElement {
	const modifierFunction = (modifier => {
		const revertOverrideCreateElement = overrideCreateElement();
		try {
			return modifier(componentClone as any);
		} finally {
			revertOverrideCreateElement();
		}
	}) as ReactRegExpExtractElement;
	modifierFunction.node = componentClone.node;
	modifierFunction.props = componentClone.props;
	if(componentClone.children != null) {
		modifierFunction.children = componentClone.children;
		for(let i = 0; i < componentClone.children.length; i++)
			modifierFunction[`c${i}`] = componentClone.children[i];
	}
	return modifierFunction;
}

export default function reactRegexExtract(matcher: ReactRegExpExecArray): ReactRegExpExtractArray {
	const makeExtractMatcher = (node: React.ReactNode, path: string) => {
		const nodeType = typeof node;
		if(node == null || nodeType == "string" || nodeType == "number" || nodeType == "boolean" || nodeType == "undefined") {
			const componentClone = ((addedProps: any) => {
				if(addedProps != null && Object.keys(addedProps).length > 0)
					throw new Error("Node is a primitive object, passing properties is not supported");
				return node;
			}) as ReactRegExpExtractElementClone;
			componentClone.node = node;
			componentClone.props = null;
			(componentClone as any)[componentCloneSymbol] = true;
			return makeModifierFunction(componentClone);
		}
		const iterator = node[Symbol.iterator]?.() as Iterator<React.ReactNode>;
		if(iterator != null) {
			const componentClone = ((addedProps: any) => {
				if(addedProps != null && Object.keys(addedProps).length > 0)
					throw new Error("Node is a primitive object, passing properties is not supported");
				return node;
			}) as ReactRegExpExtractElementClone;
			componentClone.node = node;
			componentClone.props = null;
			const childrenMatchers = [] as ReactRegExpExtractElement[];
			let i = 0;
			let iteratorResult: IteratorResult<React.ReactNode>;
			while((iteratorResult = iterator.next()).done != true)
				childrenMatchers.push(makeExtractMatcher(iteratorResult.value, `${path}.${i++}`));
			if(iteratorResult.value != null)
				childrenMatchers.push(makeExtractMatcher(iteratorResult.value, `${path}.${i++}`));
			componentClone.children = childrenMatchers;
			for(let i = 0; i < childrenMatchers.length; i++)
				componentClone[`c${i}`] = childrenMatchers[i];
			(componentClone as any)[componentCloneSymbol] = true;
			return makeModifierFunction(componentClone);
		}
		if(ReactIs.isElement(node)) {
			const propsCopy = { ...(node.props as any) };
			const componentClone = ((addedProps: any) => {
				const children = addedProps.children ?? propsCopy.children ?? [];
				const mergedProps = { key: path, ...propsCopy, ...addedProps };
				delete mergedProps.children;
				return React.cloneElement(node, mergedProps, ...(Array.isArray(children) ? children : [children]));
			}) as ReactRegExpExtractElementClone;
			componentClone.node = node;
			componentClone.props = propsCopy;
			let children: React.ReactNode | null = null;
			if(ReactIs.isFragment(node))
				children = propsCopy.children;
			if(ReactIs.isPortal(node))
				children = (node as React.ReactPortal).children;
			children ??= propsCopy.children;
			if(children != null) {
				const childrenMatchers = [] as ReactRegExpExtractElement[];
				const childrenIterator = children[Symbol.iterator]?.() as Iterator<React.ReactNode>;
				if(childrenIterator != null) {
					let i = 0;
					let iteratorResult: IteratorResult<React.ReactNode>;
					while((iteratorResult = childrenIterator.next()).done != true)
						childrenMatchers.push(makeExtractMatcher(iteratorResult.value, `${path}.${i++}`));
					if(iteratorResult.value != null)
						childrenMatchers.push(makeExtractMatcher(iteratorResult.value, `${path}.${i++}`));
				} else
					childrenMatchers.push(makeExtractMatcher(children, `${path}.${0}`));
				componentClone.children = childrenMatchers;
				for(let i = 0; i < childrenMatchers.length; i++)
					componentClone[`c${i}`] = childrenMatchers[i];
			}
			(componentClone as any)[componentCloneSymbol] = true;
			return makeModifierFunction(componentClone);
		}
		throw new Error("Unknown react regex node");
	};
	const extractMatcher = matcher.map((m, i) => makeExtractMatcher(m, `ROOT.${i}`)) as ReactRegExpExtractArray;
	extractMatcher.matches = Object.fromEntries(matcher.map((_0, i) => [`c${i}`, extractMatcher[i]]));
	if(matcher.groups != null) {
		extractMatcher.groups = Object.fromEntries(
			Object.entries(matcher.groups).map(([k, v]) => {
				if(v == undefined) return [k, undefined];
				const index = matcher.indexOf(v);
				return [k, extractMatcher[index]];
			})
		);
	}
	return extractMatcher;
}
