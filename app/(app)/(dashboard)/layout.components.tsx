"use client";

import React, { memo, useRef, useMemo, useState, useEffect, useContext, useCallback, createContext, type ReactNode } from "react";
import { redirect, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { XIcon, PlusIcon, SmileIcon, UsersIcon, FilterIcon, LogOutIcon, SearchIcon, ArrowUpIcon, HistoryIcon, LucideProps, UserCogIcon, Columns3Icon, KeyRoundIcon, ArrowDownIcon, BarChart3Icon, FileCheckIcon, MapPinnedIcon, UserCheckIcon, AudioLinesIcon, TrendingUpIcon, ArrowUpDownIcon, LocateFixedIcon, LockKeyholeIcon, ShieldCheckIcon, ChevronRightIcon, GripVerticalIcon, ClipboardListIcon, ChevronsUpDownIcon, ClipboardCheckIcon } from "lucide-react";

import cn from "@/utils/cn";
import useIsMobile from "@/utils/useIsMobile";
import { DatetimeInput } from "@/components/DatetimeInput";
import { Image } from "@/components/Image";
import { Link } from "@/components/Link";
import { RedactProvider } from "@/components/Redact";
import { RichTextPreview } from "@/components/RichText";
import { SearchableSelect, SearchableMultiSelect } from "@/components/SearchableSelect";
import { Avatar, AvatarFallback } from "@/components/radix/Avatar";
import { Badge } from "@/components/radix/Badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/radix/Breadcrumb";
import { Button } from "@/components/radix/Button";
import { Card, CardContent } from "@/components/radix/Card";
import { Checkbox } from "@/components/radix/Checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/radix/Collapsible";
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/radix/DropdownMenu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/radix/HoverCard";
import { Input } from "@/components/radix/Input";
import { Select, SelectItem, SelectValue, SelectContent, SelectTrigger } from "@/components/radix/Select";
import { Separator } from "@/components/radix/Separator";
import { Sidebar, useSidebar, SidebarMenu, SidebarRail, SidebarGroup, SidebarInset, SidebarFooter, SidebarHeader, SidebarContent, SidebarMenuSub, SidebarTrigger, SidebarMenuItem, SidebarProvider, SidebarGroupLabel, SidebarMenuButton, SidebarMenuSubItem, SidebarMenuSubButton } from "@/components/radix/Sidebar";
import { Switch } from "@/components/radix/Switch";
import { Table, TableRow, TableBody, TableCell, TableHead, TableHeader } from "@/components/radix/Table";

import logoEcentrix from "../../_static/favicons/logo.png";
import { logoutAction } from "./layout.actions";
import { DashboardMenu, getDashboardContextAction } from "./layout.actions";
import { dashboardRoleKeys, dashboardMenuGroups, changeRequestTypeSelectOptions } from "./layout.shared";

const MenuIcons: Record<string, React.FC<LucideProps & React.RefAttributes<SVGSVGElement>>> = {
	"user-management": UserCogIcon,
	"role-management": ShieldCheckIcon,
	"team-management": UsersIcon,
	"access-management": LockKeyholeIcon,
	"credit-application-management": FileCheckIcon,
	"credit-application-assignment": UserCheckIcon,
	"survey-management": ClipboardListIcon,
	"survey-result": BarChart3Icon,
	"satisfaction-survey-management": SmileIcon,
	"satisfaction-survey-result": TrendingUpIcon,
	"officer-task": ClipboardCheckIcon,
	"officer-tracking": MapPinnedIcon,
	"login-log": HistoryIcon,
	"message-log": KeyRoundIcon,
	"gps-log": LocateFixedIcon,
	"recording-log": AudioLinesIcon
};

function DashboardMenuGroupLabel({ children }: { children: React.ReactNode }) {
	const { state: sidebarState } = useSidebar();
	return (
		<SidebarGroupLabel className={cn(sidebarState != "expanded" ? "select-none pointer-events-none" : "")}>
			{children}
		</SidebarGroupLabel>
	);
}
function DashboardMenuKey(
	{ pathname, openSubmenuKeys, setOpenSubmenuKeys, menu }:
	{ pathname: string, openSubmenuKeys: string[], setOpenSubmenuKeys: (cb: (v: string[]) => string[]) => void, menu: DashboardMenu }
) {
	const { isMobile, state: sidebarState } = useSidebar();
	const [lastSidebarState, setLastSidebarState] = useState(sidebarState);
	useEffect(() => {
		const handle = setTimeout(() => setLastSidebarState(sidebarState), 500);
		return () => { clearTimeout(handle); };
	}, [sidebarState]);
	const menuModes = useMemo(() => {
		return dashboardRoleKeys.filter(roleKey => roleKey.startsWith(`${menu.key}#`))
			.map(roleKey => roleKey.slice(`${menu.key}#`.length))
			.filter(modeKey => modeKey in menu.modes)
			.map(modeKey => [modeKey, menu.modes[modeKey]] as const);
	}, [menu]);
	const isActive = menuModes.some(([_, mode]) => mode.href == pathname);
	const Icon = MenuIcons[menu.key];
	if(Object.keys(menu.modes).length == 1) {
		return (
			<SidebarMenuItem>
				<SidebarMenuButton asChild isActive={isActive} tooltip={menu.label}>
					<Link href={Object.values(menu.modes)[0].href}>
						<Icon />
						<span className="whitespace-nowrap line-clamp-1">{menu.label}</span>
					</Link>
				</SidebarMenuButton>
			</SidebarMenuItem>
		);
	}
	if(isMobile || sidebarState == "expanded" || lastSidebarState == "expanded") {
		return (
			<Collapsible
				asChild
				open={openSubmenuKeys.includes(menu.key)}
				onOpenChange={open => setOpenSubmenuKeys(v => open ? [...new Set([...v, menu.key])] : v.filter(menuKey => menuKey != menu.key))}
				className="group/collapsible"
			>
				<SidebarMenuItem>
					<CollapsibleTrigger asChild>
						<SidebarMenuButton isActive={isActive}>
							<Icon />
							<span className="whitespace-nowrap line-clamp-1 text-clip">{menu.label}</span>
							<ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
						</SidebarMenuButton>
					</CollapsibleTrigger>
					<CollapsibleContent>
						<SidebarMenuSub className="py-2">
							{menuModes.map(([modeKey, mode]) => (
								<SidebarMenuSubItem key={modeKey}>
									<SidebarMenuSubButton asChild isActive={pathname == mode.href}>
										<Link href={mode.href}>
											<span className="whitespace-nowrap line-clamp-1 text-clip">
												{mode.shortLabel}
											</span>
										</Link>
									</SidebarMenuSubButton>
								</SidebarMenuSubItem>
							))}
						</SidebarMenuSub>
					</CollapsibleContent>
				</SidebarMenuItem>
			</Collapsible>
		);
	}
	return (
		<HoverCard openDelay={150} closeDelay={100}>
			<HoverCardTrigger asChild>
				<SidebarMenuButton isActive={isActive}>
					<Icon />
					<span className="whitespace-nowrap line-clamp-1 text-clip">{menu.label}</span>
					<ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
				</SidebarMenuButton>
			</HoverCardTrigger>
			<HoverCardContent side="right" align="start" sideOffset={12} className="w-64 p-2 flex flex-col gap-1 bg-sidebar brightness-150">
				<p className="p-1 brightness-80 text-xs text-sidebar-foreground">{menu.label}</p>
				{menuModes.map(([modeKey, mode]) => (
					<Link key={modeKey} href={mode.href} data-active={pathname == mode.href} className="brightness-[66.6%] text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground h-7 gap-2 rounded-md px-2 focus-visible:ring-2 data-[size=md]:text-sm data-[size=sm]:text-xs [&>svg]:size-4 flex min-w-0 -translate-x-px items-center overflow-hidden outline-hidden group-data-[collapsible=icon]:hidden disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:shrink-0">
						<span className="whitespace-nowrap line-clamp-1 text-clip">{mode.shortLabel}</span>
					</Link>
				))}
			</HoverCardContent>
		</HoverCard>
	);
}

const DashboardContext = createContext<Awaited<ReturnType<typeof getDashboardContextAction>> | null>(null);
export function useDashboardContext() {
	return useContext(DashboardContext)!;
}
export function DashboardShell(
	{ initialContext, children }:
	{ initialContext: Awaited<ReturnType<typeof getDashboardContextAction>>, children: ReactNode }
) {
	const context = useQuery({
		queryKey: ["dashboard", "context"],
		queryFn: async () => await getDashboardContextAction(),
		initialData: initialContext,
		staleTime: 60000,
		gcTime: 120000
	}).data;
	if(context == null)
		return redirect("/login");
	const { user, menus } = context;
	const pathname = usePathname();
	const isMobile = useIsMobile();
	const [openSubmenuKeys, setOpenSubmenuKeys] = useState([] as string[]);
	const menusWithoutMasked = useMemo(() => {
		const menusWithoutMasked = structuredClone(menus);
		for(const menu of menusWithoutMasked) {
			if(menu.modes["editor"] != null && menu.modes["viewer"] != null) {
				delete menu.modes["viewer"];
				if(menu.defaultMode == "viewer")
					menu.defaultMode = "editor";
			}
			if(menu.modes["import-editor"] != null && menu.modes["import-viewer"] != null) {
				delete menu.modes["import-viewer"];
				if(menu.defaultMode == "import-viewer")
					menu.defaultMode = "import-editor";
			}
		}
		return menusWithoutMasked;
	}, [menus]);
	const activeMenu = menusWithoutMasked.find(menu => Object.values(menu.modes).some(mode => mode.href == pathname));
	const activeMode = activeMenu != null ? Object.values(activeMenu.modes).find(mode => mode.href == pathname)! : null;
	useEffect(() => {
		if(activeMenu == null) return;
		setOpenSubmenuKeys(v => [...new Set([...v, activeMenu.key])]);
	}, [activeMenu]);

	return (
		<RedactProvider canvasClassName="z-51">
			<DashboardContext.Provider value={context}>
				<SidebarProvider className="[--sidebar-width:20rem]!">
					<Sidebar collapsible="icon" variant="inset" className="bg-sidebar h-lvh pb-[calc(100lvh-100dvh)] [anchor-name:--sidebar-anchor]">
						<SidebarHeader>
							<SidebarMenu>
								<SidebarMenuItem>
									<SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
										<Link href="/" className="flex h-18">
											<Image src={logoEcentrix} alt="eCentrix symbol" className="mt-px h-12 w-12 transition-all duration-150 shrink-0 object-contain scale-100 group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:h-5 group-data-[collapsible=icon]:w-5 group-data-[collapsible=icon]:scale-150" />
											<div className="flex flex-col gap-2">
												<span className="text-[15px] text-sidebar-accent-foreground leading-none font-semibold uppercase whitespace-nowrap line-clamp-2 text-clip">
													PT. Intelix Global<br />Crossing
												</span>
												<span className="text-[10px] leading-none font-semibold uppercase whitespace-nowrap line-clamp-1 text-clip">
													Mobile Survey Management
												</span>
											</div>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarHeader>
						<SidebarContent>
							{dashboardMenuGroups
								.map(([groupName, groupMenus]) => [groupName, groupMenus.map(groupMenu =>
									menusWithoutMasked.find(menu => menu.key == groupMenu)).filter(menu => menu != null)] as const)
								.filter(([_, menus]) => menus.length > 0)
								.map(([groupName, menus]) => (
									<SidebarGroup key={groupName}>
										<DashboardMenuGroupLabel>{groupName}</DashboardMenuGroupLabel>
										<SidebarMenu className="gap-2">
											{menus.map(menu => (
												<DashboardMenuKey
													key={menu.key}
													pathname={pathname}
													openSubmenuKeys={openSubmenuKeys}
													setOpenSubmenuKeys={setOpenSubmenuKeys}
													menu={menu}
												/>
											))}
										</SidebarMenu>
									</SidebarGroup>
								))}
						</SidebarContent>
						<SidebarFooter>
							<SidebarMenu>
								<SidebarMenuItem>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
												<Avatar className="h-8 w-8">
													<AvatarFallback>{user.name.split(/\s+/g).slice(0, 2).map(w => w.charAt(0)).join("")}</AvatarFallback>
												</Avatar>
												<div className="grid flex-1 text-left text-sm leading-tight">
													<span className="truncate font-medium">{user.name}</span>
													<span className="truncate text-xs">{user.email}</span>
												</div>
												<ChevronsUpDownIcon className="ml-auto size-4" />
											</SidebarMenuButton>
										</DropdownMenuTrigger>
										<DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg" side={isMobile ? "bottom" : "right"} align="end" sideOffset={4}>
											<DropdownMenuLabel className="p-0 font-normal">
												<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
													<Avatar className="h-8 w-8">
														<AvatarFallback>{user.name.split(/\s+/g).slice(0, 2).map(w => w.charAt(0)).join("")}</AvatarFallback>
													</Avatar>
													<div className="grid flex-1 text-left text-sm leading-tight">
														<span className="truncate font-medium">{user.name}</span>
														<span className="truncate text-xs">{user.email}</span>
													</div>
												</div>
											</DropdownMenuLabel>
											<DropdownMenuSeparator />
											<DropdownMenuItem onClick={() => logoutAction()}>
												<LogOutIcon />
												Log out
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarFooter>
						<SidebarRail />
					</Sidebar>
					<div className="fixed [position-anchor:--sidebar-anchor] top-[anchor(top)] bottom-0 left-[anchor(right)] right-0 z-50 pointer-events-none select-none bg-sidebar mask-[url(#sidebar-cutout)] [anchor-name:--sidebar-cutout]" />
					<div className="fixed [position-anchor:--sidebar-cutout] top-[calc(100svh-1px)] left-[anchor(left)] w-[anchor-size(width)] h-[calc(100lvh-100dvh)] z-50 pointer-events-none select-none bg-sidebar" />
					<svg className="fixed [position-anchor:--sidebar-cutout] top-[anchor(top)] h-[anchor-size(height)] left-[anchor(left)] w-[anchor-size(width)] opacity-0 pointer-events-none select-none">
						<mask id="sidebar-cutout">
							<rect className="w-full h-full fill-white" />
							<rect className="[y:--spacing(2)] w-[calc(100%---spacing(2))] h-[calc(100%---spacing(4))] [rx:calc(var(--radius)*1.4)] fill-black" />
						</mask>
					</svg>
					<SidebarInset className="md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-1 m-0! rounded-none sm:py-2 sm:pr-2">
						<header className="flex bg-muted h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
							<div className="flex items-center gap-2 px-4">
								<SidebarTrigger className="-ml-1" />
								<Separator orientation="vertical" className="mr-1 my-auto data-[orientation=vertical]:h-4" />
								<Breadcrumb>
									<BreadcrumbList>
										{activeMenu != null && activeMode != null ? (
											<>
												<BreadcrumbItem>
													{dashboardMenuGroups.find(([_, groupMenus]) => groupMenus.includes(activeMenu.key))?.[0]}
												</BreadcrumbItem>
												<BreadcrumbSeparator />
												<BreadcrumbItem>
													{activeMenu.label}
												</BreadcrumbItem>
												<BreadcrumbSeparator />
												<BreadcrumbItem>
													{activeMode.shortLabel}
												</BreadcrumbItem>
											</>
										) : (
											<BreadcrumbItem>
												<BreadcrumbPage>Dashboard</BreadcrumbPage>
											</BreadcrumbItem>
										)}
									</BreadcrumbList>
								</Breadcrumb>
							</div>
						</header>
						{children}
					</SidebarInset>
				</SidebarProvider>
			</DashboardContext.Provider>
		</RedactProvider>
	);
}

export function MenuPage(
	{ title, description, children }:
	{ title: string, description: string, children: ReactNode }
) {
	return (
		<RedactProvider>
			<main className="bg-muted p-4 md:p-6">
				<div className="mb-4 space-y-1">
					<h1 className="text-2xl font-semibold font-sans">{title}</h1>
					<p className="text-muted-foreground text-sm">{description}</p>
				</div>
				<Card>
					<CardContent className="space-y-4">
						{children}
					</CardContent>
				</Card>
			</main>
		</RedactProvider>
	);
}

export function MenuToolbar(
	{ keyword, onKeywordChange, searchPlaceholder, filterCount, onToggleFilter, onToggleColumns, isLoading = false, isMutating = false, rightSlot }:
	{ keyword: string, onKeywordChange: (value: string) => void, searchPlaceholder: string, filterCount: number, onToggleFilter: () => void, onToggleColumns: () => void, isLoading?: boolean, isMutating?: boolean, rightSlot?: ReactNode }
) {
	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row sm:items-center">
				<div className="relative w-full">
					<SearchIcon className="text-muted-foreground absolute top-2 left-2.5 size-4" />
					<Input
						value={keyword}
						onChange={e => onKeywordChange(e.target.value)}
						placeholder={searchPlaceholder}
						className="pl-8"
					/>
				</div>
				<Button variant="outline" type="button" className="shrink-0" onClick={onToggleFilter} disabled={isLoading || isMutating}>
					<FilterIcon />
					Filter
					{filterCount > 0 ? <Badge variant="outline">{filterCount}</Badge> : null}
				</Button>
				<Button variant="outline" type="button" className="shrink-0" onClick={onToggleColumns} disabled={isMutating}>
					<Columns3Icon />
					Columns
				</Button>
			</div>
			<div className="flex items-center gap-3 justify-center">
				{rightSlot}
			</div>
		</div>
	);
}

export function MenuPagination(
	{ pageIndex, totalRequests, hasPreviousPage, hasNextPage, isLoading = false, isMutating = false, onPrevious, onNext, summaryItemLabel = "item(s)" }:
	{ pageIndex: number, totalRequests: number, hasPreviousPage: boolean, hasNextPage: boolean, isLoading?: boolean, isMutating?: boolean, onPrevious: () => void, onNext: () => void, summaryItemLabel?: string }
) {
	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<p className="text-muted-foreground text-sm">Showing page {pageIndex} ({totalRequests} {summaryItemLabel})</p>
			<div className="flex gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={onPrevious}
					disabled={pageIndex <= 1 || !hasPreviousPage || isLoading || isMutating}
				>
					Previous
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={onNext}
					disabled={!hasNextPage || isLoading || isMutating}
				>
					Next
				</Button>
			</div>
		</div>
	);
}

export function useConfigStorage<T = undefined>(
	p: { localStorageKey?: string, updateIfThisSearhParamExists?: string, defaultValue?: undefined }
): [T | undefined, React.Dispatch<React.SetStateAction<T | undefined>>];
export function useConfigStorage<T>(
	p: { localStorageKey?: string, updateIfThisSearhParamExists?: string, defaultValue: T }
): [T, React.Dispatch<React.SetStateAction<T>>];
export function useConfigStorage<T>(
	{ localStorageKey: localStorageKey, updateIfThisSearhParamExists: updateIfThisSearhParamExists, defaultValue }:
	{ localStorageKey?: string, updateIfThisSearhParamExists?: string, defaultValue: T | (() => T) }
): [T, React.Dispatch<React.SetStateAction<T>>] {
	return useState<T>(defaultValue);
}

export type MenuColumnConfigColumn = {
	key: string;
	label: string;
};
export function MenuColumnConfigCard(
	{ open, onOpenChange, columns, columnOrder, onColumnOrderChange, columnsShown, onColumnsShownChange, defaultColumnOrder, defaultColumnsShown, contentOnly = false }:
	{ open: boolean, onOpenChange: (o: boolean) => void, columns: readonly MenuColumnConfigColumn[], columnOrder: string[], onColumnOrderChange: (v: string[]) => void, columnsShown: string[], onColumnsShownChange: (v: string[]) => void, defaultColumnOrder: readonly string[], defaultColumnsShown: readonly string[], contentOnly?: boolean }
) {
	const [draggedColumn, setDraggedColumn] = useState(null as string | null);
	const content = (
		[...new Set([...columnOrder, ...columns.map(column => column.key)])]
			.map(columnKey => columns.find(column => column.key == columnKey)!).map(column => (
				<div
					key={column.key}
					draggable
					onDragStart={() => setDraggedColumn(column.key)}
					onDragOver={e => {
						e.preventDefault();
						if(draggedColumn == null || draggedColumn == column.key) return;
						const draggedIndex = columnOrder.indexOf(draggedColumn);
						if(draggedIndex == -1) return;
						const targetIndex = columnOrder.indexOf(column.key);
						if(targetIndex == -1) return;
						const changedOrder = [...columnOrder];
						const [source] = changedOrder.splice(draggedIndex, 1);
						changedOrder.splice(targetIndex, 0, source);
						onColumnOrderChange(changedOrder);
					}}
					onDragEnd={() => setDraggedColumn(null)}
					onDrop={() => setDraggedColumn(null)}
					className="hover:bg-muted/60 flex h-full min-h-14 items-center gap-3 rounded-lg border px-3 py-1.5 text-left"
				>
					<GripVerticalIcon className="text-muted-foreground size-4 shrink-0" />
					<Checkbox
						checked={columnsShown.includes(column.key)}
						disabled={columnsShown.length == 1 && columnsShown.includes(column.key)}
						onCheckedChange={v => onColumnsShownChange(v != false ? [...new Set([...columnsShown, column.key])] : columnsShown.filter(c => c != column.key))}
					/>
					<div className="min-w-0 flex-1">
						<p className="text-sm font-medium">{column.label}</p>
					</div>
				</div>
			))
	);
	if(contentOnly)
		return content;
	return (
		<Collapsible open={open} onOpenChange={onOpenChange}>
			<CollapsibleContent>
				<div className="space-y-3 rounded-xl border p-4">
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<h3 className="text-sm font-semibold">Configure Columns</h3>
							<p className="text-muted-foreground text-sm">Toggle visibility and drag cards to reorder columns.</p>
						</div>
						<div className="flex items-center gap-2">
							<p className="text-muted-foreground text-sm">Visible {columnsShown.length} of {Object.keys(columns).length}</p>
							<Button type="button" variant="outline" size="sm" onClick={() => { onColumnOrderChange([...defaultColumnOrder]); onColumnsShownChange([...defaultColumnsShown]); }}>
								Reset
							</Button>
						</div>
					</div>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-6">
						{content}
					</div>
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

export type MenuFilterConfigColumn = {
	key: string;
	label: string;
} & ({
	type: "relation";
	relationSearch: (keyword: string, selectedIds: string[]) => Promise<{ id: string, label: React.ReactNode }[]>;
	relationFilterConfigColumn?: never;
} | {
	type: "relation";
	relationSearch?: never;
	relationFilterConfigColumn: () => [string | null, MenuFilterConfigColumn[]];
} | {
	type: "relation_hasMany";
	relationSearch: (keyword: string, selectedIds: string[]) => Promise<{ id: string, label: React.ReactNode }[]>;
	relationFilterConfigColumn?: never;
} | {
	type: "relation_hasMany";
	relationSearch?: never;
	relationFilterConfigColumn: () => [string | null, MenuFilterConfigColumn[]];
} | {
	type: "select";
	selectOptions: { value: any, label: React.ReactNode }[];
} | {
	type: "select_hasMany";
	selectOptions: { value: any, label: React.ReactNode }[];
} | {
	type: "date";
} | {
	type: "date_hasMany";
} | {
	type: "text";
} | {
	type: "text_hasMany";
} | {
	type: "number";
} | {
	type: "number_hasMany";
} | {
	type: "boolean";
} | {
	type: "boolean_hasMany";
});
export type MenuFilterState = {
	columnKey: string;
	operator: string;
	combinator: "and" | "or";
	value: any;
};
const filterOperatorLabels = Object.freeze({
	"equals": "Equals",
	"not_equals": "Not Equals",
	"contains": "Contains",
	"not_contains": "Does Not Contain",
	"in": "Is In",
	"not_in": "Is Not In",
	"exists": "Exists",
	"greater_than": "Is Greater Than",
	"greater_than_equal": "Is Greater Than Or Equal To",
	"less_than": "Is Less Than",
	"less_than_equal": "Is Less Than Or Equal To"
} as Record<string, string>);
const filterTypeOperators = Object.freeze({
	"relation": ["equals", "not_equals", "in", "not_in", "exists"],
	"relation_hasMany": ["equals", "not_equals", "contains", "not_contains", "in", "not_in", "exists"],
	"select": ["equals", "not_equals", "in", "not_in", "exists"],
	"select_hasMany": ["equals", "not_equals", "contains", "not_contains", "in", "not_in", "exists"],
	"date": ["equals", "not_equals", "in", "not_in", "exists", "greater_than", "greater_than_equal", "less_than", "less_than_equal"],
	"date_hasMany": ["equals", "not_equals", "contains", "not_contains", "in", "not_in", "exists"],
	"text": ["equals", "not_equals", "in", "not_in", "exists", "greater_than", "greater_than_equal", "less_than", "less_than_equal"],
	"text_hasMany": ["equals", "not_equals", "contains", "not_contains", "in", "not_in", "exists"],
	"number": ["equals", "not_equals", "in", "not_in", "exists", "greater_than", "greater_than_equal", "less_than", "less_than_equal"],
	"number_hasMany": ["equals", "not_equals", "contains", "not_contains", "in", "not_in", "exists"],
	"boolean": ["equals", "not_equals", "in", "not_in", "exists"],
	"boolean_hasMany": ["equals", "not_equals", "contains", "not_contains", "in", "not_in", "exists"]
} as Record<string, string[]>);
export function MenuFilterConfigCard(
	{ open, onOpenChange, columns, filters, onFiltersChange, disabled = false, contentOnly = false }:
	{ open: boolean, onOpenChange: (o: boolean) => void, columns: readonly MenuFilterConfigColumn[], filters: MenuFilterState[], onFiltersChange: (v: MenuFilterState[]) => void, disabled?: boolean, contentOnly?: boolean }
) {
	const InternalMemoizedSelect = useMemo(() => memo((
		{ options, value, onValueChange, placeholder, disabled = false }:
		{ options: readonly (({ key?: never, value: string } | { key: string, value?: never }) & { label: React.ReactNode })[], value: string | undefined, onValueChange: (v: string | undefined) => void, placeholder?: string, disabled?: boolean }
	) => (
		<Select
			value={value ?? ""}
			onValueChange={v => onValueChange(v != "<clear>" ? v : undefined)}
			disabled={disabled}
		>
			<SelectTrigger className="w-full">
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{options.map(o => (
					<SelectItem key={o.key ?? o.value} value={o.key ?? o.value}>
						{o.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)), []);
	const MemoizedSelect = useMemo(() => ({ options, onValueChange, ...props }: Parameters<typeof InternalMemoizedSelect>[0]) => {
		const onValueChangeRef = useRef(onValueChange);
		onValueChangeRef.current = onValueChange;
		const onValueChangeStable = useCallback((v: string | undefined) => onValueChangeRef.current(v), []);
		const optionsStable = useMemo(() => options, [options.some(o => o.label != null && typeof o.label == "object") ? options : JSON.stringify(options)]);
		return (<InternalMemoizedSelect options={optionsStable} onValueChange={onValueChangeStable} {...props} />);
	}, []);
	const [draftedFilters0, setDraftedFilters] = useState(filters as Partial<MenuFilterState>[]);
	const validFilters = useMemo(() => draftedFilters0.filter((draftedFilter, i): draftedFilter is MenuFilterState => draftedFilter.columnKey != null && draftedFilter.operator != null &&
		(i == 0 || draftedFilter.combinator != null) && draftedFilter.value != null && (!Array.isArray(draftedFilter.value) || draftedFilter.value.every(v => v != null))), [draftedFilters0]);
	const serializedFilters = useMemo(() => JSON.stringify(filters), [filters]);
	const serializedValidFilters = useMemo(() => JSON.stringify(validFilters), [validFilters]);
	const lastSyncedFilters = useRef(serializedFilters);
	useEffect(() => {
		if(serializedFilters == lastSyncedFilters.current) return;
		setDraftedFilters(filters);
		lastSyncedFilters.current = serializedFilters;
	}, [filters, serializedFilters]);
	useEffect(() => {
		if(serializedValidFilters == lastSyncedFilters.current) return;
		lastSyncedFilters.current = serializedValidFilters;
		onFiltersChange(validFilters);
	}, [onFiltersChange, validFilters, serializedValidFilters]);
	const draftedFilters = useMemo(() => {
		if(serializedFilters != lastSyncedFilters.current) return [];
		return draftedFilters0;
	}, [draftedFilters0, serializedFilters]);
	const content = (
		<>
			{draftedFilters.map((draftedFilter, i) => {
				const columnKeys = draftedFilter.columnKey != null ? draftedFilter.columnKey.split(".").map(p => p.length > 0 ? p : null) : [null];
				const draftedFilterPath = columnKeys.reduce((p: ([string | null, MenuFilterConfigColumn | null, [string | null, MenuFilterConfigColumn[]] | null])[], v) =>
					[...p, (c => [v, c, c?.type == "relation" || c?.type == "relation_hasMany" ? c.relationFilterConfigColumn?.() : null] as const)(v != null ? p.at(-1)![2]![1].find(c => c.key == v)! : null)], [[null, null, [null, columns]] as [null, null, [null, MenuFilterConfigColumn[]]]]);
				const lastDraftedFilterColumn = draftedFilterPath.at(-1)![1];
				return (
					<div key={i} className="space-y-3">
						{i > 0 ? (
							<div className="rounded-lg border border-dashed p-2">
								<label className="text-sm font-medium">Combinator with previous filter</label>
								<MemoizedSelect
									options={[{ value: "and", label: "AND" }, { value: "or", label: "OR" }]}
									value={draftedFilter.combinator}
									onValueChange={value => setDraftedFilters(draftedFilters.with(i, { ...draftedFilter, combinator: value as any }))}
									placeholder="Select combinator"
									disabled={disabled}
								/>
							</div>
						) : null}
						<div className="space-y-3 rounded-lg border p-3">
							<div className="flex items-center justify-between">
								<p className="text-sm font-medium">Filter {i + 1}</p>
								<Button type="button" variant="ghost" size="sm" onClick={() => setDraftedFilters(draftedFilters.toSpliced(i, 1))} disabled={disabled}>
									<XIcon />
									Remove
								</Button>
							</div>
							<div className="flex flex-wrap flex-col sm:flex-row gap-3">
								{draftedFilterPath.map(([f, c, cs], j) => cs != null ? (
									<div className="min-w-[120px] flex-1 space-y-2" key={j}>
										<label className="text-sm font-medium">{cs[0] != null ? `${cs[0]} ` : ""}Column</label>
										<MemoizedSelect
											options={cs[1]}
											value={draftedFilterPath[j + 1][0] ?? ""}
											onValueChange={value => setDraftedFilters(draftedFilters.with(i, {
												...draftedFilter,
												columnKey: [...draftedFilterPath.slice(1, j + 1).map(c => c[0]!), value].join(".") +
													(c => (c?.type == "relation" || c?.type == "relation_hasMany") && c.relationFilterConfigColumn?.() != null ? "." : "")(cs[1].find(c => c.key == value)!),
												operator: undefined,
												value: undefined
											}))}
											placeholder="Select column"
											disabled={disabled}
										/>
									</div>
								) : (
									<div className="min-w-[120px] flex-1 space-y-2" key={j}>
										<label className="text-sm font-medium">Operator</label>
										{f == null || c == null ? (
											<Select disabled>
												<SelectTrigger className="w-full">
													<SelectValue placeholder="-" />
												</SelectTrigger>
											</Select>
										) : (
											<MemoizedSelect
												options={filterTypeOperators[c.type].map(ok => ({ key: ok, label: filterOperatorLabels[ok] }))}
												value={draftedFilter.operator ?? ""}
												onValueChange={value => setDraftedFilters(draftedFilters.with(i, { ...draftedFilter, operator: value, value: undefined }))}
												placeholder="Select operator"
												disabled={disabled}
											/>
										)}
									</div>
								))}
							</div>
							<div className="space-y-2" key={`${draftedFilter.columnKey}:${draftedFilter.operator}`}>
								<label className="text-sm font-medium">Filter Value</label>
								{draftedFilter.operator == null || draftedFilter.columnKey == null || lastDraftedFilterColumn == null ? (
									<Select disabled>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="-" />
										</SelectTrigger>
									</Select>
								) : draftedFilter.operator == "exists" ? (
									<MemoizedSelect
										options={[{ value: "true", label: "TRUE" }, { value: "false", label: "FALSE" }]}
										value={draftedFilter.value != null ? draftedFilter.value != "false" ? "true" : "false" : undefined}
										onValueChange={value => setDraftedFilters(draftedFilters.with(i, { ...draftedFilter, value: value != "false" }))}
										placeholder="Select value"
										disabled={disabled}
									/>
								) : ((draftedFilter.operator == "equals" || draftedFilter.operator == "not_equals" || draftedFilter.operator == "greater_than" || draftedFilter.operator == "greater_than_equal" || draftedFilter.operator == "less_than" || draftedFilter.operator == "less_than_equal") &&
									(lastDraftedFilterColumn.type != "relation_hasMany" && lastDraftedFilterColumn.type != "select_hasMany" && lastDraftedFilterColumn.type != "date_hasMany" && lastDraftedFilterColumn.type != "text_hasMany" && lastDraftedFilterColumn.type != "number_hasMany" && lastDraftedFilterColumn.type != "boolean_hasMany")) ? (
										lastDraftedFilterColumn.type == "relation" ? (
											<SearchableSelect
												value={draftedFilter.value}
												onValueChange={value => setDraftedFilters(draftedFilters.with(i, { ...draftedFilter, value: value }))}
												options={[]}
												onSearch={(keyword, selectedValues) => lastDraftedFilterColumn.relationSearch!(keyword, selectedValues).then(vs => vs.map(v => ({ value: v.id, label: v.label })))}
												disabled={disabled}
												placeholder="Search relation value"
											/>
										) : lastDraftedFilterColumn.type == "select" ? (
											<MemoizedSelect
												options={lastDraftedFilterColumn.selectOptions}
												value={draftedFilter.value}
												onValueChange={value => setDraftedFilters(draftedFilters.with(i, { ...draftedFilter, value: value }))}
												placeholder="Select value"
												disabled={disabled}
											/>
										) : lastDraftedFilterColumn.type == "date" ? (
											<DatetimeInput
												className="flex-1"
												mode="datetime"
												value={draftedFilter.value != null ? new Date(draftedFilter.value).toISOString() : undefined}
												onChange={value => setDraftedFilters(draftedFilters.with(i, { ...draftedFilter, value: value }))}
												disabled={disabled}
												placeholder="Select date and time"
												precision="second"
											/>
										) : lastDraftedFilterColumn.type == "text" ? (
											<Input
												value={draftedFilter.value}
												onChange={e => setDraftedFilters(draftedFilters.with(i, { ...draftedFilter, value: e.target.value }))}
												disabled={disabled}
												placeholder="Enter value"
											/>
										) : lastDraftedFilterColumn.type == "number" ? (
											<Input
												type="number"
												value={draftedFilter.value}
												onChange={e => setDraftedFilters(draftedFilters.with(i, { ...draftedFilter, value: e.target.valueAsNumber }))}
												disabled={disabled}
												placeholder="Enter value"
											/>
										) : lastDraftedFilterColumn.type == "boolean" ? (
											<MemoizedSelect
												options={[{ value: "true", label: "TRUE" }, { value: "false", label: "FALSE" }]}
												value={draftedFilter.value != null ? draftedFilter.value != "false" ? "true" : "false" : undefined}
												onValueChange={value => setDraftedFilters(draftedFilters.with(i, { ...draftedFilter, value: value != "false" }))}
												placeholder="Select value"
												disabled={disabled}
											/>
										) : null
									) : draftedFilter.operator == "in" || draftedFilter.operator == "not_in" || ((draftedFilter.operator == "equals" || draftedFilter.operator == "not_equals") && (lastDraftedFilterColumn.type == "relation_hasMany" || lastDraftedFilterColumn.type == "select_hasMany" || lastDraftedFilterColumn.type == "date_hasMany" || lastDraftedFilterColumn.type == "text_hasMany" || lastDraftedFilterColumn.type == "number_hasMany" || lastDraftedFilterColumn.type == "boolean_hasMany")) ? (
										lastDraftedFilterColumn.type == "relation" ? (
											<SearchableMultiSelect
												values={draftedFilter.value}
												onValuesChange={value => setDraftedFilters(draftedFilters.with(i, { ...draftedFilter, value }))}
												options={[]}
												onSearch={(keyword, selectedValues) => lastDraftedFilterColumn.relationSearch!(keyword, selectedValues).then(vs => vs.map(v => ({ value: v.id, label: v.label })))}
												disabled={disabled}
												placeholder="Search relation values"
											/>
										) : (
											<div className="space-y-2">
												<div className="flex items-center justify-between">
													<p className="text-muted-foreground text-xs">Define one or more values.</p>
													<Button
														type="button"
														variant="outline"
														onClick={() => setDraftedFilters(draftedFilters.with(i, { ...draftedFilter, value: [...(draftedFilter.value ?? []), null] }))}
														disabled={disabled}
													>
														<PlusIcon />Add Value
													</Button>
												</div>
												{!Array.isArray(draftedFilter.value) || draftedFilter.value.length == 0 ? (
													<p className="text-muted-foreground text-xs">Click Add Value to create rows.</p>
												) : (
													<div className="space-y-2">
														{draftedFilter.value.map((value, valueIndex) => (
															<div key={valueIndex} className="flex items-start gap-2">
																{lastDraftedFilterColumn.type == "select" ? (
																	<MemoizedSelect
																		options={lastDraftedFilterColumn.selectOptions}
																		value={value}
																		onValueChange={value => setDraftedFilters(draftedFilters.with(i, { ...draftedFilter, value: draftedFilter.value.with(valueIndex, value) }))}
																		placeholder="Select value"
																		disabled={disabled}
																	/>
																) : lastDraftedFilterColumn.type == "date" ? (
																	<DatetimeInput
																		className="flex-1"
																		mode="datetime"
																		value={value != null ? new Date(value).toISOString() : undefined}
																		onChange={value => setDraftedFilters(draftedFilters.with(i, { ...draftedFilter, value: draftedFilter.value.with(valueIndex, Date.parse(value)) }))}
																		disabled={disabled}
																		placeholder="Select date and time"
																		precision="second"
																	/>
																) : lastDraftedFilterColumn.type == "text" ? (
																	<Input
																		value={value}
																		onChange={e => setDraftedFilters(draftedFilters.with(i, { ...draftedFilter, value: draftedFilter.value.with(valueIndex, e.target.value) }))}
																		disabled={disabled}
																		placeholder="Enter value"
																	/>
																) : lastDraftedFilterColumn.type == "number" ? (
																	<Input
																		type="number"
																		value={value}
																		onChange={e => setDraftedFilters(draftedFilters.with(i, { ...draftedFilter, value: draftedFilter.value.with(valueIndex, e.target.valueAsNumber) }))}
																		disabled={disabled}
																		placeholder="Enter value"
																	/>
																) : lastDraftedFilterColumn.type == "boolean" ? (
																	<MemoizedSelect
																		options={[{ value: "true", label: "TRUE" }, { value: "false", label: "FALSE" }]}
																		value={value != null ? value != "false" ? "true" : "false" : undefined}
																		onValueChange={value => setDraftedFilters(draftedFilters.with(i, { ...draftedFilter, value: draftedFilter.value.with(valueIndex, value) }))}
																		placeholder="Select value"
																		disabled={disabled}
																	/>
																) : null}
																<Button
																	type="button"
																	variant="outline"
																	className="shrink-0"
																	onClick={() => setDraftedFilters(draftedFilters.with(i, { ...draftedFilter, value: draftedFilter.value.toSpliced(valueIndex, 1) }))}
																	disabled={disabled}
																>
																	<XIcon />Remove
																</Button>
															</div>
														))}
													</div>
												)}
											</div>
										)
									) : null}
							</div>
						</div>
					</div>
				);
			})}
			<Button type="button" variant="outline" onClick={() => setDraftedFilters([...draftedFilters, {}])} disabled={disabled}>
				<PlusIcon />
				Add Filter
			</Button>
		</>
	);
	if(contentOnly)
		return content;
	return (
		<Collapsible open={open} onOpenChange={onOpenChange}>
			<CollapsibleContent>
				<div className="space-y-3 rounded-xl border p-4">
					<div className="flex items-center justify-between gap-2">
						<div className="space-y-1">
							<h3 className="text-sm font-semibold">Configure Filters</h3>
							<p className="text-muted-foreground text-sm">Build multiple filters and combine them with AND or OR.</p>
						</div>
						{draftedFilters.length > 0 ? (
							<Button type="button" variant="outline" size="sm" onClick={() => setDraftedFilters([])} disabled={disabled}>Clear Filter</Button>
						) : null}
					</div>
					{content}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}
export function MenuFilterSummary(
	{ columns, filters, contentOnly = false }:
	{ columns: readonly MenuFilterConfigColumn[], filters: MenuFilterState[], contentOnly?: boolean }
) {
	const content = filters.map((filter, i) => {
		const columnKeys = filter.columnKey.split(".").map(p => p.length > 0 ? p : null);
		const filterPath = columnKeys.reduce((p: ([string | null, MenuFilterConfigColumn | null, [string | null, MenuFilterConfigColumn[]] | null])[], v) =>
			[...p, (c => [v, c, c?.type == "relation" || c?.type == "relation_hasMany" ? c.relationFilterConfigColumn?.() : null] as const)(v != null ? p.at(-1)![2]![1].find(c => c.key == v)! : null)], [[null, null, [null, columns]] as [null, null, [null, MenuFilterConfigColumn[]]]]);
		return (
			<span key={i} className="inline-flex items-center gap-1.5 text-xs">
				{i > 0 ? (
					<span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide">
						{filter.combinator}
					</span>
				) : null}
				<span className="bg-background rounded border px-2 py-0.5">
					<span className="font-semibold">
						{filterPath.slice(1).map(c => c[1]!.label).join(" → ")}
					</span>
					<span className="text-muted-foreground mx-1 italic">
						{filterOperatorLabels[filter.operator]}
					</span>
					<span className="font-mono text-[11px]">
						{Array.isArray(filter.value) ? filter.value.map(v => `${v}`).join(", ") : `${filter.value}`}
					</span>
				</span>
			</span>
		);
	});
	if(contentOnly) {
		if(content.length > 0)
			return content;
		return (
			<span className="bg-background rounded border px-2 py-0.5 text-xs">
				<span className="text-muted-foreground mx-1 italic">
					No value
				</span>
			</span>
		);
	}
	if(content.length == 0)
		return null;
	return (
		<div className="rounded-lg border border-dashed px-3 py-2">
			<p className="text-muted-foreground font-medium">Active filters</p>
			<div className="mt-1.5 flex flex-wrap items-center gap-1.5">
				{content}
			</div>
		</div>
	);
}
export type MenuTableConfigColumn = {
	key: string;
	label: string;
	sortable: boolean;
	className?: string;
};
export function DashboardMenuTable<T>(
	{ columns, columnsSort, onColumnsSortChange, columnOrder, columnsShown, rows, renderCell, isLoading = false, isMutating = false }:
	{ columns: readonly MenuTableConfigColumn[], columnsSort: [string, boolean][], onColumnsSortChange: (v: [string, boolean][]) => void, columnOrder: string[], columnsShown: string[], rows: T[], renderCell: (row: T, columnKey: string) => React.ReactNode, isLoading?: boolean, isMutating?: boolean }
) {
	const MemoizedRow = useMemo(() => memo((
		{ row, orderedShownColumns, renderCell }:
		{ row: T, orderedShownColumns: MenuTableConfigColumn[], renderCell: (row: T, columnKey: string) => React.ReactNode }
	) => (
		<TableRow>
			{orderedShownColumns.map(column => (
				<TableCell key={column.key} className={cn("whitespace-normal", column.className)}>
					{renderCell(row, column.key)}
				</TableCell>
			))}
		</TableRow>
	)), []);
	const orderedShownColumns = useMemo(() => columnOrder.filter(columnKey => columnsShown.includes(columnKey))
		.map(columnKey => columns.find(column => column.key == columnKey)!), [columns, columnOrder, columnsShown]);
	return (
		<div className="rounded-xl border">
			<Table>
				<TableHeader>
					<TableRow>
						{orderedShownColumns.map(column => {
							const columnSortIndex = columnsSort.findIndex(([columnKey]) => columnKey == column.key);
							return (
								<TableHead key={column.key}>
									{column.sortable ? (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="-ml-2 h-7 gap-1 px-2"
											onClick={() => onColumnsSortChange(
												columnSortIndex == -1 ? [...columnsSort, [column.key, true] as const] :
													columnsSort[columnSortIndex][1] ? columnsSort.with(columnSortIndex, [column.key, false] as const) :
														columnsSort.toSpliced(columnSortIndex, 1)
											)}
											disabled={isLoading || isMutating}
										>
											{column.label}
											{columnSortIndex == -1 ? (
												<ArrowUpDownIcon className="text-muted-foreground size-3.5" />
											) : columnsSort[columnSortIndex][1] ? (
												<ArrowUpIcon className="size-3.5" />
											) : (
												<ArrowDownIcon className="size-3.5" />
											)}
										</Button>
									) : column.label}
								</TableHead>
							);
						})}
					</TableRow>
				</TableHeader>
				<TableBody>
					{isLoading ? (
						<TableRow>
							<TableCell colSpan={columnsShown.length} className="text-muted-foreground py-8 text-center">
								Loading...
							</TableCell>
						</TableRow>
					) : rows.length == 0 ? (
						<TableRow>
							<TableCell colSpan={columnsShown.length} className="text-muted-foreground py-8 text-center">
								No data found.
							</TableCell>
						</TableRow>
					) : null}
					{rows.map((row, i) => (
						<MemoizedRow
							key={(row as any).id ?? i}
							row={row}
							orderedShownColumns={orderedShownColumns}
							renderCell={renderCell}
						/>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
export type MenuRowValueRendererConfigColumn<R, C> =
	NonNullable<{
		[K in keyof R]: {
			key: K;
			property?: string;
			render?: (value: R[K], row: R, context: C) => React.ReactNode;
		} & ({
			type: "relation";
			render: (value: R[K], row: R, context: C) => React.ReactNode;
		} | {
			type: "relation_hasMany";
			render: (value: R[K], row: R, context: C) => React.ReactNode;
		} | {
			type: "richText";
		} | {
			type: "null";
		} | {
			type: "select";
			selectOptions?: { value: any, label: React.ReactNode }[];
		} | {
			type: "select_hasMany";
			selectOptions?: { value: any, label: React.ReactNode }[];
		} | {
			type: "date";
		} | {
			type: "date_hasMany";
		} | {
			type: "text";
		} | {
			type: "text_hasMany";
		} | {
			type: "number";
		} | {
			type: "number_hasMany";
		} | {
			type: "boolean";
		} | {
			type: "boolean_hasMany";
		})
	}[keyof R] |
	{
		key: `#${string}`;
		property?: string;
		render?: (value: null, row: R, context: C) => React.ReactNode;
	} & ({
		type: "relation";
		render: (value: null, row: R, context: C) => React.ReactNode;
	} | {
		type: "relation_hasMany";
		render: (value: null, row: R, context: C) => React.ReactNode;
	} | {
		type: "richText";
	} | {
		type: "null";
	} | {
		type: "select";
		selectOptions?: { value: any, label: React.ReactNode }[];
	} | {
		type: "select_hasMany";
		selectOptions?: { value: any, label: React.ReactNode }[];
	} | {
		type: "date";
	} | {
		type: "date_hasMany";
	} | {
		type: "text";
	} | {
		type: "text_hasMany";
	} | {
		type: "number";
	} | {
		type: "number_hasMany";
	} | {
		type: "boolean";
	} | {
		type: "boolean_hasMany";
	})>;
export type MenuRowValueRendererContext = {
	richTextCard?: boolean;
	richTextClamp?: boolean;
	richTextClassName?: string;
	richTextContentClassName?: string;
	richTextPlaceholderClassName?: string;
};
export function useMenuRowValueRenderer<R, C extends MenuRowValueRendererContext = object>(
	{ columns, detailsTriggerColumnKey, onOpenDetails, context }:
	{ columns: readonly MenuRowValueRendererConfigColumn<R, C | undefined>[], detailsTriggerColumnKey?: string, onOpenDetails?: (row: R) => void, context?: undefined }
): (row: R, columnKey: string) => React.ReactNode;
export function useMenuRowValueRenderer<R, C extends MenuRowValueRendererContext>(
	{ columns, detailsTriggerColumnKey, onOpenDetails, context }:
	{ columns: readonly MenuRowValueRendererConfigColumn<R, C>[], detailsTriggerColumnKey?: string, onOpenDetails?: (row: R) => void, context: C }
): (row: R, columnKey: string) => React.ReactNode;
export function useMenuRowValueRenderer<R, C extends MenuRowValueRendererContext>(
	{ columns, detailsTriggerColumnKey, onOpenDetails, context }:
	{ columns: readonly MenuRowValueRendererConfigColumn<R, C>[], detailsTriggerColumnKey?: string, onOpenDetails?: (row: R) => void, context: C }
) {
	const onOpenDetailsRef = useRef(onOpenDetails);
	onOpenDetailsRef.current = onOpenDetails;
	const contextLastRef = useRef(context);
	const contextChangeCountRef = useRef(0);
	if(
		(contextLastRef.current != context) && (
			contextLastRef.current == null || context == null ||
			Object.entries(contextLastRef.current).some(([k, v]) => !(k in context) || context[k] != v) ||
			Object.entries(context).some(([k, v]) => !(k in contextLastRef.current) || contextLastRef.current[k] != v)
		)
	) {
		contextLastRef.current = context;
		contextChangeCountRef.current++;
	}
	return useCallback((row: R, columnKey: string) => {
		const column = columns.find(column => column.key == columnKey)!;
		const value = row[column.property ?? columnKey];
		const richTextCard = context.richTextCard ?? true;
		const richTextClamp = context.richTextClamp ?? false;
		const node = column.render != null ? column.render(value, row, context) : (
			column.type == "richText" ? (
				<RichTextPreview
					serializedState={value}
					className={cn(!richTextCard ? "bg-transparent shadow-none border-none rounded-none" : null, context.richTextClassName)}
					contentClassName={cn("min-h-8", !richTextCard ? "p-0" : null, richTextClamp ? "line-clamp-2 max-h-28" : null, context.richTextContentClassName)}
					placeholderClassName={cn(!richTextCard ? "p-0" : null, context.richTextPlaceholderClassName)}
				/>
			) :
				column.type == "null" ? null :
					value == null ? "-" :
						column.type == "select" ? column.selectOptions?.find(option => option.value == value)?.label ?? value :
							column.type == "select_hasMany" ? (
								<ul className="inline">
									{value.map((v, i) => (
										<li key={i} className="inline not-last:after:content-[',_']">
											{column.selectOptions?.find(option => option.value == v)?.label ?? value}
										</li>
									))}
								</ul>
							) :
								column.type == "date" ? `${new Date(value).toLocaleString()}` :
									column.type == "date_hasMany" ? (<ul>{value.map((v, i) => (<li key={i}>{`${new Date(value).toLocaleString()}`}</li>))}</ul>) :
										column.type == "text" ? `${value}` :
											column.type == "text_hasMany" ? (<ul>{value.map((v, i) => (<li key={i}>{`${v}`}</li>))}</ul>) :
												column.type == "number" ? `${value}` :
													column.type == "number_hasMany" ? (<ul>{value.map((v, i) => (<li key={i}>{`${v}`}</li>))}</ul>) :
														column.type == "boolean" ? <Switch checked={value} disabled /> :
															column.type == "boolean_hasMany" ? (<ul>{value.map((v, i) => (<li key={i}><Switch checked={v} disabled /></li>))}</ul>) :
																null
		);
		if(detailsTriggerColumnKey != columnKey)
			return node;
		return (
			<Button
				type="button"
				variant="link"
				onClick={() => onOpenDetailsRef.current?.(row)}
				className="text-primary h-auto p-0 text-left whitespace-normal select-auto"
			>
				{node}
			</Button>
		);
	}, [columns, detailsTriggerColumnKey, contextChangeCountRef.current]);
}
export const defaultChangeRequestRenderer = () =>
	(value: string | null | undefined, row, { setChangeRequestDrawerRow, setChangeRequestDrawerOpen }) => (
		<Button
			type="button"
			variant="link"
			onClick={() => { setChangeRequestDrawerRow(row); setChangeRequestDrawerOpen(true); }}
			className="text-primary h-auto p-0 select-auto"
		>
			{changeRequestTypeSelectOptions.find(option => option.value == value)?.label ?? "-"}
		</Button>
	);
export const defaultStatusRenderer = () =>
	(_, row: { reviewedAt?: string, reviewApproved?: boolean }) => (
		row.reviewedAt == null ? (
			<Badge variant="secondary">Pending</Badge>
		) : row.reviewApproved != false ? (
			<Badge variant="default">Approved</Badge>
		) : (
			<Badge variant="destructive">Rejected</Badge>
		)
	);
