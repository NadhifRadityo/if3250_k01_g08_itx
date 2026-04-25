"use client";

import { useMemo, useState, useEffect, type ReactNode, type ChangeEvent } from "react";
import { usePathname } from "next/navigation";
import { UsersIcon, FilterIcon, LogOutIcon, SearchIcon, UserCogIcon, Columns3Icon, FileTextIcon, ShieldCheckIcon, ChevronRightIcon, ChevronsUpDownIcon } from "lucide-react";

import useIsMobile from "@/utils/useIsMobile";
import { Link } from "@/components/Link";
import { Avatar, AvatarFallback } from "@/components/radix/Avatar";
import { Badge } from "@/components/radix/Badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/radix/Breadcrumb";
import { Button } from "@/components/radix/Button";
import { Card, CardContent } from "@/components/radix/Card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/radix/Collapsible";
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/radix/DropdownMenu";
import { Input } from "@/components/radix/Input";
import { Separator } from "@/components/radix/Separator";
import { Sidebar, SidebarMenu, SidebarRail, SidebarGroup, SidebarInset, SidebarFooter, SidebarHeader, SidebarContent, SidebarMenuSub, SidebarTrigger, SidebarMenuItem, SidebarProvider, SidebarGroupLabel, SidebarMenuButton, SidebarMenuSubItem, SidebarMenuSubButton } from "@/components/radix/Sidebar";

import { logoutAction } from "./layout.actions";
import type { DashboardMode, DashboardManagementKey, DashboardManagementNavigationItem } from "./layout.actions";

const managementPathRegex = /^\/(user-management|role-management|team-management|credit-application-management|credit-application-assignment)(?:\/(viewer|editor|approver|import-viewer|import-editor|import-approver))?$/;

function parseManagementPath(pathname: string): { key: DashboardManagementKey, mode: DashboardMode | null } | null {
	const match = pathname.match(managementPathRegex);
	if(match == null)
		return null;

	const key = match[1] as DashboardManagementKey;
	const mode = (match[2] as DashboardMode | undefined) ?? null;
	return { key, mode };
}

function getManagementIcon(key: DashboardManagementKey) {
	if(key == "user-management")
		return UserCogIcon;
	if(key == "role-management")
		return ShieldCheckIcon;
	if(key == "credit-application-management")
		return FileTextIcon;
	if(key == "credit-application-assignment")
		return FileTextIcon;
	return UsersIcon;
}

function isManagementItemActive(pathname: string, item: DashboardManagementNavigationItem): boolean {
	return pathname == item.baseHref || pathname.startsWith(`${item.baseHref}/`);
}

function getBreadcrumbModel(pathname: string, managementNavigation: DashboardManagementNavigationItem[]): {
	managementLabel: string | null;
	modeLabel: string | null;
	isCreditApplication: boolean;
} {
	if(pathname == "/credit-application-management")
		return { managementLabel: "Credit Application Management", modeLabel: null, isCreditApplication: true };

	const parsedPath = parseManagementPath(pathname);
	if(parsedPath == null)
		return { managementLabel: null, modeLabel: null, isCreditApplication: false };

	const item = managementNavigation.find(candidate => candidate.key == parsedPath.key);
	if(item == null)
		return { managementLabel: null, modeLabel: null, isCreditApplication: false };

	const modeLabel = item.hasSubmenu && parsedPath.mode != null ? item.links.find(link => link.mode == parsedPath.mode)?.label ?? null : null;
	return {
		managementLabel: item.label,
		modeLabel,
		isCreditApplication: false
	};
}

export function DashboardManagementPageFrame({ title, description, children }: { title: string, description: string, children: ReactNode }) {
	return (
		<main className="bg-muted/30 p-4 md:p-6">
			<div className="mb-4 space-y-1">
				<h1 className="text-2xl font-semibold font-serif">{title}</h1>
				<p className="text-muted-foreground text-sm">{description}</p>
			</div>
			<Card>
				<CardContent className="space-y-4">
					{children}
				</CardContent>
			</Card>
		</main>
	);
}

export function DashboardManagementToolbar({
	keyword,
	onKeywordChange,
	searchPlaceholder,
	filterCount,
	onToggleFilter,
	onToggleColumns,
	isLoading,
	isMutating,
	rightSlot
}: {
	keyword: string;
	onKeywordChange: (value: string) => void;
	searchPlaceholder: string;
	filterCount: number;
	onToggleFilter: () => void;
	onToggleColumns: () => void;
	isLoading: boolean;
	isMutating: boolean;
	rightSlot?: ReactNode;
}) {
	const handleKeywordChange = (event: ChangeEvent<HTMLInputElement>) => {
		onKeywordChange(event.target.value);
	};

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row sm:items-center">
				<div className="relative w-full">
					<SearchIcon className="text-muted-foreground absolute top-2 left-2.5 size-4" />
					<Input
						value={keyword}
						onChange={handleKeywordChange}
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

export function DashboardManagementPagination({
	pageIndex,
	totalRequests,
	hasPreviousPage,
	hasNextPage,
	isLoading,
	isMutating,
	onPrevious,
	onNext
}: {
	pageIndex: number;
	totalRequests: number;
	hasPreviousPage: boolean;
	hasNextPage: boolean;
	isLoading: boolean;
	isMutating: boolean;
	onPrevious: () => void;
	onNext: () => void;
}) {
	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<p className="text-muted-foreground text-sm">Showing page {pageIndex} ({totalRequests} request(s))</p>
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

export function DashboardShell({
	user,
	managementNavigation,
	children
}: {
	user: { id: string, name: string, email: string };
	managementNavigation: DashboardManagementNavigationItem[];
	children: ReactNode;
}) {
	const pathname = usePathname();
	const isMobile = useIsMobile();
	const breadcrumbModel = useMemo(() => getBreadcrumbModel(pathname, managementNavigation), [managementNavigation, pathname]);
	const [openSubmenuKeys, setOpenSubmenuKeys] = useState<Partial<Record<DashboardManagementKey, boolean>>>({});

	useEffect(() => {
		const activeSubmenuItem = managementNavigation.find(item => item.hasSubmenu && isManagementItemActive(pathname, item));
		setOpenSubmenuKeys(previous => {
			const next: Partial<Record<DashboardManagementKey, boolean>> = {};
			for(const item of managementNavigation) {
				if(!item.hasSubmenu)
					continue;
				next[item.key] = previous[item.key] ?? false;
			}

			if(activeSubmenuItem != null)
				next[activeSubmenuItem.key] = true;

			return next;
		});
	}, [managementNavigation, pathname]);

	return (
		<SidebarProvider className="[--sidebar-width:20rem]!">
			<Sidebar collapsible="icon" variant="inset">
				<SidebarHeader>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
								<Link href="/">
									<span className="text-base font-semibold">PT. Intelix Global Crossing</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Operations</SidebarGroupLabel>
						<SidebarMenu>
							{managementNavigation.map(item => {
								const Icon = getManagementIcon(item.key);
								const isActive = isManagementItemActive(pathname, item);

								if(!item.hasSubmenu) {
									return (
										<SidebarMenuItem key={item.baseHref}>
											<SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
												<Link href={item.defaultHref}>
													<Icon />
													<span>{item.label}</span>
												</Link>
											</SidebarMenuButton>
										</SidebarMenuItem>
									);
								}

								return (
									<Collapsible
										key={item.baseHref}
										asChild
										open={openSubmenuKeys[item.key] ?? false}
										onOpenChange={open => setOpenSubmenuKeys(previous => ({ ...previous, [item.key]: open }))}
										className="group/collapsible"
									>
										<SidebarMenuItem>
											<CollapsibleTrigger asChild>
												<SidebarMenuButton tooltip={item.label} isActive={isActive}>
													<Icon />
													<span>{item.label}</span>
													<ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
												</SidebarMenuButton>
											</CollapsibleTrigger>
											<CollapsibleContent>
												<SidebarMenuSub>
													{item.links.map(link => (
														<SidebarMenuSubItem key={link.href}>
															<SidebarMenuSubButton asChild isActive={pathname == link.href}>
																<Link href={link.href}>
																	<span>{link.label}</span>
																</Link>
															</SidebarMenuSubButton>
														</SidebarMenuSubItem>
													))}
												</SidebarMenuSub>
											</CollapsibleContent>
										</SidebarMenuItem>
									</Collapsible>
								);
							})}
						</SidebarMenu>
					</SidebarGroup>
				</SidebarContent>
				<SidebarFooter>
					<SidebarMenu>
						<SidebarMenuItem>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
										<Avatar className="h-8 w-8 rounded-lg">
											<AvatarFallback className="rounded-lg">{user.name.split(/\s+/g).slice(0, 2).map(w => w.charAt(0)).join("")}</AvatarFallback>
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
											<Avatar className="h-8 w-8 rounded-lg">
												<AvatarFallback className="rounded-lg">{user.name.split(/\s+/g).slice(0, 2).map(w => w.charAt(0)).join("")}</AvatarFallback>
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
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
					<div className="flex items-center gap-2 px-4">
						<SidebarTrigger className="-ml-1" />
						<Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
						<Breadcrumb>
							{breadcrumbModel.managementLabel != null || breadcrumbModel.isCreditApplication ? (
								<BreadcrumbList>
									<BreadcrumbItem className="hidden md:block">
										Operations
									</BreadcrumbItem>
									<BreadcrumbSeparator className="hidden md:block" />
									<BreadcrumbItem>
										<BreadcrumbPage>{breadcrumbModel.managementLabel ?? "Credit Application Management"}</BreadcrumbPage>
									</BreadcrumbItem>
									{breadcrumbModel.modeLabel != null ? (
										<>
											<BreadcrumbSeparator className="hidden md:block" />
											<BreadcrumbItem className="hidden md:block">
												<BreadcrumbPage>{breadcrumbModel.modeLabel}</BreadcrumbPage>
											</BreadcrumbItem>
										</>
									) : null}
								</BreadcrumbList>
							) : (
								<BreadcrumbList>
									<BreadcrumbItem>
										<BreadcrumbPage>Dashboard</BreadcrumbPage>
									</BreadcrumbItem>
								</BreadcrumbList>
							)}
						</Breadcrumb>
					</div>
				</header>
				{children}
			</SidebarInset>
		</SidebarProvider>
	);
}
