"use client";

import React, { useRef, useMemo, useState, useEffect, useContext, useCallback, createContext, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2Icon, CircleAlertIcon } from "lucide-react";

import cn from "@/utils/cn";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Drawer, DrawerTitle, DrawerFooter, DrawerHeader, DrawerContent, DrawerDescription } from "@/components/radix/Drawer";

import { useDashboardShellContext } from "./layout.components";
import { RelationSummary, getRelationSummaryAction } from "./relation-navigation.actions";

type PendingRelationRedirectData = {
	relationType: string;
	relationSource?: string;
} & (
	{ relationId: string, relationIds?: never } |
	{ relationId?: never, relationIds: string[] }
);

declare global {
	interface Window {
		__dashboardPendingRelationRedirect?: PendingRelationRedirectData;
	}
}

function setPendingRelationNavigationRedirectData(value: PendingRelationRedirectData) {
	if(typeof window == "undefined")
		return;
	window.__dashboardPendingRelationRedirect = value;
}

export function consumePendingRelationNavigationRedirectData(relationType: string) {
	if(typeof window == "undefined")
		return null;
	const pending = window.__dashboardPendingRelationRedirect;
	if(pending == null || pending.relationType != relationType)
		return null;
	window.setTimeout(() => {
		if(window.__dashboardPendingRelationRedirect != pending)
			return;
		window.__dashboardPendingRelationRedirect = undefined;
	}, 100);
	return {
		relationId: pending.relationId,
		relationIds: pending.relationIds,
		relationSource: pending.relationSource
	};
}

type RelationFallback = { title: React.ReactNode, description?: React.ReactNode, fields?: { label: React.ReactNode, value: React.ReactNode }[] };
function useRelationNavigationSummary() {
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [pickerDrawerOpen, setPickerDrawerOpen] = useState(false);
	const [relationType, setRelationType] = useState(null as string | null);
	const [pickerTitle, setPickerTitle] = useState(null as React.ReactNode);
	const [pickerDescription, setPickerDescription] = useState(null as React.ReactNode);
	const [pickerChoices, setPickerChoices] = useState(null as { id: string, name: React.ReactNode, description?: React.ReactNode, fallback: RelationFallback }[] | null);
	const [pickedId, setPickedId] = useState(null as string | null);
	const [pickedFallback, setPickedFallback] = useState(null as RelationFallback | null);
	const [summary, setSummary] = useState(null as RelationSummary | null);
	const [error, setError] = useState(null as any);
	const [isLoading, startTransition] = useTransition();

	const openDrawer = useCallback((
		{ relationType, relationId, fallback }:
		{ relationType: string, relationId: string, fallback: RelationFallback }
	) => {
		setDrawerOpen(true);
		setPickerDrawerOpen(false);
		setRelationType(relationType);
		setPickerTitle(null);
		setPickerDescription(null);
		setPickerChoices(null);
		setPickedId(relationId);
		setPickedFallback(fallback);
	}, []);
	const openPickerDrawer = useCallback((
		{ relationType, pickerTitle, pickerDescription, relationChoices }:
		{ relationType: string, pickerTitle: React.ReactNode, pickerDescription?: React.ReactNode, relationChoices: { id: string, name: React.ReactNode, description?: React.ReactNode, fallback: RelationFallback }[] }
	) => {
		setDrawerOpen(false);
		setPickerDrawerOpen(true);
		setRelationType(relationType);
		setPickerTitle(pickerTitle);
		setPickerDescription(pickerDescription ?? null);
		setPickerChoices(relationChoices);
		setPickedId(null);
		setPickedFallback(null);
	}, []);
	useEffect(() => {
		if(relationType == null || pickedId == null || pickedFallback == null)
			return;
		startTransition(async () => {
			setDrawerOpen(true);
			try {
				const summary = await getRelationSummaryAction({ relationType, relationId: pickedId });
				if(summary == null)
					throw new Error(`Cannot find relation ${JSON.stringify(relationType)} with id ${JSON.stringify(pickedId)}`);
				setSummary(summary);
			} catch(error) {
				setError(error);
			}
		});
	}, [relationType, pickedId, pickedFallback]);
	const closeDrawer = useCallback(() => {
		setDrawerOpen(false);
		setPickerDrawerOpen(false);
	}, []);

	const drawer = (
		<Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-lg">
				<DrawerHeader>
					<DrawerTitle>{summary?.title ?? pickedFallback?.title}</DrawerTitle>
					<DrawerDescription>{summary?.description ?? pickedFallback?.description}</DrawerDescription>
				</DrawerHeader>
				<div className="space-y-3 px-4 pb-4">
					{isLoading ? (
						<div className="text-muted-foreground flex items-center gap-2 text-sm">
							<Loader2Icon className="size-4 animate-spin" />
							Loading details...
						</div>
					) : null}
					{error != null ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>{`${error?.name ?? "Error"}`}</AlertTitle>
							<AlertDescription>{`${error?.message ?? error}`}</AlertDescription>
						</Alert>
					) : null}
					{summary != null ? (
						<div className="space-y-2">
							{(summary?.fields ?? pickedFallback?.fields)?.map((field, i) => (
								<div key={i} className="grid gap-1 rounded-md border px-3 py-2">
									<p className="text-muted-foreground text-xs font-medium">
										{field.label}
									</p>
									<p className="wrap-break-word">
										{field.value}
									</p>
								</div>
							))}
						</div>
					) : null}
				</div>
			</DrawerContent>
		</Drawer>
	);
	const pickerDrawer = (
		<Drawer open={pickerDrawerOpen} onOpenChange={setPickerDrawerOpen} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-lg">
				<DrawerHeader>
					<DrawerTitle>{pickerTitle}</DrawerTitle>
					<DrawerDescription>{pickerDescription}</DrawerDescription>
				</DrawerHeader>
				<div className="space-y-2 px-4 pb-4">
					{pickerChoices?.map(pickerChoice => (
						<Button
							key={pickerChoice.id}
							type="button"
							variant="outline"
							className="h-auto w-full whitespace-normal px-3 py-2 text-left"
							onClick={() => {
								setPickedId(pickerChoice.id);
								setPickedFallback(pickerChoice.fallback);
							}}
						>
							<span className="grid w-full gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3">
								<span className="max-h-11 overflow-hidden text-sm leading-snug wrap-break-word sm:max-h-none">
									{pickerChoice.name}
								</span>
								<span className="text-muted-foreground block font-mono text-xs wrap-break-word sm:text-right">
									{pickerChoice.description}
								</span>
							</span>
						</Button>
					))}
				</div>
				<DrawerFooter className="border-t">
					<Button type="button" variant="outline" onClick={() => closeDrawer}>Cancel</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);

	return {
		openDrawer,
		openPickerDrawer,
		closeDrawer,
		drawer,
		pickerDrawer
	};
}
function useRelationNavigationRedirect() {
	const router = useRouter();
	const { menus } = useDashboardShellContext();
	const menusRef = useRef(menus);
	menusRef.current = menus;
	const getRedirectMenuLink = useCallback((redirectData: PendingRelationRedirectData) => {
		const searchParams = new URLSearchParams();
		searchParams.set("relationFilters", JSON.stringify(redirectData.relationId != null ?
			[{ column: "id", operator: "equals", value: redirectData.relationId }] :
			[{ column: "id", operator: "in", value: redirectData.relationIds }]
		));
		if(redirectData.relationSource != null)
			searchParams.set("relationSource", redirectData.relationSource);
		const menu = menusRef.current.find(menu => menu.key == redirectData.relationType)!;
		return `${menu.modes[menu.defaultMode].href}?${searchParams.toString()}`;
	}, []);
	const redirectMenu = useCallback((redirectData: PendingRelationRedirectData) => {
		setPendingRelationNavigationRedirectData(redirectData);
		router.push(getRedirectMenuLink(redirectData));
	}, []);
	const hasAccessToRelationMenu = useCallback((relationType: string) => {
		return menusRef.current.some(menu => menu.key == relationType);
	}, []);
	return {
		getRedirectMenuLink,
		redirectMenu,
		hasAccessToRelationMenu
	};
}
const RelationNavigationContext = createContext<
	(
		Pick<ReturnType<typeof useRelationNavigationSummary>, "openDrawer" | "openPickerDrawer" | "closeDrawer"> &
		Pick<ReturnType<typeof useRelationNavigationRedirect>, "getRedirectMenuLink" | "redirectMenu" | "hasAccessToRelationMenu">
	) | null
>(null);
export function RelationNavigationProvider({ children }: { children: React.ReactNode }) {
	const summaryStates = useRelationNavigationSummary();
	const redirectStates = useRelationNavigationRedirect();
	const value = useMemo(() => ({
		openDrawer: summaryStates.openDrawer,
		openPickerDrawer: summaryStates.openPickerDrawer,
		closeDrawer: summaryStates.closeDrawer,
		getRedirectMenuLink: redirectStates.getRedirectMenuLink,
		redirectMenu: redirectStates.redirectMenu,
		hasAccessToRelationMenu: redirectStates.hasAccessToRelationMenu
	}), [summaryStates, redirectStates]);
	return (
		<RelationNavigationContext.Provider value={value}>
			{children}
			{summaryStates.drawer}
			{summaryStates.pickerDrawer}
		</RelationNavigationContext.Provider>
	);
}
export function useRelationNavigation() {
	return useContext(RelationNavigationContext)!;
}
export function RelationNavigationLink(
	{ relationType, relationSource, relationId, fallback, pickerTitle, pickerDescription, relationChoices, className, children, ...props }:
		{ relationType: string, relationSource?: string, children: React.ReactNode } & React.ComponentProps<typeof Link | typeof Button> &
		(
			{ relationId: string, fallback: RelationFallback, pickerTitle?: never, pickerDescription?: never, relationChoices?: never } |
			{ relationId?: never, fallback?: never, pickerTitle: string, pickerDescription?: string, relationChoices: { id: string, name: string, description?: string, fallback: RelationFallback }[] }
		)
) {
	const relationNavigation = useRelationNavigation();
	if(!relationNavigation.hasAccessToRelationMenu(relationType)) {
		return (
			<Button
				{...(props as any)}
				type="button"
				variant="link"
				onClick={() => {
					if(relationId != null) {
						relationNavigation.openDrawer({ relationType, relationId, fallback });
						return;
					}
					relationNavigation.openPickerDrawer({ relationType, pickerTitle, pickerDescription, relationChoices });
				}}
				className="h-auto p-0 text-primary select-auto"
			>
				{children}
			</Button>
		);
	}
	const redirectMenuLink = relationNavigation.getRedirectMenuLink(
		relationId != null ? { relationType, relationSource, relationId } :
			{ relationType, relationSource, relationIds: relationChoices.map(r => r.id) }
	);
	<Link
		{...(props as any)}
		href={redirectMenuLink}
		onClick={event => {
			event.preventDefault();
			if(!event.altKey) {
				relationNavigation.redirectMenu(
					relationId != null ? { relationType, relationSource, relationId } :
						{ relationType, relationSource, relationIds: relationChoices.map(r => r.id) }
				);
			}
			if(relationId != null) {
				relationNavigation.openDrawer({ relationType, relationId, fallback });
				return;
			}
			relationNavigation.openPickerDrawer({ relationType, pickerTitle, pickerDescription, relationChoices });
			return;
		}}
		className={cn("text-primary underline underline-offset-2 hover:opacity-80", className)}
	>
		{children}
	</Link>;
}
