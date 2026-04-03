"use client";

import React, { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import cn from "@/utils/cn";

export default function Entry({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(() => new QueryClient());

	useEffect(() => {
		const elementStyle = cn(
			"not-print:clip-path-[polygon(0%_0%,100%_0%,100%_100%,0%_100%)]",
			"not-print:[filter:var(--selection-computed-filter,)_blur(2px)]"
		);
		const elementOverlayStyle = cn(
			"absolute z-1",
			"brightness-[120%] saturate-[80%]",
			"bg-[Highlight] text-[HighlightText] opacity-35",
			"select-none pointer-events-none",
			"print:hidden"
		);
		const collectAllChildren = (node: Node, accumulate: Node[]) => {
			accumulate.push(node);
			for(const child of node.childNodes)
				collectAllChildren(child, accumulate);
		};
		const findOffsetParent = (element: Element) => {
			let currentElement = element;
			while(!(currentElement instanceof HTMLElement))
				currentElement = currentElement.parentElement!;
			if(currentElement == element)
				return currentElement.offsetParent!;
			const computedStyle = getComputedStyle(currentElement);
			if(computedStyle.position != "static")
				return currentElement;
			for(const childElement of currentElement.children) {
				if(childElement == element) continue;
				if(!(childElement instanceof HTMLElement)) continue;
				return childElement.offsetParent!;
			}
			const mockupElement = document.createElement("div");
			currentElement.appendChild(mockupElement);
			const offsetParent = mockupElement.offsetParent!;
			currentElement.removeChild(mockupElement);
			return offsetParent;
		};
		const createSelectionInline = (element: HTMLElement) => {
			const mutationObserver = new MutationObserver(e => {
				if(!e.some(r => [...r.removedNodes].includes(element))) return;
				cleanup();
			});
			mutationObserver.observe(element.parentElement!, { childList: true });
			const computedStyle = getComputedStyle(element);
			if(computedStyle.filter != "none")
				element.style.setProperty("--selection-computed-filter", computedStyle.filter);
			element.classList.add(...elementStyle.split(" "));
			element.setAttribute("selected", "");
			const cleanup = () => {
				mutationObserver.disconnect();
				element.removeAttribute("selected");
				element.classList.remove(...elementStyle.split(" "));
				element.style.removeProperty("--selection-computed-filter");
			};
			return cleanup;
		};
		const createSelectionOverlay = (element: HTMLElement | SVGElement) => {
			const selectOverlay = document.createElement("div");
			selectOverlay.classList.add(...elementOverlayStyle.split(" "));
			const resizeObserver = new ResizeObserver(() => {
				if(element instanceof HTMLElement) {
					selectOverlay.style.top = `${element.offsetTop}px`;
					selectOverlay.style.left = `${element.offsetLeft}px`;
					selectOverlay.style.width = `${element.offsetWidth}px`;
					selectOverlay.style.height = `${element.offsetHeight}px`;
					return;
				}
				const offsetParent = findOffsetParent(element);
				if(offsetParent == null) return;
				const parentBound = offsetParent.getBoundingClientRect();
				const bound = element.getBoundingClientRect();
				selectOverlay.style.top = `${bound.top - parentBound.top}px`;
				selectOverlay.style.left = `${bound.left - parentBound.left}px`;
				selectOverlay.style.width = `${bound.width}px`;
				selectOverlay.style.height = `${bound.height}px`;
			});
			resizeObserver.observe(element);
			const mutationObserver = new MutationObserver(e => {
				if(!e.some(r => [...r.removedNodes].includes(element))) return;
				cleanup();
			});
			mutationObserver.observe(element.parentElement!, { childList: true });
			element.parentElement!.insertBefore(selectOverlay, element);
			const computedStyle = getComputedStyle(element);
			element.style.setProperty("--selection-computed-filter", computedStyle.filter != "none" ? computedStyle.filter : "");
			element.classList.add(...elementStyle.split(" "));
			element.setAttribute("selected", "");
			const cleanup = () => {
				resizeObserver.disconnect();
				mutationObserver.disconnect();
				element.parentElement!.removeChild(selectOverlay);
				element.removeAttribute("selected");
				element.classList.remove(...elementStyle.split(" "));
				element.style.removeProperty("--selection-computed-filter");
			};
			return cleanup;
		};
		const reverts = [] as (() => void)[];
		const updateSelection = (selection: Selection, selections: Node[]) => {
			reverts.splice(0).forEach(r => r());
			reverts.push(...selections
				.filter((e): e is HTMLImageElement => e instanceof HTMLImageElement)
				.filter(e => selection.containsNode(e, false))
				.filter(e => getComputedStyle(e).userSelect != "none")
				.map(e => createSelectionInline(e)));
			reverts.push(...selections
				.filter((e): e is HTMLIFrameElement => e instanceof HTMLIFrameElement)
				.filter(e => selection.containsNode(e, false))
				.filter(e => getComputedStyle(e).userSelect != "none")
				.map(e => createSelectionInline(e)));
			reverts.push(...selections
				.filter((e): e is HTMLVideoElement => e instanceof HTMLVideoElement)
				.filter(e => selection.containsNode(e, false))
				.filter(e => getComputedStyle(e).userSelect != "none")
				.map(e => createSelectionOverlay(e)));
			reverts.push(...selections
				.filter((e): e is SVGSVGElement => e instanceof SVGSVGElement)
				.filter(e => selection.containsNode(e, false))
				.filter(e => getComputedStyle(e).userSelect != "none")
				.map(e => createSelectionOverlay(e)));
		};
		const update = () => {
			const selection = window.getSelection();
			if(selection == null) {
				reverts.splice(0).forEach(r => r());
				return;
			}
			if(selection.rangeCount == 0) {
				updateSelection(selection, []);
				window.removeEventListener("resize", scheduleUpdate);
				return;
			}
			const childNodes = [];
			collectAllChildren(selection.getRangeAt(0).commonAncestorContainer, childNodes);
			const selections = childNodes.filter(n => selection.containsNode(n, true));
			updateSelection(selection, selections);
			window.addEventListener("resize", scheduleUpdate);
		};
		let scheduleHandle: TimerHandle | null = null;
		const scheduleUpdate = () => {
			if(scheduleHandle != null)
				clearTimeout(scheduleHandle);
			scheduleHandle = setTimeout(() => {
				update();
				scheduleHandle = null;
			}, 5) as any;
		};
		scheduleUpdate();
		document.addEventListener("selectionchange", scheduleUpdate);
		return () => {
			document.removeEventListener("selectionchange", scheduleUpdate);
			window.removeEventListener("resize", scheduleUpdate);
			reverts.splice(0).forEach(r => r());
		};
	}, []);

	return (
		<QueryClientProvider client={queryClient}>
			{children}
		</QueryClientProvider>
	);
}
