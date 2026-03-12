import React from "react";
import * as ReactIs from "react-is";

import regexReplace from "./regexReplace";

export type FlagProps = {
	propsMatch?: "exact" | "includes" | "ignore";
	primitiveMatch?: "exact" | "sametype" | "ignore";
} & { children?: React.ReactNode };
export type AnchorProps = { kind: "start" | "end" };
export type GroupProps = {
	kind?: "capture" | "non-capture" | "named";
	id?: string;
} & { children?: React.ReactNode };
export type AnyProps = {} & { children?: React.ReactNode };
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type AlternateProps = {};
export type CountProps = { kind?: "greedy" | "lazy", min: number, max: number };
export type LookProps = {
	kind: "ahead" | "behind";
	polarity: "positive" | "negative";
} & { children?: React.ReactNode };
export type BackReferenceProps = { reference: string | number };

export type FlagToken = React.FunctionComponent<FlagProps>;
export type AnchorToken = React.FunctionComponent<AnchorProps>;
export type GroupToken = React.FunctionComponent<GroupProps>;
export type AnyToken = React.FunctionComponent<AnyProps>;
export type AlternateToken = React.FunctionComponent<AlternateProps>;
export type CountToken = React.FunctionComponent<CountProps>;
export type LookToken = React.FunctionComponent<LookProps>;
export type BackReferenceToken = React.FunctionComponent<BackReferenceProps>;

interface ReactRegExpExecAdditionalInfo {
	node: React.ReactNode;
	parent: React.ReactNode;
	childId: number;
	patternStart?: number;
	patternFragment?: string;
}
export interface ReactRegExpExecArray extends Array<React.ReactNode | React.ReactNode[]> {
	index: number;
	input: React.ReactNode;
	0: React.ReactNode | React.ReactNode[];
	groups?: Record<string, React.ReactNode | undefined>;
	additionalInfo: (ReactRegExpExecAdditionalInfo | ReactRegExpExecAdditionalInfo[] | null)[];
}

interface BracketGroup {
	type: "bracket";
	id: string;
}
interface UserGroup {
	type: "user";
	id: string;
	routine: React.ReactNode;
	uid: number;
	name?: string;
}

export default class ReactRegExp {
	protected static FlagToken: FlagToken;
	protected static AnchorToken: AnchorToken;
	protected static GroupToken: GroupToken;
	protected static AnyToken: AnyToken;
	protected static AlternateToken: AlternateToken;
	protected static CountToken: CountToken;
	protected static LookToken: LookToken;
	protected static BackReferenceToken: BackReferenceToken;

	static {
		const tokenGenerator = <P>(name: string, tag: string) => {
			const token = (props: P) =>
				React.createElement(tag, props as any, (props as P & { children?: React.ReactNode }).children);
			token.displayName = name;
			return token;
		};
		ReactRegExp.FlagToken = tokenGenerator<FlagProps>("FlagComponent", "flag");
		ReactRegExp.AnchorToken = tokenGenerator<AnchorProps>("AnchorComponent", "anchor");
		ReactRegExp.GroupToken = tokenGenerator<GroupProps>("GroupComponent", "group");
		ReactRegExp.AnyToken = tokenGenerator<AnyProps>("AnyComponent", "any");
		ReactRegExp.AlternateToken = tokenGenerator<AlternateProps>("AlternateComponent", "alternate");
		ReactRegExp.CountToken = tokenGenerator<CountProps>("CountComponent", "count");
		ReactRegExp.LookToken = tokenGenerator<LookProps>("LookComponent", "look");
		ReactRegExp.BackReferenceToken = tokenGenerator<BackReferenceProps>("BackReferenceComponent", "backreference");
	}

	protected knownReactTypes: Map<string | React.JSXElementConstructor<any>, number> = new Map();
	protected knownReactPropKeys: Map<string, number> = new Map();
	protected knownReactPropValues: Map<any, number> = new Map();
	protected groupIds: (BracketGroup | UserGroup)[] = [];

	protected compiledPattern: string;
	protected compiledRegex: RegExp;
	public lastIndex: number;

	constructor(
		pattern: (tokens: {
			Flag: FlagToken;
			Anchor: AnchorToken;
			Group: GroupToken;
			Any: AnyToken;
			Alternate: AlternateToken;
			Count: CountToken;
			Look: LookToken;
			BackReference: BackReferenceToken;
		}) => React.ReactNode
	) {
		const rawTokens = pattern({
			Flag: ReactRegExp.FlagToken,
			Anchor: ReactRegExp.AnchorToken,
			Group: ReactRegExp.GroupToken,
			Any: ReactRegExp.AnyToken,
			Alternate: ReactRegExp.AlternateToken,
			Count: ReactRegExp.CountToken,
			Look: ReactRegExp.LookToken,
			BackReference: ReactRegExp.BackReferenceToken
		});
		const flags = {
			propsMatch: "includes",
			primitiveMatch: "sametype"
		} as Required<FlagProps>;

		let userGroupId = 0;
		const backReferenceSuspense = [] as (string | number)[];
		const newGroupId = (type: "bracket" | "user", routine: React.ReactNode = null, name?: string) => {
			const id = `_${this.groupIds.length + 1}`;
			if(type == "bracket")
				this.groupIds.push({ type: "bracket", id });
			if(type == "user")
				this.groupIds.push({ type: "user", id, routine, uid: userGroupId++, name });
			return id;
		};
		const parseRawToken = (node: React.ReactNode): string => {
			const nodeType = typeof node;
			if(node == null || nodeType == "string" || nodeType == "number" || nodeType == "boolean" || nodeType == "undefined") {
				const typeSymbol = "PRIMITIVE_" + (node == null ? "null" : nodeType);
				let typeId = this.knownReactTypes.get(typeSymbol);
				if(typeId == null) {
					typeId = this.knownReactTypes.size + 1;
					this.knownReactTypes.set(typeSymbol, typeId);
				}
				const bracketId = newGroupId("bracket");
				if(flags.primitiveMatch == "exact") {
					let propValueId = this.knownReactPropValues.get(node);
					if(propValueId == null) {
						propValueId = this.knownReactPropValues.size + 1;
						this.knownReactPropValues.set(node, propValueId);
					}
					return `\\[${typeId},(?<${bracketId}>\\d+),${propValueId}\\]\\[\\/\\k<${bracketId}>\\]`;
				}
				if(flags.primitiveMatch == "sametype")
					return `\\[${typeId},(?<${bracketId}>\\d+),\\d+\\]\\[\\/\\k<${bracketId}>\\]`;
				if(flags.primitiveMatch == "ignore")
					return `\\[\\d+,(?<${bracketId}>\\d+),\\d+\\]\\[\\/\\k<${bracketId}>\\]`;
				return "";
			}
			const iterator = node[Symbol.iterator]?.() as Iterator<React.ReactNode>;
			if(iterator != null) {
				const result = [] as string[];
				let iteratorResult: IteratorResult<React.ReactNode>;
				while((iteratorResult = iterator.next()).done != true)
					result.push(parseRawToken(iteratorResult.value));
				if(iteratorResult.value != null)
					result.push(parseRawToken(iteratorResult.value));
				return result.join("");
			}
			if(ReactIs.isElement(node)) {
				if(ReactIs.isFragment(node))
					return parseRawToken((node.props as React.FragmentProps).children);
				if(ReactIs.isPortal(node))
					return parseRawToken((node as React.ReactPortal).children);
				node = node as React.ReactElement;
				switch(node.type) {
					case ReactRegExp.FlagToken: {
						const { children, ...props } = node.props as FlagProps;
						const original = { ...flags };
						Object.assign(flags, props);
						const result = `${parseRawToken(children)}`;
						for(const key in flags) delete flags[key];
						Object.assign(flags, original);
						return result;
					}
					case ReactRegExp.AnchorToken: {
						const { kind } = node.props as AnchorProps;
						if(kind == "start") return "^";
						if(kind == "end") return "$";
						return "";
					}
					case ReactRegExp.GroupToken: {
						const { kind = "capture", id, children } = node.props as GroupProps;
						if(kind == "capture") {
							const groupdId = newGroupId("user", children);
							return `(?<${groupdId}>${parseRawToken(children)})`;
						}
						if(kind == "non-capture")
							return `(?:${parseRawToken(children)})`;
						if(kind == "named") {
							const groupdId = newGroupId("user", children, id);
							return `(?<${groupdId}>${parseRawToken(children)})`;
						}
						return "";
					}
					case ReactRegExp.AlternateToken: {
						const {} = node.props as AlternateProps;
						return "|";
					}
					case ReactRegExp.CountToken: {
						const { kind = "greedy", min, max } = node.props as CountProps;
						if(kind == "greedy") {
							if(min == 0 && !isFinite(max)) return "*";
							if(min == 1 && !isFinite(max)) return "+";
							if(min == 0 && max == 1) return "?";
							if(min == max) return `{${min}}`;
							return `{${min},${max}}`;
						}
						if(kind == "lazy") {
							if(min == 0 && !isFinite(max)) return "*?";
							if(min == 1 && !isFinite(max)) return "+?";
							if(min == 0 && max == 1) return "??";
							if(min == max) return `{${min}}?`;
							return `{${min},${max}}?`;
						}
						return "";
					}
					case ReactRegExp.LookToken: {
						const { kind, polarity, children } = node.props as LookProps;
						if(kind == "ahead" && polarity == "positive")
							return `(?=${parseRawToken(children)})`;
						if(kind == "ahead" && polarity == "negative")
							return `(?!${parseRawToken(children)})`;
						if(kind == "behind" && polarity == "positive")
							return `(?<=${parseRawToken(children)})`;
						if(kind == "behind" && polarity == "negative")
							return `(?<!${parseRawToken(children)})`;
						return "";
					}
					// Suspense back reference, because it may be defined later
					case ReactRegExp.BackReferenceToken: {
						const { reference } = node.props as BackReferenceProps;
						const suspenseIndex = backReferenceSuspense.push(reference) - 1;
						return `<BR-${suspenseIndex}>`;
					}
					default: {
						let type = node.type;
						if(ReactIs.isLazy(node)) {
							const payload = (node as any).type._payload;
							if(Array.isArray(payload.value)) {
								let syncType = null;
								payload.then(t => syncType = t);
								if(syncType == null)
									throw payload;
								type = syncType;
							} else
								type = payload.value;
						}
						const { children, ...props } = node.props as any;
						let typeRegex: string | number;
						let childrenRegex: string;
						if(type == ReactRegExp.AnyToken) {
							typeRegex = "\\d+";
							if(children == null)
								childrenRegex = "(?:\\[\\/\\d+\\]|\\[\\d+,\\d+,[\\d=,]*?\\])*?";
							else
								childrenRegex = parseRawToken(children);
						} else {
							let typeId = this.knownReactTypes.get(type);
							if(typeId == null) {
								typeId = this.knownReactTypes.size + 1;
								this.knownReactTypes.set(type, typeId);
							}
							typeRegex = typeId;
							childrenRegex = parseRawToken(children);
						}
						let propsRegex: string;
						if(flags.propsMatch == "exact") {
							propsRegex = Object.entries(props)
								.sort(([k1], [k2]) => k1.localeCompare(k2))
								.map(([k, v]) => {
									let propKeyId = this.knownReactPropKeys.get(k);
									if(propKeyId == null) {
										propKeyId = this.knownReactPropKeys.size + 1;
										this.knownReactPropKeys.set(k, propKeyId);
									}
									let propValueId = this.knownReactPropValues.get(v);
									if(propValueId == null) {
										propValueId = this.knownReactPropValues.size + 1;
										this.knownReactPropValues.set(v, propValueId);
									}
									return `${propKeyId}=${propValueId}`;
								})
								.join(",");
						}
						if(flags.propsMatch == "includes") {
							if(Object.entries(props).length > 0) {
								propsRegex = "(?:\\d+=\\d+,)*" + Object.entries(props)
									.sort(([k1], [k2]) => k1.localeCompare(k2))
									.map(([k, v]) => {
										let propKeyId = this.knownReactPropKeys.get(k);
										if(propKeyId == null) {
											propKeyId = this.knownReactPropKeys.size + 1;
											this.knownReactPropKeys.set(k, propKeyId);
										}
										let propValueId = this.knownReactPropValues.get(k);
										if(propValueId == null) {
											propValueId = this.knownReactPropValues.size + 1;
											this.knownReactPropValues.set(v, propValueId);
										}
										return `${propKeyId}=${propValueId}`;
									})
									.join("(?:,(?:\\d+=\\d+,)*)") + "(?:,(?:\\d+=\\d+,)*(?:\\d+=\\d+))?";
							} else {
								// Type `Any` may contain primitive value
								if(type == ReactRegExp.AnyToken)
									propsRegex = "[\\d=,]*?";
								else
									propsRegex = "(?:(?:\\d+=\\d+,)*(?:\\d+=\\d+))?";
							}
						}
						if(flags.propsMatch == "ignore")
							propsRegex = "(?:(?:\\d+=\\d+,)*(?:\\d+=\\d+))?";
						const bracketId = newGroupId("bracket");
						return `(?:\\[${typeRegex},(?<${bracketId}>\\d+),${propsRegex!}\\]${childrenRegex}\\[\\/\\k<${bracketId}>\\])`;
					}
				}
			}
			return "";
		};
		let fixParsedToken = (() => {
			const rootGroupdId = newGroupId("user", rawTokens);
			return `(?<${rootGroupdId}>${parseRawToken(rawTokens)})`;
		})();
		fixParsedToken = regexReplace(/<BR-(\d+)>/g, fixParsedToken, matcher => {
			const suspenseIndex = parseInt(matcher[1], 10);
			const reference = backReferenceSuspense[suspenseIndex];
			let group: UserGroup | undefined;
			if(typeof reference == "number")
				group = this.groupIds.find((v): v is UserGroup => v.type == "user" && v.uid == reference);
			if(typeof reference == "string")
				group = this.groupIds.find((v): v is UserGroup => v.type == "user" && v.name == reference);
			if(group == null)
				throw new Error(`Back reference with name '${reference}' is not defined`);
			if(group.uid == 0)
				throw new Error("Back reference root group is not allowed");
			// Back reference acts like subroutine, it does not make sense
			// to natively support back reference because everything is unique.
			// Currently, subroutine does not resolve back reference recursively.
			const parsedSubroutine = parseRawToken(group.routine);
			const recursiveBackReference = [...parsedSubroutine.matchAll(/<BR-(\d+)>/g)]
				.map(v => backReferenceSuspense[parseInt(v[1], 10)]);
			if(recursiveBackReference.length == 0) return parsedSubroutine;
			throw new Error(`Recursive back reference detected in group '${reference}': ${recursiveBackReference.join(", ")}`);
		});

		this.compiledPattern = fixParsedToken;
		this.compiledRegex = new RegExp(fixParsedToken, "g");
		this.lastIndex = 0;
	}

	protected compileNodes(nodes: React.ReactNode) {
		let compiledNodesString = "";
		const elementInfos = [] as ReactRegExpExecAdditionalInfo[];

		const parseNode = (node: React.ReactNode, parent: React.ReactNode, childId: number): void => {
			const nodeType = typeof node;
			if(node == null || nodeType == "string" || nodeType == "number" || nodeType == "boolean" || nodeType == "undefined") {
				const typeSymbol = "PRIMITIVE_" + (node == null ? "null" : nodeType);
				const typeId = this.knownReactTypes.get(typeSymbol) ?? 0;
				const propValueId = this.knownReactPropValues.get(node) ?? 0;
				const elementInfo = { node, parent, childId } as ReactRegExpExecAdditionalInfo;
				const elementId = elementInfos.push(elementInfo);
				elementInfo.patternStart = compiledNodesString.length;
				compiledNodesString += `[${typeId},${elementId},${propValueId}][/${elementId}]`;
				elementInfo.patternFragment = compiledNodesString.slice(elementInfo.patternStart);
				return;
			}
			const iterator = node[Symbol.iterator]?.() as Iterator<React.ReactNode>;
			if(iterator != null) {
				let childIndex = 0;
				let iteratorResult: IteratorResult<React.ReactNode>;
				while((iteratorResult = iterator.next()).done != true)
					parseNode(iteratorResult.value, node, childIndex++);
				if(iteratorResult.value != null)
					parseNode(iteratorResult.value, node, childIndex++);
				return;
			}
			if(ReactIs.isElement(node)) {
				if(ReactIs.isFragment(node)) {
					parseNode((node.props as React.FragmentProps).children, node, 0);
					return;
				}
				if(ReactIs.isPortal(node)) {
					parseNode((node as React.ReactPortal).children, node, 0);
					return;
				}
				node = node as React.ReactElement;
				let type = node.type;
				if(ReactIs.isLazy(node)) {
					const payload = (node as any).type._payload;
					if(Array.isArray(payload.value)) {
						let syncType = null;
						payload.then(t => syncType = t);
						if(syncType == null)
							throw payload;
						type = syncType;
					} else
						type = payload.value;
				}
				const { children, ...props } = node.props as any;
				const typeId = this.knownReactTypes.get(type) ?? 0;
				const propsId = Object.entries(props)
					.sort(([k1], [k2]) => k1.localeCompare(k2))
					.map(([k, v]) => {
						const propKeyId = this.knownReactPropKeys.get(k) ?? 0;
						const propValueId = this.knownReactPropValues.get(v) ?? 0;
						return `${propKeyId}=${propValueId}`;
					})
					.join(",");
				const elementInfo = { node, parent, childId } as ReactRegExpExecAdditionalInfo;
				const elementId = elementInfos.push(elementInfo);
				elementInfo.patternStart = compiledNodesString.length;
				compiledNodesString += `[${typeId},${elementId},${propsId}]`;
				parseNode(children, node, 0);
				compiledNodesString += `[/${elementId}]`;
				elementInfo.patternFragment = compiledNodesString.slice(elementInfo.patternStart);
			}
		};
		parseNode(nodes, null, 0);
		return {
			knownReactElements: elementInfos,
			compiledNodes: compiledNodesString
		};
	}

	exec(nodes: React.ReactNode) {
		const { knownReactElements, compiledNodes } = this.compileNodes(nodes);
		if(this.lastIndex == knownReactElements.length) this.lastIndex = 0;
		this.compiledRegex.lastIndex = knownReactElements[this.lastIndex]?.patternStart ?? 0;
		const matcher = this.compiledRegex.exec(compiledNodes);
		if(matcher == null) { this.lastIndex = knownReactElements.length; return null; }
		const nextNodesString = compiledNodes.slice(matcher.index + matcher[0].length);
		let lastIndex = parseInt(nextNodesString.match(/\[\d+,(\d+),[\d=,]*?\]/)?.[1] ?? null as any, 10) - 1;
		if(isNaN(lastIndex)) lastIndex = knownReactElements.length;
		this.lastIndex = lastIndex;

		const findGroupResult = (userGroup: UserGroup) => {
			const group = matcher.groups![userGroup.id];
			if(group == null) return null;
			const groupResult = [] as ReactRegExpExecAdditionalInfo[];
			const groupRegex = /\[\d+,(\d+),[\d=,]*?\](?:\[\/\d+\]|\[\d+,\d+,[\d=,]*?\])*\[\/\1\]/g;
			let groupMatcher: RegExpExecArray | null;
			while((groupMatcher = groupRegex.exec(group)) != null) {
				const index = parseInt(groupMatcher[1], 10) - 1;
				groupResult.push(knownReactElements[index]);
			}
			return groupResult;
		};
		// Index 0 can be null. Suppose we match zero or more group
		// without any anchor and additional clue, it will match with
		// empty groups. Which is, in plain regex would be empty string.
		// But in this case, we don't have any representation of non-null
		// "empty" placeholder in ReactNode object. Thus, we use null.
		// E.g. in plain regex: "abc".match(/(z)*/)
		let matcherIndex = parseInt(matcher[0].match(/\[\d+,(\d+),[\d=,]*?\]/)?.[1] ?? null as any, 10) - 1;
		if(isNaN(matcherIndex)) matcherIndex = -1;
		const additionalInfo = this.groupIds.filter((v): v is UserGroup => v.type == "user").map(v => findGroupResult(v));
		const reactMatcher = additionalInfo.map(v => (v != null ? v.map(r => r.node) : null)) as ReactRegExpExecArray;
		const groupEntries = this.groupIds.filter((v): v is UserGroup => v.type == "user")
			.filter(v => v.name != null).map(v => [v.name, reactMatcher[v.uid]]);
		reactMatcher.index = matcherIndex;
		reactMatcher.input = nodes;
		reactMatcher.groups = groupEntries.length > 0 ? Object.fromEntries(groupEntries) : null;
		reactMatcher.additionalInfo = additionalInfo;
		return reactMatcher;
	}
	test(nodes: React.ReactNode) {
		const { compiledNodes } = this.compileNodes(nodes);
		return this.compiledRegex.test(compiledNodes);
	}
}
