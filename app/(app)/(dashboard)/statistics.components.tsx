"use client";

import { useId, useMemo, useRef, useState, useEffect, useLayoutEffect, useCallback, useContext, createContext, Children, isValidElement, type ReactNode, type ReactElement, type MouseEvent as ReactMouseEvent } from "react";
import * as d3 from "d3";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon, EyeOffIcon, GripVerticalIcon, PlusIcon, RefreshCwIcon } from "lucide-react";

import cn from "@/utils/cn";
import { type rwsa } from "@/utils/actions";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/radix/Card";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/radix/DropdownMenu";
import { Skeleton } from "@/components/radix/Skeleton";

import { useConfigStorage, type MenuFilterState } from "./layout.components";
import { changeRequestTypeSelectOptions } from "./layout.shared";
import { getCommonReviewableViewerStats, getCommonReviewableApproverStats, getCommonLogMonitoringStats, getCommonLogReportingStats } from "./statistics.actions";
import type {
	StatNumberData,
	StatBucketData,
	StatHistogramData,
	StatSeriesData,
	StatHeatmapData,
	StatReviewStatusData,
	StatPendingReviewData,
	StatsLayoutConfig,
	StatsLayoutCardConfig
} from "./statistics.shared";

// Local type derivations from the wsa-wrapped action shapes. The actions live in
// `./statistics.actions` and their return types are inferred from their implementations.
type CommonReviewableViewerStats = rwsa<typeof getCommonReviewableViewerStats>;
type CommonReviewableApproverStats = rwsa<typeof getCommonReviewableApproverStats>;
type CommonLogMonitoringStats = rwsa<typeof getCommonLogMonitoringStats>;
type CommonLogReportingStats = rwsa<typeof getCommonLogReportingStats>;

// === Layout context =============================================================================

const SPAN_CLASSES: Record<number, string> = {
	1: "sm:col-span-1 xl:col-span-1",
	2: "sm:col-span-2 xl:col-span-2",
	3: "sm:col-span-2 xl:col-span-3",
	4: "sm:col-span-2 xl:col-span-4"
};
const SPAN_LABELS: Record<number, string> = {
	1: "Small",
	2: "Medium",
	3: "Large",
	4: "Full"
};

type StatsLayoutContextValue = {
	getCardConfig: (key: string) => StatsLayoutCardConfig;
	setCardConfig: (key: string, next: Partial<StatsLayoutCardConfig>) => void;
	registerCard: (key: string, title: string, defaultSpan: 1 | 2 | 3 | 4, defaultHidden?: boolean) => void;
	hideCard: (key: string) => void;
	showCard: (key: string) => void;
	knownCards: { key: string, title: string }[];
	dragKey: string | null;
	setDragKey: (k: string | null) => void;
	moveCard: (sourceKey: string, targetKey: string, side: "before" | "after") => void;
	dropTarget: { key: string, side: "before" | "after" } | null;
	setDropTarget: (next: { key: string, side: "before" | "after" } | null) => void;
	resizingKey: string | null;
	setResizingKey: (k: string | null) => void;
	gridRef: React.RefObject<HTMLDivElement | null>;
};
const StatsLayoutContext = createContext<StatsLayoutContextValue | null>(null);

function useStatsLayout(): StatsLayoutContextValue {
	const ctx = useContext(StatsLayoutContext);
	if(ctx == null)
		throw new Error("useStatsLayout must be used inside <StatisticsSection>");
	return ctx;
}

// === Section ====================================================================================

// Reads the persisted layout config (same storage as <StatisticsSection>) and returns the list
// of card keys that should be visible. Cards without a stored config fall back to their
// `defaultHidden` value. The returned list is what menu components pass to their
// `getXxxStatisticsAction` so the server only computes statistics for cards that will render.
export function useStatisticsVisibleKeys(
	{ layoutKey, cards }:
	{ layoutKey: string, cards: readonly { key: string, defaultHidden?: boolean }[] }
): string[] {
	const [layout] = useConfigStorage<StatsLayoutConfig>({
		localStorageKey: `statistics.${layoutKey}.layout`,
		defaultValue: { order: [], cards: {} }
	});
	return cards.filter(c => {
		const config = layout.cards[c.key];
		return config != null ? !config.hidden : !(c.defaultHidden ?? false);
	}).map(c => c.key);
}

export function StatisticsSection(
	{ title = "Statistics", description, layoutKey = "default", children, onRefresh }:
	{
		title?: string;
		description?: string;
		layoutKey?: string;
		children: ReactNode;
		onRefresh?: () => void;
	}
) {
	const [layout, setLayout] = useConfigStorage<StatsLayoutConfig>({
		localStorageKey: `statistics.${layoutKey}.layout`,
		defaultValue: { order: [], cards: {} }
	});
	const [knownCards, setKnownCards] = useState<{ key: string, title: string }[]>([]);
	const [dragKey, setDragKey] = useState<string | null>(null);
	const [dropTarget, setDropTarget] = useState<{ key: string, side: "before" | "after" } | null>(null);
	const [resizingKey, setResizingKey] = useState<string | null>(null);
	const gridRef = useRef<HTMLDivElement | null>(null);

	const getCardConfig = useCallback((key: string): StatsLayoutCardConfig => {
		return layout.cards[key] ?? { key };
	}, [layout]);
	const setCardConfig = useCallback((key: string, next: Partial<StatsLayoutCardConfig>) => {
		setLayout(prev => ({
			...prev,
			cards: { ...prev.cards, [key]: { ...prev.cards[key], key, ...next } }
		}));
	}, [setLayout]);
	const registerCard = useCallback((key: string, title: string, defaultSpan: 1 | 2 | 3 | 4, defaultHidden = false) => {
		setLayout(prev => {
			const orderHas = prev.order.includes(key);
			const cardHas = prev.cards[key] != null;
			if(orderHas && cardHas) return prev;
			return {
				order: orderHas ? prev.order : [...prev.order, key],
				cards: cardHas ? prev.cards : { ...prev.cards, [key]: { key, span: defaultSpan, hidden: defaultHidden } }
			};
		});
		setKnownCards(prev => prev.some(c => c.key == key) ? prev : [...prev, { key, title }]);
	}, [setLayout]);
	const hideCard = useCallback((key: string) => {
		setLayout(prev => ({ ...prev, cards: { ...prev.cards, [key]: { ...(prev.cards[key] ?? { key }), key, hidden: true } } }));
	}, [setLayout]);
	const showCard = useCallback((key: string) => {
		setLayout(prev => ({ ...prev, cards: { ...prev.cards, [key]: { ...(prev.cards[key] ?? { key }), key, hidden: false } } }));
	}, [setLayout]);
	const moveCard = useCallback((sourceKey: string, targetKey: string, side: "before" | "after") => {
		setLayout(prev => {
			const order = [...prev.order];
			const sourceIndex = order.indexOf(sourceKey);
			if(sourceIndex == -1) return prev;
			order.splice(sourceIndex, 1);
			let targetIndex = order.indexOf(targetKey);
			if(targetIndex == -1) {
				order.splice(sourceIndex, 0, sourceKey);
				return prev;
			}
			if(side == "after") targetIndex += 1;
			order.splice(targetIndex, 0, sourceKey);
			return { ...prev, order: order };
		});
	}, [setLayout]);

	const ctxValue = useMemo<StatsLayoutContextValue>(() => ({
		getCardConfig: getCardConfig,
		setCardConfig: setCardConfig,
		registerCard: registerCard,
		hideCard: hideCard,
		showCard: showCard,
		knownCards: knownCards,
		dragKey: dragKey,
		setDragKey: setDragKey,
		moveCard: moveCard,
		dropTarget: dropTarget,
		setDropTarget: setDropTarget,
		resizingKey: resizingKey,
		setResizingKey: setResizingKey,
		gridRef: gridRef
	}), [getCardConfig, setCardConfig, registerCard, hideCard, showCard, knownCards, dragKey, moveCard, dropTarget, resizingKey]);

	const hiddenCards = knownCards.filter(c => layout.cards[c.key]?.hidden == true);

	// Render children in the order tracked by `layout.order` (without using CSS `order`,
	// so DOM order matches visual order for accessibility and keyboard navigation).
	const orderedChildren = useMemo(() => {
		const arr = Children.toArray(children).filter(isValidElement) as ReactElement<{ cardKey?: string, title?: string }>[];
		const byKey = new Map<string, ReactElement>();
		const unkeyed: ReactElement[] = [];
		const deriveKey = (title?: string) => title != null ? title.toLowerCase().replace(/\W+/g, "-").replace(/^-+|-+$/g, "") : null;
		for(const child of arr) {
			const key = child.props.cardKey ?? deriveKey(child.props.title);
			if(key != null && key.length > 0)
				byKey.set(key, child);
			else
				unkeyed.push(child);
		}
		const ordered: ReactElement[] = [];
		for(const k of layout.order) {
			const c = byKey.get(k);
			if(c != null) {
				ordered.push(c);
				byKey.delete(k);
			}
		}
		// Unregistered or freshly mounted cards go at the end (they will register and add themselves to order).
		return [...ordered, ...byKey.values(), ...unkeyed];
	}, [children, layout.order]);

	return (
		<StatsLayoutContext.Provider value={ctxValue}>
			<section className="space-y-3">
				<div className="flex flex-wrap items-center gap-2">
					<div className="flex-1 space-y-1 min-w-0">
						<h2 className="text-base font-semibold font-sans flex items-center gap-2">
							{title}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button type="button" size="icon" variant="ghost" className="size-6" disabled={hiddenCards.length == 0} title="Add hidden statistics">
										<PlusIcon className="size-3.5" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start">
									<DropdownMenuLabel>Hidden statistics</DropdownMenuLabel>
									<DropdownMenuSeparator />
									{hiddenCards.length == 0 ? (
										<DropdownMenuItem disabled>No hidden cards</DropdownMenuItem>
									) : hiddenCards.map(c => (
										<DropdownMenuItem key={c.key} onSelect={() => showCard(c.key)}>{c.title}</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</h2>
						{description != null ? <p className="text-muted-foreground text-xs">{description}</p> : null}
					</div>
					{onRefresh != null ? (
						<Button type="button" size="icon" variant="ghost" onClick={onRefresh} title="Refresh">
							<RefreshCwIcon className="size-4" />
						</Button>
					) : null}
				</div>
				<div
					ref={gridRef}
					data-resizing={resizingKey != null ? "true" : "false"}
					className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 auto-rows-min"
					onDragEnd={() => { setDragKey(null); setDropTarget(null); }}
				>
					{orderedChildren}
				</div>
			</section>
		</StatsLayoutContext.Provider>
	);
}

// === Card =======================================================================================

export function StatisticsCard(
	{ cardKey, title, description, defaultSpan = 1, defaultHidden = false, span, skeleton = false, children }:
	{
		cardKey?: string;
		title: string;
		description?: string;
		defaultSpan?: 1 | 2 | 3 | 4;
		defaultHidden?: boolean;
		span?: 1 | 2 | 3 | 4;
		skeleton?: boolean;
		children: ReactNode;
	}
) {
	const layout = useStatsLayout();
	const effectiveCardKey = cardKey ?? title.toLowerCase().replace(/\W+/g, "-").replace(/^-+|-+$/g, "");
	const effectiveDefaultSpan = span ?? defaultSpan;
	useEffect(() => {
		layout.registerCard(effectiveCardKey, title, effectiveDefaultSpan, defaultHidden);
	}, [effectiveCardKey, title, effectiveDefaultSpan, defaultHidden, layout]);
	const config = layout.getCardConfig(effectiveCardKey);
	const cardSpan = config.span ?? effectiveDefaultSpan;
	const wrapperRef = useRef<HTMLDivElement | null>(null);

	// Track number of currently-open dropdowns so the card stays "active" (showing
	// hover-only controls) while a menu is being interacted with.
	const [openDropdowns, setOpenDropdowns] = useState(0);
	const cardActive = openDropdowns > 0;
	const onDropdownOpenChange = useCallback((open: boolean) => {
		setOpenDropdowns(c => Math.max(0, c + (open ? 1 : -1)));
	}, []);

	// Resize preview state: while dragging the resize handle we render a ghost
	// at the proposed size and only commit the new span on mouse-up.
	const [resizePreview, setResizePreview] = useState<{ span: 1 | 2 | 3 | 4, width: number, height: number } | null>(null);
	const flipFromRef = useRef<{ width: number, height: number } | null>(null);

	// FLIP animation: when `cardSpan` changes, animate the wrapper from its
	// previously-recorded size to the new one. `flipFromRef` is set right before
	// the state change that causes the new span to take effect.
	useLayoutEffect(() => {
		const from = flipFromRef.current;
		const wrapper = wrapperRef.current;
		flipFromRef.current = null;
		if(from == null || wrapper == null) return;
		const newRect = wrapper.getBoundingClientRect();
		if(Math.abs(from.width - newRect.width) < 1 && Math.abs(from.height - newRect.height) < 1) return;
		wrapper.animate(
			[
				{ width: `${from.width}px`, height: `${from.height}px` },
				{ width: `${newRect.width}px`, height: `${newRect.height}px` }
			],
			{ duration: 220, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }
		);
	}, [cardSpan]);

	const captureFlipFromCurrent = useCallback(() => {
		const wrapper = wrapperRef.current;
		if(wrapper == null) return;
		const rect = wrapper.getBoundingClientRect();
		flipFromRef.current = { width: rect.width, height: rect.height };
	}, []);

	if(config.hidden == true)
		return null;

	const onCardDragStart = (e: React.DragEvent<HTMLDivElement>) => {
		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("text/plain", effectiveCardKey);
		layout.setDragKey(effectiveCardKey);
	};
	const onCardDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		if(layout.dragKey == null) return;
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
		if(layout.dragKey == effectiveCardKey) return;
		const rect = e.currentTarget.getBoundingClientRect();
		const side: "before" | "after" = (e.clientX - rect.left) < rect.width / 2 ? "before" : "after";
		const current = layout.dropTarget;
		if(current?.key != effectiveCardKey || current?.side != side)
			layout.setDropTarget({ key: effectiveCardKey, side: side });
	};
	const onCardDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		const related = e.relatedTarget as Node | null;
		if(related != null && e.currentTarget.contains(related)) return;
		if(layout.dropTarget?.key == effectiveCardKey)
			layout.setDropTarget(null);
	};
	const onCardDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		const sourceKey = e.dataTransfer.getData("text/plain");
		const target = layout.dropTarget;
		if(sourceKey != "" && sourceKey != effectiveCardKey && target != null)
			layout.moveCard(sourceKey, target.key, target.side);
		layout.setDragKey(null);
		layout.setDropTarget(null);
	};
	const onCardDragEnd = () => {
		layout.setDragKey(null);
		layout.setDropTarget(null);
	};

	const onResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		const grid = layout.gridRef.current;
		const wrapper = wrapperRef.current;
		if(grid == null || wrapper == null) return;
		const startX = e.clientX;
		const wrapperRect = wrapper.getBoundingClientRect();
		const gridRect = grid.getBoundingClientRect();
		const gridStyle = window.getComputedStyle(grid);
		const cols = Math.max(1, gridStyle.gridTemplateColumns.split(" ").length);
		const parsedGap = parseFloat(gridStyle.columnGap);
		const colGap = Number.isFinite(parsedGap) ? parsedGap : 0;
		const colWidth = (gridRect.width - (cols - 1) * colGap) / cols;
		const startSpan = cardSpan;
		const startWidth = wrapperRect.width;
		const startHeight = wrapperRect.height;
		const maxSpan = Math.min(4, cols) as 1 | 2 | 3 | 4;
		let lastSpan: 1 | 2 | 3 | 4 = startSpan;
		setResizePreview({ span: startSpan, width: startWidth, height: startHeight });
		layout.setResizingKey(effectiveCardKey);
		const onMove = (ev: MouseEvent) => {
			const dx = ev.clientX - startX;
			const targetWidth = Math.max(colWidth, startWidth + dx);
			const targetSpan = Math.max(1, Math.min(maxSpan, Math.round(targetWidth / (colWidth + colGap)))) as 1 | 2 | 3 | 4;
			const ghostWidth = targetSpan * colWidth + (targetSpan - 1) * colGap;
			lastSpan = targetSpan;
			setResizePreview({ span: targetSpan, width: ghostWidth, height: startHeight });
		};
		const onUp = () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
			setResizePreview(null);
			layout.setResizingKey(null);
			if(lastSpan != startSpan) {
				flipFromRef.current = { width: startWidth, height: startHeight };
				layout.setCardConfig(effectiveCardKey, { span: lastSpan });
			}
		};
		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
	};

	const onSelectSpan = (s: 1 | 2 | 3 | 4) => {
		if(s == cardSpan) return;
		captureFlipFromCurrent();
		layout.setCardConfig(effectiveCardKey, { span: s });
	};

	const isDragging = layout.dragKey == effectiveCardKey;
	const isResizing = layout.resizingKey == effectiveCardKey;
	const isLockedByOtherResize = layout.resizingKey != null && !isResizing;
	const showBeforeIndicator = layout.dropTarget?.key == effectiveCardKey && layout.dropTarget.side == "before" && !isDragging;
	const showAfterIndicator = layout.dropTarget?.key == effectiveCardKey && layout.dropTarget.side == "after" && !isDragging;

	const resizeHandle = (
		<div
			className={cn(
				"cursor-ew-resize flex items-center justify-center w-3 h-10 rounded-full border shadow-sm transition-colors",
				isResizing ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary hover:bg-primary hover:text-primary-foreground"
			)}
			onMouseDown={onResizeStart}
			title="Drag to resize"
			role="separator"
			aria-orientation="vertical"
		>
			<GripVerticalIcon className="size-3" />
		</div>
	);

	return (
		<div
			ref={wrapperRef}
			data-active={cardActive ? "true" : "false"}
			className={cn(
				"group/stat-card relative",
				SPAN_CLASSES[cardSpan],
				isDragging ? "opacity-40" : "",
				// During resize, both the resizing card and all others are non-interactive — the
				// resize itself is driven by window-level listeners so this is purely a UX guard.
				isResizing ? "pointer-events-none" : "",
				isLockedByOtherResize ? "pointer-events-none opacity-60" : ""
			)}
			aria-hidden={isLockedByOtherResize ? true : undefined}
			onDragOver={onCardDragOver}
			onDragLeave={onCardDragLeave}
			onDrop={onCardDrop}
		>
			{/* Drop indicators rendered in the grid gap on either side of the card. */}
			{showBeforeIndicator ? (
				<div className="absolute left-[-7.5px] top-0 bottom-0 w-1 bg-primary rounded-full z-20 pointer-events-none shadow-[0_0_8px_var(--primary)]" aria-hidden />
			) : null}
			{showAfterIndicator ? (
				<div className="absolute right-[-7.5px] top-0 bottom-0 w-1 bg-primary rounded-full z-20 pointer-events-none shadow-[0_0_8px_var(--primary)]" aria-hidden />
			) : null}

			<Card size="sm" className="h-full">
				<CardHeader>
					<div className="flex items-start gap-2">
						<div className="flex-1 min-w-0">
							<CardTitle className="text-sm flex items-center gap-1.5">
								<span
									draggable
									onDragStart={onCardDragStart}
									onDragEnd={onCardDragEnd}
									className="cursor-grab active:cursor-grabbing -ml-0.5 px-0.5 py-0.5 rounded opacity-30 group-hover/stat-card:opacity-100 group-data-[active=true]/stat-card:opacity-100 transition-opacity"
									title="Drag to reorder"
								>
									<GripVerticalIcon className="size-3.5 text-muted-foreground" />
								</span>
								<span className="truncate">{title}</span>
							</CardTitle>
							{description != null ? <CardDescription className="text-xs">{description}</CardDescription> : null}
						</div>
						<div className="flex items-center gap-0.5 opacity-0 group-hover/stat-card:opacity-100 group-data-[active=true]/stat-card:opacity-100 transition-opacity">
							<DropdownMenu onOpenChange={onDropdownOpenChange}>
								<DropdownMenuTrigger asChild>
									<Button type="button" size="icon" variant="ghost" className="size-6" title={`Size: ${SPAN_LABELS[cardSpan]}`}>
										<span className="text-[10px] font-mono">{SPAN_LABELS[cardSpan].slice(0, 1)}</span>
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									{[1, 2, 3, 4].map(s => (
										<DropdownMenuItem key={s} onSelect={() => onSelectSpan(s as 1 | 2 | 3 | 4)}>
											{SPAN_LABELS[s]}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
							<Button
								type="button"
								size="icon"
								variant="ghost"
								className="size-6"
								title="Hide"
								onClick={() => layout.hideCard(effectiveCardKey)}
							>
								<EyeOffIcon className="size-3.5" />
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent className="flex-1">
					{skeleton ? <Skeleton className="h-20 w-full" /> : children}
				</CardContent>
			</Card>

			{/* Resize handle on the card edge (only when not currently resizing — during resize the
			    handle moves to the ghost so the user can keep dragging it past the original edge). */}
			{!isResizing ? (
				<div
					className={cn(
						"absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 transition-opacity",
						"opacity-0 group-hover/stat-card:opacity-100 group-data-[active=true]/stat-card:opacity-100"
					)}
				>
					{resizeHandle}
				</div>
			) : null}

			{/* Resize ghost: shows the proposed size while dragging the handle. */}
			{resizePreview != null ? (
				<div
					className="absolute top-0 left-0 z-30 pointer-events-none rounded-xl border-2 border-dashed border-primary bg-primary/10 transition-[width,height] duration-150 ease-out"
					style={{ width: `${resizePreview.width}px`, height: `${resizePreview.height}px` }}
					aria-hidden
				>
					<div className="absolute top-2 right-2 text-[10px] font-mono font-medium text-primary-foreground bg-primary px-1.5 py-0.5 rounded">
						{SPAN_LABELS[resizePreview.span]}
					</div>
					{/* The handle moves with the ghost during resize so the user can drag past the original edge. */}
					<div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 pointer-events-auto">
						{resizeHandle}
					</div>
				</div>
			) : null}
		</div>
	);
}

// === Loader =====================================================================================

export function StatisticsLoader<T>(
	{ queryKey, queryAction, refetchInterval = 60000, render }:
	{
		queryKey: readonly unknown[];
		queryAction: () => Promise<T>;
		refetchInterval?: number | false;
		render: (data: T | null) => ReactNode;
	}
) {
	const query = useQuery({
		queryKey: ["statistics", ...queryKey],
		queryFn: queryAction,
		refetchInterval: refetchInterval == false ? false : refetchInterval,
		refetchOnWindowFocus: true,
		staleTime: 30000
	});
	if(query.isError && query.data == null) {
		return (
			<Alert variant="destructive">
				<CircleAlertIcon />
				<AlertTitle>{`${query.error?.name ?? "Error"}`}</AlertTitle>
				<AlertDescription>{`${query.error?.message ?? "Unable to load statistics."}`}</AlertDescription>
			</Alert>
		);
	}
	// Always render the children so the section structure (layout config, card hide/show, drag
	// handles) stays mounted across loading/refetch cycles. The children render skeletons inside
	// each card when `data` is null.
	return <>{render(query.data ?? null)}</>;
}

// === Hooks ======================================================================================

function useChartSize(targetHeight: number) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [width, setWidth] = useState(0);
	useEffect(() => {
		if(containerRef.current == null) return;
		const observer = new ResizeObserver(entries => {
			for(const entry of entries)
				setWidth(entry.contentRect.width);
		});
		observer.observe(containerRef.current);
		return () => { observer.disconnect(); };
	}, []);
	return { containerRef: containerRef, width: width, height: targetHeight };
}

// === Colors =====================================================================================

const CHART_COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)"
];
const STATUS_COLORS = {
	approved: "var(--chart-3)",
	pending: "var(--chart-1)",
	rejected: "var(--destructive)",
	active: "var(--chart-3)",
	disabled: "var(--muted-foreground)",
	create: "var(--chart-1)",
	update: "var(--chart-2)",
	delete: "var(--destructive)"
};

// === Number cards ===============================================================================

function AnimatedCount(
	{ value, className, formatter = formatCount }:
	{ value: number, className?: string, formatter?: (v: number) => string }
) {
	// Eases the displayed value toward `value` using a cubic ease-out curve.
	const [displayed, setDisplayed] = useState(value);
	const previousRef = useRef(value);
	useEffect(() => {
		const start = previousRef.current;
		const delta = value - start;
		if(delta == 0) return;
		const startedAt = performance.now();
		const durationMs = 400;
		let raf = 0;
		const tick = (now: number) => {
			const t = Math.min(1, (now - startedAt) / durationMs);
			const eased = 1 - Math.pow(1 - t, 3);
			setDisplayed(start + delta * eased);
			if(t < 1)
				raf = requestAnimationFrame(tick);
			else {
				previousRef.current = value;
				setDisplayed(value);
			}
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [value]);
	return <span className={className}>{formatter(displayed)}</span>;
}

export function StatNumber(
	{ data, formatter = formatCount }:
	{ data: StatNumberData, formatter?: (v: number) => string }
) {
	return (
		<div className="flex flex-col gap-1">
			<AnimatedCount value={data.value} formatter={formatter} className="text-3xl font-semibold leading-none font-sans tabular-nums" />
			{data.subtext != null ? (
				<p className="text-muted-foreground text-xs">{data.subtext}</p>
			) : null}
		</div>
	);
}

export function StatReviewStatus(
	{ data, onSegmentClick }:
	{ data: StatReviewStatusData, onSegmentClick?: (segment: "approved" | "pending" | "rejected") => void }
) {
	const total = data.approved + data.pending + data.rejected;
	const items = [
		{ key: "approved" as const, label: "Approved", value: data.approved, color: STATUS_COLORS.approved },
		{ key: "pending" as const, label: "Pending", value: data.pending, color: STATUS_COLORS.pending },
		{ key: "rejected" as const, label: "Rejected", value: data.rejected, color: STATUS_COLORS.rejected }
	];
	return (
		<div className="flex flex-col gap-3">
			<div className="bg-muted relative flex h-2 w-full overflow-hidden rounded-full">
				{total > 0 ? items.map(item => item.value > 0 ? (
					<div
						key={item.key}
						className="h-full transition-all duration-500"
						style={{ width: `${(item.value / total) * 100}%`, backgroundColor: item.color }}
					/>
				) : null) : null}
			</div>
			<div className="grid grid-cols-3 gap-2">
				{items.map(item => (
					<button
						key={item.key}
						type="button"
						onClick={() => onSegmentClick?.(item.key)}
						disabled={onSegmentClick == null}
						className={cn(
							"flex flex-col gap-1 text-left rounded-md p-1.5 -m-1.5 transition-colors",
							onSegmentClick != null ? "hover:bg-muted/60 cursor-pointer" : ""
						)}
					>
						<span className="text-muted-foreground flex items-center gap-1.5 text-xs">
							<span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
							{item.label}
						</span>
						<AnimatedCount value={item.value} className="font-sans text-lg font-semibold leading-none tabular-nums" />
					</button>
				))}
			</div>
		</div>
	);
}

export function StatPendingReview({ data }: { data: StatPendingReviewData }) {
	return (
		<div className="flex flex-col gap-1">
			<AnimatedCount value={data.count} className="text-3xl font-semibold leading-none font-sans tabular-nums" />
			<p className="text-muted-foreground text-xs">
				{data.oldestAgeMs != null ? `Oldest ${formatDuration(data.oldestAgeMs)}` : "No pending items"}
				{data.avgAgeMs != null ? ` · avg ${formatDuration(data.avgAgeMs)}` : ""}
			</p>
		</div>
	);
}

// === Tooltip overlay ============================================================================

function ChartTooltip(
	{ x, y, content, anchorTop = false }:
	{ x: number, y: number, content: ReactNode, anchorTop?: boolean }
) {
	return (
		<div
			className="pointer-events-none absolute z-10 bg-popover text-popover-foreground border rounded-md px-2 py-1 text-xs shadow-md whitespace-nowrap"
			style={{
				left: `${x}px`,
				top: `${y}px`,
				transform: anchorTop ? "translate(-50%, 6px)" : "translate(-50%, -100%) translateY(-6px)"
			}}
		>
			{content}
		</div>
	);
}

// === Donut ======================================================================================

export function StatDonut(
	{ data, onItemClick }:
	{ data: StatBucketData, onItemClick?: (item: { key: string, label?: any, count: number, filterValue?: any }) => void }
) {
	const items = useMemo(() => data.items.map((item, i) => ({
		key: item.key,
		label: item.label ?? item.key,
		count: item.count,
		color: CHART_COLORS[i % CHART_COLORS.length],
		filterValue: item.filterValue ?? item.key
	})), [data]);
	const { containerRef, width } = useChartSize(180);
	const size = Math.min(width, 180);
	const radius = size / 2;
	const innerRadius = radius * 0.6;
	const total = items.reduce((sum, i) => sum + i.count, 0);
	const [hoverKey, setHoverKey] = useState<string | null>(null);
	const arcs = useMemo(() => {
		if(total == 0 || size == 0) return [];
		const pie = d3.pie<typeof items[number]>().value(d => d.count).sort(null);
		const arc = d3.arc<d3.PieArcDatum<typeof items[number]>>().innerRadius(innerRadius).outerRadius(radius);
		const arcHover = d3.arc<d3.PieArcDatum<typeof items[number]>>().innerRadius(innerRadius).outerRadius(radius * 1.06);
		return pie(items).map(p => ({ d: arc(p) ?? "", dHover: arcHover(p) ?? "", item: p.data }));
	}, [items, total, size, radius, innerRadius]);
	return (
		<div ref={containerRef} className="flex flex-col items-center gap-3 sm:flex-row">
			<svg width={size} height={size} className="shrink-0 overflow-visible">
				<g transform={`translate(${radius},${radius})`}>
					{arcs.map(a => (
						<path
							key={a.item.key}
							d={hoverKey == a.item.key ? a.dHover : a.d}
							fill={a.item.color}
							className={cn("transition-all duration-200", onItemClick != null ? "cursor-pointer" : "")}
							style={{ opacity: hoverKey != null && hoverKey != a.item.key ? 0.6 : 1 }}
							onMouseEnter={() => setHoverKey(a.item.key)}
							onMouseLeave={() => setHoverKey(null)}
							onClick={() => onItemClick?.({ key: a.item.key, label: a.item.label, count: a.item.count, filterValue: a.item.filterValue })}
						>
							<title>{`${a.item.label}: ${formatCount(a.item.count)}`}</title>
						</path>
					))}
					<text textAnchor="middle" dominantBaseline="central" className="fill-foreground font-sans text-base font-semibold tabular-nums">
						{formatCount(total)}
					</text>
				</g>
			</svg>
			<div className="flex flex-1 flex-col gap-1.5 self-stretch">
				{items.map(item => (
					<button
						key={item.key}
						type="button"
						onClick={() => onItemClick?.({ key: item.key, label: item.label, count: item.count, filterValue: item.filterValue })}
						onMouseEnter={() => setHoverKey(item.key)}
						onMouseLeave={() => setHoverKey(null)}
						disabled={onItemClick == null}
						className={cn(
							"flex items-center justify-between gap-2 text-xs rounded-md px-1.5 py-1 -mx-1.5 transition-colors",
							onItemClick != null ? "hover:bg-muted/60 cursor-pointer" : "",
							hoverKey == item.key ? "bg-muted/60" : ""
						)}
					>
						<span className="flex items-center gap-1.5 truncate">
							<span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
							<span className="truncate">{item.label}</span>
						</span>
						<AnimatedCount value={item.count} className="font-sans font-semibold tabular-nums" />
					</button>
				))}
				{items.length == 0 ? <span className="text-muted-foreground text-xs">No data</span> : null}
			</div>
		</div>
	);
}

// === Horizontal bar =============================================================================

export function StatHorizontalBar(
	{ data, maxItems = 10, onItemClick }:
	{ data: StatBucketData, maxItems?: number, onItemClick?: (item: { key: string, label?: any, count: number, filterValue?: any }) => void }
) {
	const items = data.items.slice(0, maxItems);
	const max = items.length > 0 ? Math.max(...items.map(i => i.count)) : 0;
	return (
		<div className="flex flex-col gap-2">
			{items.length == 0 ? (
				<span className="text-muted-foreground text-xs">No data</span>
			) : items.map((item, i) => (
				<button
					key={item.key}
					type="button"
					onClick={() => onItemClick?.({ key: item.key, label: item.label, count: item.count, filterValue: item.filterValue ?? item.key })}
					disabled={onItemClick == null}
					className={cn(
						"group/row flex flex-col gap-1 rounded-md p-1 -m-1 text-left transition-colors",
						onItemClick != null ? "hover:bg-muted/60 cursor-pointer" : ""
					)}
				>
					<div className="flex items-center justify-between gap-2 text-xs">
						<span className="truncate">{item.label ?? item.key}</span>
						<AnimatedCount value={item.count} className="font-sans font-semibold tabular-nums" />
					</div>
					<div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
						<div
							className="h-full transition-all duration-500 group-hover/row:opacity-80"
							style={{ width: max > 0 ? `${(item.count / max) * 100}%` : "0%", backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
						/>
					</div>
				</button>
			))}
		</div>
	);
}

// === Bar chart (categorical) ====================================================================

export function StatBar(
	{ data, onItemClick }:
	{ data: StatSeriesData | StatBucketData, onItemClick?: (item: { key: string, label?: any, count: number, filterValue?: any, bucketStart?: string, bucketEnd?: string }) => void }
) {
	const points = useMemo(() => {
		if("points" in data)
			return data.points.map(p => ({ key: p.bucket, label: p.bucket, count: p.count, filterValue: p.bucketStart ?? p.bucket, bucketStart: p.bucketStart, bucketEnd: p.bucketEnd }));
		return data.items.map(i => ({ key: i.key, label: i.label ?? i.key, count: i.count, filterValue: i.filterValue ?? i.key, bucketStart: undefined, bucketEnd: undefined }));
	}, [data]);
	const [hoverKey, setHoverKey] = useState<string | null>(null);
	const [tooltip, setTooltip] = useState<{ x: number, y: number, label: string, count: number } | null>(null);
	const { containerRef, width, height } = useChartSize(160);
	const margin = { top: 8, right: 8, bottom: 24, left: 32 };
	const innerWidth = Math.max(0, width - margin.left - margin.right);
	const innerHeight = Math.max(0, height - margin.top - margin.bottom);
	const xScale = useMemo(() => d3.scaleBand().domain(points.map(p => p.key)).range([0, innerWidth]).padding(0.2), [points, innerWidth]);
	const yMax = points.length > 0 ? Math.max(...points.map(p => p.count), 1) : 1;
	const yScale = useMemo(() => d3.scaleLinear().domain([0, yMax]).nice().range([innerHeight, 0]), [yMax, innerHeight]);
	const xTickStep = Math.max(1, Math.ceil(points.length / 8));
	const yTicks = yScale.ticks(4);
	return (
		<div ref={containerRef} className="w-full relative">
			<svg width={width} height={height} className="overflow-visible">
				<g transform={`translate(${margin.left},${margin.top})`}>
					{yTicks.map(t => (
						<g key={t} transform={`translate(0,${yScale(t)})`}>
							<line x1={0} x2={innerWidth} className="stroke-border" strokeDasharray="2 2" />
							<text x={-6} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">{formatCount(t)}</text>
						</g>
					))}
					{points.map((p, i) => {
						const x = xScale(p.key) ?? 0;
						const y = yScale(p.count);
						const isHover = hoverKey == p.key;
						return (
							<g key={p.key} transform={`translate(${x},0)`}>
								<rect
									x={0}
									y={y - (isHover ? 2 : 0)}
									width={xScale.bandwidth()}
									height={Math.max(0, innerHeight - y) + (isHover ? 2 : 0)}
									className={cn("transition-all duration-200", onItemClick != null ? "cursor-pointer" : "")}
									style={{ fill: CHART_COLORS[i % CHART_COLORS.length], opacity: hoverKey != null && !isHover ? 0.5 : 1 }}
									onMouseEnter={ev => {
										setHoverKey(p.key);
										const rect = (ev.currentTarget.ownerSVGElement?.parentElement)?.getBoundingClientRect();
										if(rect != null)
											setTooltip({ x: ev.clientX - rect.left, y: y + margin.top - rect.top, label: p.label, count: p.count });
									}}
									onMouseLeave={() => { setHoverKey(null); setTooltip(null); }}
									onClick={() => onItemClick?.({ key: p.key, label: p.label, count: p.count, filterValue: p.filterValue, bucketStart: p.bucketStart, bucketEnd: p.bucketEnd })}
								/>
								{i % xTickStep == 0 ? (
									<text x={xScale.bandwidth() / 2} y={innerHeight + 14} textAnchor="middle" className="fill-muted-foreground text-[10px]">
										{p.label.length > 6 ? p.label.slice(-5) : p.label}
									</text>
								) : null}
							</g>
						);
					})}
				</g>
			</svg>
			{tooltip != null ? (
				<ChartTooltip x={tooltip.x} y={tooltip.y} content={<><span className="font-medium">{tooltip.label}</span>: <span className="tabular-nums">{formatCount(tooltip.count)}</span></>} />
			) : null}
		</div>
	);
}

// === Line chart with d3 brush ===================================================================

export function StatLine(
	{ data, onRangeSelect }:
	{ data: StatSeriesData, onRangeSelect?: (range: { start: string, end: string }) => void }
) {
	const points = data.points;
	const { containerRef, width, height } = useChartSize(160);
	const margin = { top: 8, right: 8, bottom: 24, left: 32 };
	const innerWidth = Math.max(0, width - margin.left - margin.right);
	const innerHeight = Math.max(0, height - margin.top - margin.bottom);
	const xScale = useMemo(() => d3.scalePoint().domain(points.map(p => p.bucket)).range([0, innerWidth]).padding(0.5), [points, innerWidth]);
	const yMax = points.length > 0 ? Math.max(...points.map(p => p.count), 1) : 1;
	const yScale = useMemo(() => d3.scaleLinear().domain([0, yMax]).nice().range([innerHeight, 0]), [yMax, innerHeight]);
	const lineGenerator = useMemo(() => d3.line<typeof points[number]>().x(p => xScale(p.bucket) ?? 0).y(p => yScale(p.count)).curve(d3.curveMonotoneX), [xScale, yScale]);
	const areaGenerator = useMemo(() => d3.area<typeof points[number]>().x(p => xScale(p.bucket) ?? 0).y0(innerHeight).y1(p => yScale(p.count)).curve(d3.curveMonotoneX), [xScale, yScale, innerHeight]);
	const linePath = points.length > 0 ? lineGenerator(points) ?? "" : "";
	const areaPath = points.length > 0 ? areaGenerator(points) ?? "" : "";
	const tickStep = Math.max(1, Math.ceil(points.length / 6));
	const yTicks = yScale.ticks(4);
	const gradientId = useId();

	const brushRef = useRef<SVGGElement | null>(null);
	const brushSelectionRef = useRef<[number, number] | null>(null);
	const [hoverIdx, setHoverIdx] = useState<number | null>(null);
	const [tooltip, setTooltip] = useState<{ x: number, y: number, label: string, count: number } | null>(null);

	useEffect(() => {
		const g = brushRef.current;
		if(g == null || innerWidth <= 0 || innerHeight <= 0 || points.length == 0) return;
		const brush = d3.brushX<unknown>()
			.extent([[0, 0], [innerWidth, innerHeight]])
			.on("brush", event => {
				if(event.selection == null) return;
				brushSelectionRef.current = event.selection as [number, number];
			})
			.on("end", event => {
				if(event.selection == null) {
					brushSelectionRef.current = null;
					return;
				}
				const [lo, hi] = event.selection as [number, number];
				if(onRangeSelect == null) return;
				const inRange = points.map((p, i) => ({ p, i, x: xScale(p.bucket) ?? 0 })).filter(c => c.x >= lo && c.x <= hi);
				if(inRange.length == 0) return;
				const startPoint = inRange[0].p;
				const endPoint = inRange[inRange.length - 1].p;
				onRangeSelect({
					start: startPoint.bucketStart ?? startPoint.bucket,
					end: endPoint.bucketEnd ?? endPoint.bucket
				});
				d3.select(g).call(brush.move, null);
			});
		const sel = d3.select(g);
		sel.call(brush);
		// Hide the default brush-overlay grab cursor when this chart isn't interactive.
		if(onRangeSelect == null)
			sel.selectAll(".overlay").style("cursor", "default");
		return () => {
			sel.on(".brush", null);
			sel.selectAll("*").remove();
		};
	}, [innerWidth, innerHeight, points, xScale, onRangeSelect]);

	const onMouseMove = (e: ReactMouseEvent<SVGSVGElement>) => {
		if(points.length == 0) return;
		const svg = e.currentTarget;
		const rect = svg.getBoundingClientRect();
		const relX = e.clientX - rect.left - margin.left;
		let nearest = 0;
		let nearestDist = Infinity;
		for(let i = 0; i < points.length; i++) {
			const x = xScale(points[i].bucket) ?? 0;
			const d = Math.abs(x - relX);
			if(d < nearestDist) {
				nearestDist = d;
				nearest = i;
			}
		}
		setHoverIdx(nearest);
		const containerRect = (containerRef.current as HTMLElement | null)?.getBoundingClientRect();
		if(containerRect != null) {
			const x = (xScale(points[nearest].bucket) ?? 0) + margin.left;
			const y = yScale(points[nearest].count) + margin.top;
			setTooltip({ x: x, y: y, label: points[nearest].bucket, count: points[nearest].count });
		}
	};
	const onMouseLeave = () => {
		setHoverIdx(null);
		setTooltip(null);
	};

	return (
		<div ref={containerRef} className="w-full relative">
			<svg
				width={width}
				height={height}
				className={cn("overflow-visible", onRangeSelect != null ? "cursor-crosshair" : "")}
				onMouseMove={onMouseMove}
				onMouseLeave={onMouseLeave}
			>
				<defs>
					<linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
						<stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.35" />
						<stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
					</linearGradient>
				</defs>
				<g transform={`translate(${margin.left},${margin.top})`}>
					{yTicks.map(t => (
						<g key={t} transform={`translate(0,${yScale(t)})`}>
							<line x1={0} x2={innerWidth} className="stroke-border" strokeDasharray="2 2" />
							<text x={-6} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">{formatCount(t)}</text>
						</g>
					))}
					<path d={areaPath} fill={`url(#${gradientId})`} pointerEvents="none" />
					<path d={linePath} fill="none" stroke="var(--chart-1)" strokeWidth={1.5} className="transition-all duration-300" pointerEvents="none" />
					{points.map((p, i) => {
						const x = xScale(p.bucket) ?? 0;
						const y = yScale(p.count);
						const isHover = hoverIdx == i;
						return (
							<circle
								key={p.bucket}
								cx={x}
								cy={y}
								r={isHover ? 4 : 0}
								fill="var(--chart-1)"
								className="transition-all"
								pointerEvents="none"
							/>
						);
					})}
					{hoverIdx != null ? (
						<line
							x1={xScale(points[hoverIdx].bucket) ?? 0}
							x2={xScale(points[hoverIdx].bucket) ?? 0}
							y1={0}
							y2={innerHeight}
							className="stroke-foreground/40"
							strokeDasharray="2 2"
							pointerEvents="none"
						/>
					) : null}
					{points.map((p, i) => i % tickStep == 0 ? (
						<text key={p.bucket} x={xScale(p.bucket) ?? 0} y={innerHeight + 14} textAnchor="middle" className="fill-muted-foreground text-[10px]" pointerEvents="none">
							{p.bucket.length > 5 ? p.bucket.slice(5) : p.bucket}
						</text>
					) : null)}
					<g ref={brushRef} className="[&_.selection]:fill-chart-1 [&_.selection]:fill-opacity-15 [&_.selection]:stroke-chart-1 [&_.selection]:stroke-opacity-30" />
				</g>
			</svg>
			{tooltip != null ? (
				<ChartTooltip x={tooltip.x} y={tooltip.y} content={<><span className="font-medium">{tooltip.label}</span>: <span className="tabular-nums">{formatCount(tooltip.count)}</span></>} />
			) : null}
		</div>
	);
}

// === Histogram ==================================================================================

export function StatHistogram(
	{ data, onBinClick }:
	{ data: StatHistogramData, onBinClick?: (bin: { binStart: number, binEnd: number, count: number, label?: string | null }) => void }
) {
	const points = useMemo(() => data.bins.map(b => ({
		key: b.label ?? `${b.binStart}-${b.binEnd}`,
		label: b.label ?? formatBinLabel(b.binStart, b.binEnd),
		count: b.count,
		binStart: b.binStart,
		binEnd: b.binEnd
	})), [data]);
	const [hoverKey, setHoverKey] = useState<string | null>(null);
	const [tooltip, setTooltip] = useState<{ x: number, y: number, label: string, count: number } | null>(null);
	const { containerRef, width, height } = useChartSize(160);
	const margin = { top: 8, right: 8, bottom: 24, left: 32 };
	const innerWidth = Math.max(0, width - margin.left - margin.right);
	const innerHeight = Math.max(0, height - margin.top - margin.bottom);
	const xScale = useMemo(() => d3.scaleBand().domain(points.map(p => p.key)).range([0, innerWidth]).padding(0.1), [points, innerWidth]);
	const yMax = points.length > 0 ? Math.max(...points.map(p => p.count), 1) : 1;
	const yScale = useMemo(() => d3.scaleLinear().domain([0, yMax]).nice().range([innerHeight, 0]), [yMax, innerHeight]);
	const yTicks = yScale.ticks(4);
	return (
		<div ref={containerRef} className="w-full relative">
			<svg width={width} height={height} className="overflow-visible">
				<g transform={`translate(${margin.left},${margin.top})`}>
					{yTicks.map(t => (
						<g key={t} transform={`translate(0,${yScale(t)})`}>
							<line x1={0} x2={innerWidth} className="stroke-border" strokeDasharray="2 2" />
							<text x={-6} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">{formatCount(t)}</text>
						</g>
					))}
					{points.map((p, i) => {
						const x = xScale(p.key) ?? 0;
						const y = yScale(p.count);
						const isHover = hoverKey == p.key;
						return (
							<g key={p.key}>
								<rect
									x={x}
									y={y - (isHover ? 2 : 0)}
									width={xScale.bandwidth()}
									height={Math.max(0, innerHeight - y) + (isHover ? 2 : 0)}
									className={cn("transition-all duration-200", onBinClick != null ? "cursor-pointer" : "")}
									style={{ fill: CHART_COLORS[i % CHART_COLORS.length], opacity: hoverKey != null && !isHover ? 0.5 : 1 }}
									onMouseEnter={ev => {
										setHoverKey(p.key);
										const rect = (ev.currentTarget.ownerSVGElement?.parentElement)?.getBoundingClientRect();
										if(rect != null)
											setTooltip({ x: ev.clientX - rect.left, y: y + margin.top - rect.top, label: p.label, count: p.count });
									}}
									onMouseLeave={() => { setHoverKey(null); setTooltip(null); }}
									onClick={() => onBinClick?.({ binStart: p.binStart, binEnd: p.binEnd, count: p.count, label: p.label })}
								/>
								<text x={x + xScale.bandwidth() / 2} y={innerHeight + 14} textAnchor="middle" className="fill-muted-foreground text-[10px]" pointerEvents="none">
									{p.label.length > 8 ? p.label.slice(0, 7) + "…" : p.label}
								</text>
							</g>
						);
					})}
				</g>
			</svg>
			{tooltip != null ? (
				<ChartTooltip x={tooltip.x} y={tooltip.y} content={<><span className="font-medium">{tooltip.label}</span>: <span className="tabular-nums">{formatCount(tooltip.count)}</span></>} />
			) : null}
		</div>
	);
}

// === Heatmap ====================================================================================

export function StatHeatmap(
	{ data, onCellClick }:
	{ data: StatHeatmapData, onCellClick?: (cell: { x: number, y: number, count: number, xLabel: string, yLabel: string }) => void }
) {
	const { containerRef, width, height } = useChartSize(180);
	const margin = { top: 8, right: 8, bottom: 24, left: 36 };
	const innerWidth = Math.max(0, width - margin.left - margin.right);
	const innerHeight = Math.max(0, height - margin.top - margin.bottom);
	const cellWidth = innerWidth / Math.max(1, data.xLabels.length);
	const cellHeight = innerHeight / Math.max(1, data.yLabels.length);
	const maxCount = data.cells.length > 0 ? Math.max(...data.cells.map(c => c.count), 1) : 1;
	const xTickStep = Math.max(1, Math.ceil(data.xLabels.length / 6));
	const [hoverCell, setHoverCell] = useState<{ x: number, y: number } | null>(null);
	const [tooltip, setTooltip] = useState<{ x: number, y: number, label: string, count: number } | null>(null);
	return (
		<div ref={containerRef} className="w-full relative">
			<svg width={width} height={height} className="overflow-visible">
				<g transform={`translate(${margin.left},${margin.top})`}>
					{data.yLabels.map((yl, yi) => (
						<text key={yl} x={-6} y={yi * cellHeight + cellHeight / 2} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10px]">{yl}</text>
					))}
					{data.cells.map(c => {
						const cx = c.x * cellWidth;
						const cy = c.y * cellHeight;
						const isHover = hoverCell?.x == c.x && hoverCell?.y == c.y;
						const intensity = c.count / maxCount;
						const scale = isHover ? 1.08 : 1;
						const w = cellWidth - 1;
						const h = cellHeight - 1;
						return (
							<g key={`${c.x}-${c.y}`} transform={`translate(${cx + w / 2},${cy + h / 2}) scale(${scale}) translate(${-w / 2},${-h / 2})`}>
								<rect
									x={0}
									y={0}
									width={w}
									height={h}
									fill="var(--chart-1)"
									className={cn("transition-all duration-200", onCellClick != null ? "cursor-pointer" : "")}
									style={{ opacity: 0.1 + intensity * 0.8 }}
									onMouseEnter={ev => {
										setHoverCell({ x: c.x, y: c.y });
										const rect = (ev.currentTarget.ownerSVGElement?.parentElement)?.getBoundingClientRect();
										if(rect != null)
											setTooltip({ x: cx + w / 2 + margin.left, y: cy + margin.top, label: `${data.yLabels[c.y]} ${data.xLabels[c.x]}`, count: c.count });
									}}
									onMouseLeave={() => { setHoverCell(null); setTooltip(null); }}
									onClick={() => onCellClick?.({ x: c.x, y: c.y, count: c.count, xLabel: data.xLabels[c.x], yLabel: data.yLabels[c.y] })}
								/>
							</g>
						);
					})}
					{data.xLabels.map((xl, xi) => xi % xTickStep == 0 ? (
						<text key={xl} x={xi * cellWidth + cellWidth / 2} y={innerHeight + 14} textAnchor="middle" className="fill-muted-foreground text-[10px]" pointerEvents="none">{xl}</text>
					) : null)}
				</g>
			</svg>
			{tooltip != null ? (
				<ChartTooltip x={tooltip.x} y={tooltip.y} content={<><span className="font-medium">{tooltip.label}</span>: <span className="tabular-nums">{formatCount(tooltip.count)}</span></>} />
			) : null}
		</div>
	);
}

// === Formatters =================================================================================

export function formatCount(value: number): string {
	if(!Number.isFinite(value)) return "-";
	if(Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
	if(Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
	if(Number.isInteger(value)) return value.toString();
	return value.toFixed(1);
}

export function formatDuration(ms: number): string {
	if(!Number.isFinite(ms) || ms < 0) return "-";
	const seconds = ms / 1000;
	if(seconds < 60) return `${Math.round(seconds)}s`;
	const minutes = seconds / 60;
	if(minutes < 60) return `${Math.round(minutes)}m`;
	const hours = minutes / 60;
	if(hours < 24) return `${Math.round(hours)}h`;
	const days = hours / 24;
	return `${Math.round(days)}d`;
}

function formatBinLabel(binStart: number, binEnd: number): string {
	if(!Number.isFinite(binEnd)) return `≥${formatCount(binStart)}`;
	return `${formatCount(binStart)}-${formatCount(binEnd)}`;
}

// === Common composite renderers =================================================================

// Card metadata for each Common*Cards component. Menu pages combine these with their
// menu-specific cards and pass the result to `useStatisticsVisibleKeys` to determine which
// statistics keys to request from the server.
export const commonReviewableViewerCardDefinitions = Object.freeze([
	{ key: "currentFiltered" },
	{ key: "reviewStatus" },
	{ key: "pendingReview" },
	{ key: "changeRequestType" },
	{ key: "createdAt" },
	{ key: "updatedAt", defaultHidden: true },
	{ key: "deletedAt", defaultHidden: true },
	{ key: "reviewedAt", defaultHidden: true },
	{ key: "topCreators" }
] as const);
export const commonReviewableApproverCardDefinitions = Object.freeze([
	{ key: "pendingReview" },
	{ key: "pendingChangeRequestType" },
	{ key: "pendingBacklogAge" },
	{ key: "pendingCreatedAt" },
	{ key: "pendingTopCreators" }
] as const);
export const commonLogMonitoringCardDefinitions = Object.freeze([
	{ key: "currentFiltered" },
	{ key: "hourlyDistribution" }
] as const);
export const commonLogReportingCardDefinitions = Object.freeze([
	{ key: "currentFiltered" },
	{ key: "dailySeries" },
	{ key: "hourDayHeatmap" }
] as const);

export function CommonReviewableViewerCards(
	{ data, totalLabel, filters, onFiltersChange }:
	{
		data: CommonReviewableViewerStats | null;
		totalLabel: string;
		filters: MenuFilterState[];
		onFiltersChange: (next: MenuFilterState[]) => void;
	}
) {
	return (
		<>
			{data == null || data.currentFiltered != null ? (
				<StatisticsCard cardKey="currentFiltered" title={totalLabel} description="Current filtered" skeleton={data == null}>
					{data?.currentFiltered != null ? <StatNumber data={data.currentFiltered} /> : null}
				</StatisticsCard>
			) : null}
			{data == null || data.reviewStatus != null ? (
				<StatisticsCard cardKey="reviewStatus" title="Review Status" defaultSpan={2} skeleton={data == null}>
					{data?.reviewStatus != null ? (
						<StatReviewStatus
							data={data.reviewStatus}
							onSegmentClick={segment => onFiltersChange(
								segment == "approved" ? [
									...filters.filter(f => (f.columnKey != "_status" || f.operator != "equals") && (f.columnKey != "reviewApproved" || f.operator != "equals")),
									{ columnKey: "_status", operator: "equals", combinator: "and", value: "published" },
									{ columnKey: "reviewApproved", operator: "equals", combinator: "and", value: true }
								] : segment == "pending" ? [
									...filters.filter(f => (f.columnKey != "_status" || f.operator != "equals") && (f.columnKey != "reviewedAt" || f.operator != "exists")),
									{ columnKey: "_status", operator: "equals", combinator: "and", value: "draft" },
									{ columnKey: "reviewedAt", operator: "exists", combinator: "and", value: false }
								] : [
									...filters.filter(f => f.columnKey != "reviewApproved" || f.operator != "equals"),
									{ columnKey: "reviewApproved", operator: "equals", combinator: "and", value: false }
								]
							)}
						/>
					) : null}
				</StatisticsCard>
			) : null}
			{data == null || data.pendingReview != null ? (
				<StatisticsCard cardKey="pendingReview" title="Pending Review" skeleton={data == null}>
					{data?.pendingReview != null ? <StatPendingReview data={data.pendingReview} /> : null}
				</StatisticsCard>
			) : null}
			{data == null || data.changeRequestType != null ? (
				<StatisticsCard cardKey="changeRequestType" title="Change Request Types" skeleton={data == null}>
					{data?.changeRequestType != null ? (
						<StatDonut
							data={{ items: [
								{ key: "create", label: changeRequestTypeSelectOptions.find(o => o.value == "create")!.label, count: data.changeRequestType.create, filterValue: "create" },
								{ key: "update", label: changeRequestTypeSelectOptions.find(o => o.value == "update")!.label, count: data.changeRequestType.update, filterValue: "update" },
								{ key: "delete", label: changeRequestTypeSelectOptions.find(o => o.value == "delete")!.label, count: data.changeRequestType.delete, filterValue: "delete" }
							].filter(i => i.count > 0) }}
							onItemClick={item => onFiltersChange([
								...filters.filter(f => f.columnKey != "changeRequestType" || f.operator != "equals"),
								{ columnKey: "changeRequestType", operator: "equals", combinator: "and", value: item.filterValue }
							])}
						/>
					) : null}
				</StatisticsCard>
			) : null}
			{data == null || data.createdAt != null ? (
				<StatisticsCard cardKey="createdAt" title="Created Over Time" description="Last 30 days" defaultSpan={2} skeleton={data == null}>
					{data?.createdAt != null ? (
						<StatLine
							data={data.createdAt}
							onRangeSelect={range => onFiltersChange([
								...filters.filter(f => f.columnKey != "createdAt" || (f.operator != "greater_than_equal" && f.operator != "less_than_equal")),
								{ columnKey: "createdAt", operator: "greater_than_equal", combinator: "and", value: range.start },
								{ columnKey: "createdAt", operator: "less_than_equal", combinator: "and", value: range.end }
							])}
						/>
					) : null}
				</StatisticsCard>
			) : null}
			{data == null || data.updatedAt != null ? (
				<StatisticsCard cardKey="updatedAt" title="Updated Over Time" description="Last 30 days" defaultSpan={2} defaultHidden skeleton={data == null}>
					{data?.updatedAt != null ? (
						<StatLine
							data={data.updatedAt}
							onRangeSelect={range => onFiltersChange([
								...filters.filter(f => f.columnKey != "updatedAt" || (f.operator != "greater_than_equal" && f.operator != "less_than_equal")),
								{ columnKey: "updatedAt", operator: "greater_than_equal", combinator: "and", value: range.start },
								{ columnKey: "updatedAt", operator: "less_than_equal", combinator: "and", value: range.end }
							])}
						/>
					) : null}
				</StatisticsCard>
			) : null}
			{data == null || data.deletedAt != null ? (
				<StatisticsCard cardKey="deletedAt" title="Deleted Over Time" description="Last 30 days" defaultSpan={2} defaultHidden skeleton={data == null}>
					{data?.deletedAt != null ? (
						<StatLine
							data={data.deletedAt}
							onRangeSelect={range => onFiltersChange([
								...filters.filter(f => f.columnKey != "deletedAt" || (f.operator != "greater_than_equal" && f.operator != "less_than_equal")),
								{ columnKey: "deletedAt", operator: "greater_than_equal", combinator: "and", value: range.start },
								{ columnKey: "deletedAt", operator: "less_than_equal", combinator: "and", value: range.end }
							])}
						/>
					) : null}
				</StatisticsCard>
			) : null}
			{data == null || data.reviewedAt != null ? (
				<StatisticsCard cardKey="reviewedAt" title="Reviewed Over Time" description="Last 30 days" defaultSpan={2} defaultHidden skeleton={data == null}>
					{data?.reviewedAt != null ? (
						<StatLine
							data={data.reviewedAt}
							onRangeSelect={range => onFiltersChange([
								...filters.filter(f => f.columnKey != "reviewedAt" || (f.operator != "greater_than_equal" && f.operator != "less_than_equal")),
								{ columnKey: "reviewedAt", operator: "greater_than_equal", combinator: "and", value: range.start },
								{ columnKey: "reviewedAt", operator: "less_than_equal", combinator: "and", value: range.end }
							])}
						/>
					) : null}
				</StatisticsCard>
			) : null}
			{data == null || (data.topCreators != null && data.topCreators.items.length > 0) ? (
				<StatisticsCard cardKey="topCreators" title="Top Creators" skeleton={data == null}>
					{data?.topCreators != null ? (
						<StatHorizontalBar
							data={{ ...data.topCreators, items: data.topCreators.items.map(i => ({ ...i, label: data.relations[`users:${i.key}`]?.name ?? i.key })) }}
							onItemClick={item => onFiltersChange([
								...filters.filter(f => f.columnKey != "createdBy" || f.operator != "equals"),
								{ columnKey: "createdBy", operator: "equals", combinator: "and", value: item.filterValue }
							])}
						/>
					) : null}
				</StatisticsCard>
			) : null}
		</>
	);
}

export function CommonReviewableApproverCards(
	{ data, filters, onFiltersChange }:
	{
		data: CommonReviewableApproverStats | null;
		filters: MenuFilterState[];
		onFiltersChange: (next: MenuFilterState[]) => void;
	}
) {
	return (
		<>
			{data == null || data.pendingReview != null ? (
				<StatisticsCard cardKey="pendingReview" title="Pending Review" skeleton={data == null}>
					{data?.pendingReview != null ? <StatPendingReview data={data.pendingReview} /> : null}
				</StatisticsCard>
			) : null}
			{data == null || data.pendingChangeRequestType != null ? (
				<StatisticsCard cardKey="pendingChangeRequestType" title="Pending Change Request Types" skeleton={data == null}>
					{data?.pendingChangeRequestType != null ? (
						<StatDonut
							data={{ items: [
								{ key: "create", label: changeRequestTypeSelectOptions.find(o => o.value == "create")!.label, count: data.pendingChangeRequestType.create, filterValue: "create" },
								{ key: "update", label: changeRequestTypeSelectOptions.find(o => o.value == "update")!.label, count: data.pendingChangeRequestType.update, filterValue: "update" },
								{ key: "delete", label: changeRequestTypeSelectOptions.find(o => o.value == "delete")!.label, count: data.pendingChangeRequestType.delete, filterValue: "delete" }
							].filter(i => i.count > 0) }}
							onItemClick={item => onFiltersChange([
								...filters.filter(f => f.columnKey != "changeRequestType" || f.operator != "equals"),
								{ columnKey: "changeRequestType", operator: "equals", combinator: "and", value: item.filterValue }
							])}
						/>
					) : null}
				</StatisticsCard>
			) : null}
			{data == null || data.pendingBacklogAge != null ? (
				<StatisticsCard cardKey="pendingBacklogAge" title="Backlog Age" description="Pending items by age" skeleton={data == null}>
					{data?.pendingBacklogAge != null ? <StatHistogram data={data.pendingBacklogAge} /> : null}
				</StatisticsCard>
			) : null}
			{data == null || data.pendingCreatedAt != null ? (
				<StatisticsCard cardKey="pendingCreatedAt" title="Pending Items Over Time" description="Created in last 30 days" defaultSpan={2} skeleton={data == null}>
					{data?.pendingCreatedAt != null ? (
						<StatLine
							data={data.pendingCreatedAt}
							onRangeSelect={range => onFiltersChange([
								...filters.filter(f => f.columnKey != "createdAt" || (f.operator != "greater_than_equal" && f.operator != "less_than_equal")),
								{ columnKey: "createdAt", operator: "greater_than_equal", combinator: "and", value: range.start },
								{ columnKey: "createdAt", operator: "less_than_equal", combinator: "and", value: range.end }
							])}
						/>
					) : null}
				</StatisticsCard>
			) : null}
			{data == null || (data.pendingTopCreators != null && data.pendingTopCreators.items.length > 0) ? (
				<StatisticsCard cardKey="pendingTopCreators" title="Pending — Top Creators" skeleton={data == null}>
					{data?.pendingTopCreators != null ? (
						<StatHorizontalBar
							data={{ ...data.pendingTopCreators, items: data.pendingTopCreators.items.map(i => ({ ...i, label: data.relations[`users:${i.key}`]?.name ?? i.key })) }}
							onItemClick={item => onFiltersChange([
								...filters.filter(f => f.columnKey != "createdBy" || f.operator != "equals"),
								{ columnKey: "createdBy", operator: "equals", combinator: "and", value: item.filterValue }
							])}
						/>
					) : null}
				</StatisticsCard>
			) : null}
		</>
	);
}

export function CommonLogMonitoringCards(
	{ data, totalLabel = "Today", filters, onFiltersChange }:
	{
		data: CommonLogMonitoringStats | null;
		totalLabel?: string;
		filters: MenuFilterState[];
		onFiltersChange: (next: MenuFilterState[]) => void;
	}
) {
	return (
		<>
			{data == null || data.currentFiltered != null ? (
				<StatisticsCard cardKey="currentFiltered" title={totalLabel} description="Current filtered" skeleton={data == null}>
					{data?.currentFiltered != null ? <StatNumber data={data.currentFiltered} /> : null}
				</StatisticsCard>
			) : null}
			{data == null || data.hourlyDistribution != null ? (
				<StatisticsCard cardKey="hourlyDistribution" title="Hourly Distribution" description="Today by hour" defaultSpan={3} skeleton={data == null}>
					{data?.hourlyDistribution != null ? (
						<StatBar
							data={data.hourlyDistribution}
							onItemClick={item => {
								if(item.bucketStart == null || item.bucketEnd == null) return;
								onFiltersChange([
									...filters.filter(f => f.columnKey != "createdAt" || (f.operator != "greater_than_equal" && f.operator != "less_than_equal")),
									{ columnKey: "createdAt", operator: "greater_than_equal", combinator: "and", value: item.bucketStart },
									{ columnKey: "createdAt", operator: "less_than_equal", combinator: "and", value: item.bucketEnd }
								]);
							}}
						/>
					) : null}
				</StatisticsCard>
			) : null}
		</>
	);
}

export function CommonLogReportingCards(
	{ data, totalLabel = "Total", filters, onFiltersChange }:
	{
		data: CommonLogReportingStats | null;
		totalLabel?: string;
		filters: MenuFilterState[];
		onFiltersChange: (next: MenuFilterState[]) => void;
	}
) {
	return (
		<>
			{data == null || data.currentFiltered != null ? (
				<StatisticsCard cardKey="currentFiltered" title={totalLabel} description="Current filtered" skeleton={data == null}>
					{data?.currentFiltered != null ? <StatNumber data={data.currentFiltered} /> : null}
				</StatisticsCard>
			) : null}
			{data == null || data.dailySeries != null ? (
				<StatisticsCard cardKey="dailySeries" title="Daily Volume" description="Last 30 days" defaultSpan={3} skeleton={data == null}>
					{data?.dailySeries != null ? (
						<StatLine
							data={data.dailySeries}
							onRangeSelect={range => onFiltersChange([
								...filters.filter(f => f.columnKey != "createdAt" || (f.operator != "greater_than_equal" && f.operator != "less_than_equal")),
								{ columnKey: "createdAt", operator: "greater_than_equal", combinator: "and", value: range.start },
								{ columnKey: "createdAt", operator: "less_than_equal", combinator: "and", value: range.end }
							])}
						/>
					) : null}
				</StatisticsCard>
			) : null}
			{data == null || data.hourDayHeatmap != null ? (
				<StatisticsCard cardKey="hourDayHeatmap" title="Hour × Day-of-Week" description="Click a cell to filter to the most recent matching hour" defaultSpan={4} skeleton={data == null}>
					{data?.hourDayHeatmap != null ? (
						<StatHeatmap
							data={data.hourDayHeatmap}
							onCellClick={cell => {
								// Resolve to the most recent occurrence of (dow, hour) in the past then filter to that
								// 1-hour range. The cell's xLabel is the hour ("HH"), yLabel is the dow short name.
								const targetHour = Number(cell.xLabel);
								const targetDow = data.hourDayHeatmap!.yLabels.indexOf(cell.yLabel);
								const now = new Date();
								const ref = new Date(now);
								ref.setHours(targetHour, 0, 0, 0);
								const dayDelta = (ref.getDay() - targetDow + 7) % 7;
								ref.setDate(ref.getDate() - dayDelta);
								if(ref.getTime() > now.getTime())
									ref.setDate(ref.getDate() - 7);
								const end = new Date(ref);
								end.setHours(end.getHours() + 1);
								onFiltersChange([
									...filters.filter(f => f.columnKey != "createdAt" || (f.operator != "greater_than_equal" && f.operator != "less_than")),
									{ columnKey: "createdAt", operator: "greater_than_equal", combinator: "and", value: ref.toISOString() },
									{ columnKey: "createdAt", operator: "less_than", combinator: "and", value: end.toISOString() }
								]);
							}}
						/>
					) : null}
				</StatisticsCard>
			) : null}
		</>
	);
}
