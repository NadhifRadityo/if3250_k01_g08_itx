"use client";

import React, { useMemo, useLayoutEffect } from "react";
import ReactIs from "react-is";
import dedent from "dedent-js";

import cn from "@/utils/cn";
import useSplitRef from "@/utils/useSplitRef";

export type CommentElement = HTMLTemplateElement & { commentNode?: Comment | null };
export type Props = Omit<React.HTMLProps<HTMLElement>, "ref"> & {
	multiline?: boolean;
	ref?: React.Ref<CommentElement>;
};
export default function Comment({
	multiline = false,
	className,
	children,
	ref,
	...props
}: Props) {
	const elementRef = useSplitRef<CommentElement>(null, ref);

	const contentString = useMemo(() => {
		function getComment(node: React.ReactNode, separator: string) {
			const nodeType = typeof node;
			if(node == null || nodeType == "undefined")
				return null;
			if(nodeType == "string" || nodeType == "number" || nodeType == "boolean")
				return node.toString();
			const iterator = node[Symbol.iterator]?.() as Iterator<React.ReactNode>;
			if(iterator != null) {
				const result = [] as string[];
				let iteratorResult: IteratorResult<React.ReactNode>;
				while((iteratorResult = iterator.next()).done != true) {
					const childComment = getComment(iteratorResult.value, separator);
					if(childComment == null) continue;
					result.push(childComment);
				}
				if(result.length == 0)
					return null;
				return result.join(separator);
			}
			if(ReactIs.isElement(node)) {
				if(ReactIs.isFragment(node))
					return getComment((node.props as React.FragmentProps).children, separator);
				if(ReactIs.isPortal(node))
					return getComment((node as React.ReactPortal).children, separator);
			}
			return null;
		}
		if(!multiline) return ` ${getComment(children, "") ?? ""} `;
		return `\n${dedent(getComment(children, "\n") ?? "")}\n`;
	}, [children, multiline]);
	useLayoutEffect(() => {
		const currentElement = elementRef.current!;
		const document = currentElement.ownerDocument;
		const parentElement = currentElement.parentElement!;
		const commentElement = document.createComment("");
		parentElement.insertBefore(commentElement, currentElement);
		parentElement.removeChild(currentElement);
		currentElement.commentNode = commentElement;
		return () => {
			currentElement.commentNode = null;
			parentElement.insertBefore(currentElement, commentElement);
			parentElement.removeChild(commentElement);
		};
	}, []);
	useLayoutEffect(() => {
		const currentElement = elementRef.current!;
		const commentElement = currentElement.commentNode;
		if(commentElement == null) return;
		commentElement.data = contentString;
	}, [contentString]);

	return (
		<template
			{...props}
			ref={elementRef}
			hidden
			aria-hidden
			className={cn("hidden", className)}
			dangerouslySetInnerHTML={{ __html: `<!--${contentString}-->` }}
		/>
	);
}
