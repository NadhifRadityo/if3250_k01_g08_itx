"use client";

import { useState, useCallback, useTransition, type MouseEvent } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2Icon, CircleAlertIcon } from "lucide-react";

import cn from "@/utils/cn";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Drawer, DrawerTitle, DrawerFooter, DrawerHeader, DrawerContent, DrawerDescription } from "@/components/radix/Drawer";

import * as dashboardActions from "./layout.actions";

export type EntrySummaryRequest = {
	type: dashboardActions.DashboardEntrySummaryType;
	id: string;
	fallbackTitle: string;
	fallbackDescription?: string;
	fallbackMeta?: Array<{ label: string, value: string }>;
};

export type RelationSummaryPickerChoice = {
	id: string;
	title: string;
	description: string;
	meta: Array<{ label: string, value: string }>;
};

export type RelationSummaryPickerState = {
	cellKey: string;
	sectionLabel: string;
	choices: RelationSummaryPickerChoice[];
};

export type UserRelationSummaryRequest = {
	type: "user";
	id: string;
	fallbackTitle: string;
	fallbackDescription?: string;
	fallbackMeta?: Array<{ label: string, value: string }>;
};

type PendingRelationFilterNavigation = {
	targetManagementKey: dashboardActions.DashboardManagementKey;
	relationFiltersJson: string;
	relationContext?: string;
};

declare global {
	interface Window {
		__dashboardPendingRelationFilterNavigation?: PendingRelationFilterNavigation;
	}
}

function setPendingRelationFilterNavigation(value: PendingRelationFilterNavigation) {
	if(typeof window == "undefined")
		return;
	window.__dashboardPendingRelationFilterNavigation = value;
}

export function consumePendingRelationFilterNavigation(targetManagementKey: dashboardActions.DashboardManagementKey): {
	relationFiltersJson: string;
	relationContext?: string;
} | null {
	if(typeof window == "undefined")
		return null;
	const pending = window.__dashboardPendingRelationFilterNavigation;
	if(pending == null || pending.targetManagementKey != targetManagementKey)
		return null;
	window.setTimeout(() => {
		if(window.__dashboardPendingRelationFilterNavigation != pending)
			return;
		window.__dashboardPendingRelationFilterNavigation = undefined;
	}, 100);
	return {
		relationFiltersJson: pending.relationFiltersJson,
		relationContext: pending.relationContext
	};
}

type UseEntrySummaryDrawerResult = {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	isLoading: boolean;
	errorMessage: string | null;
	summary: dashboardActions.DashboardEntrySummary | null;
	openSummary: (request: EntrySummaryRequest) => void;
};

export function useEntrySummaryDrawer(): UseEntrySummaryDrawerResult {
	const [isOpen, setIsOpen] = useState(false);
	const [summary, setSummary] = useState<dashboardActions.DashboardEntrySummary | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isLoading, startTransition] = useTransition();

	const openSummary = (request: EntrySummaryRequest) => {
		setIsOpen(true);
		setErrorMessage(null);
		setSummary({
			type: request.type,
			id: request.id,
			title: request.fallbackTitle,
			description: request.fallbackDescription ?? "Loading entry details...",
			meta: request.fallbackMeta ?? []
		});

		startTransition(() => {
			void (async () => {
				try {
					const resolved = await dashboardActions.getDashboardEntrySummaryAction({
						type: request.type,
						id: request.id
					});
					if(resolved == null) {
						setErrorMessage("Unable to load full entry details.");
						return;
					}
					setSummary(resolved);
				} catch(error) {
					setErrorMessage(error instanceof Error ? error.message : "Unable to load full entry details.");
				}
			})();
		});
	};

	return {
		isOpen,
		onOpenChange: setIsOpen,
		isLoading,
		errorMessage,
		summary,
		openSummary
	};
}

export function EntrySummaryDrawer({
	isOpen,
	onOpenChange,
	isLoading,
	errorMessage,
	summary
}: {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	isLoading: boolean;
	errorMessage: string | null;
	summary: dashboardActions.DashboardEntrySummary | null;
}) {
	const metaItems = summary == null ? [] : [
		{ label: "ID", value: summary.id },
		{ label: "Name", value: summary.title },
		...summary.meta
	];

	const getMetaValueClassName = (label: string) => {
		if(label == "ID")
			return "text-xs font-mono";
		if(label == "Name")
			return "text-sm font-medium";
		return "text-sm";
	};

	return (
		<Drawer open={isOpen} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-lg">
				<DrawerHeader>
					<DrawerTitle>{summary?.title ?? "Entry details"}</DrawerTitle>
					<DrawerDescription>{summary?.description ?? "Summary unavailable."}</DrawerDescription>
				</DrawerHeader>
				<div className="space-y-3 px-4 pb-4">
					{isLoading ? (
						<div className="text-muted-foreground flex items-center gap-2 text-sm">
							<Loader2Icon className="size-4 animate-spin" />
							Loading details...
						</div>
					) : null}

					{errorMessage != null ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>Error</AlertTitle>
							<AlertDescription>{errorMessage}</AlertDescription>
						</Alert>
					) : null}

					{summary != null ? (
						<div className="space-y-2">
							{metaItems.map(item => (
								<div key={`${item.label}-${item.value}`} className="grid gap-1 rounded-md border px-3 py-2">
									<p className="text-muted-foreground text-xs font-medium">{item.label}</p>
									<p className={cn(getMetaValueClassName(item.label), "wrap-break-word")}>{item.value}</p>
								</div>
							))}
						</div>
					) : null}
				</div>
			</DrawerContent>
		</Drawer>
	);
}

export function RelationSummaryPickerDrawer({
	isOpen,
	onOpenChange,
	picker,
	onOpenSummary
}: {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	picker: RelationSummaryPickerState | null;
	onOpenSummary: (request: UserRelationSummaryRequest) => void;
}) {
	return (
		<Drawer open={isOpen} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-lg">
				{picker != null ? (
					<>
						<DrawerHeader>
							<DrawerTitle>Select user relation</DrawerTitle>
							<DrawerDescription>Choose which {picker.sectionLabel.toLowerCase()} user detail to open.</DrawerDescription>
						</DrawerHeader>
						<div className="space-y-2 px-4 pb-4">
							{picker.choices.map(choice => (
								<Button
									key={`${choice.id}-${choice.title}`}
									type="button"
									variant="outline"
									className="h-auto w-full whitespace-normal px-3 py-2 text-left"
									onClick={() => {
										onOpenSummary({
											type: "user",
											id: choice.id,
											fallbackTitle: choice.title,
											fallbackDescription: choice.description,
											fallbackMeta: choice.meta
										});
									}}
								>
									<span className="grid w-full gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3">
										<span className="max-h-11 overflow-hidden text-sm leading-snug wrap-break-word sm:max-h-none">{choice.title}</span>
										<span className="text-muted-foreground block font-mono text-xs wrap-break-word sm:text-right">{choice.id}</span>
									</span>
								</Button>
							))}
						</div>
						<DrawerFooter className="border-t">
							<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
						</DrawerFooter>
					</>
				) : null}
			</DrawerContent>
		</Drawer>
	);
}

export function useDashboardRelationNavigation() {
	const router = useRouter();
	const pathname = usePathname();
	const targetsQuery = useQuery({
		queryKey: ["dashboard", "viewer-editor-targets"],
		queryFn: dashboardActions.getDashboardViewerEditorTargetsAction,
		staleTime: 60000,
		gcTime: 120000
	});

	const entrySummary = useEntrySummaryDrawer();
	const getTargetHrefBase = useCallback((key: dashboardActions.DashboardManagementKey) => {
		return targetsQuery.data?.[key]?.preferredHref ?? null;
	}, [targetsQuery.data]);

	const getImportTargetHrefBase = useCallback((key: dashboardActions.DashboardManagementKey) => {
		return targetsQuery.data?.[key]?.importPreferredHref ?? null;
	}, [targetsQuery.data]);

	const onRelationLinkClick = useCallback((
		event: MouseEvent<HTMLAnchorElement>,
		request: {
			targetManagementKey: dashboardActions.DashboardManagementKey;
			hrefBase: string;
			relationFilters: unknown;
			relationContext?: string;
		}
	) => {
		if(event.defaultPrevented)
			return;
		if(event.button != 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
			return;
		if(pathname == request.hrefBase)
			return;

		event.preventDefault();
		setPendingRelationFilterNavigation({
			targetManagementKey: request.targetManagementKey,
			relationFiltersJson: JSON.stringify(request.relationFilters),
			relationContext: request.relationContext
		});
		router.push(request.hrefBase);
	}, [pathname, router]);

	return {
		getTargetHrefBase,
		getImportTargetHrefBase,
		onRelationLinkClick,
		openSummary: entrySummary.openSummary,
		summaryDrawerProps: {
			isOpen: entrySummary.isOpen,
			onOpenChange: entrySummary.onOpenChange,
			isLoading: entrySummary.isLoading,
			errorMessage: entrySummary.errorMessage,
			summary: entrySummary.summary
		}
	};
}
