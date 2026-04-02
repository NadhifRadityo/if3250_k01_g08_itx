"use client";

import { usePathname } from "next/navigation";
import { UsersIcon, LogOutIcon, ChevronRightIcon, ChevronsUpDownIcon } from "lucide-react";

import useIsMobile from "@/utils/useIsMobile";
import { Link } from "@/components/Link";
import { Avatar, AvatarFallback } from "@/components/radix/Avatar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/radix/Breadcrumb";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/radix/Collapsible";
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/radix/DropdownMenu";
import { Separator } from "@/components/radix/Separator";
import { Sidebar, SidebarMenu, SidebarRail, SidebarGroup, SidebarInset, SidebarFooter, SidebarHeader, SidebarContent, SidebarMenuSub, SidebarTrigger, SidebarMenuItem, SidebarProvider, SidebarGroupLabel, SidebarMenuButton, SidebarMenuSubItem, SidebarMenuSubButton } from "@/components/radix/Sidebar";

import { logoutAction } from "./layout.actions";

const operationManagementSidebarItems = [
	{
		label: "User Management",
		href: "/user-management"
	},
	{
		label: "Team Management",
		href: "/team-management"
	},
	{
		label: "Credit Application Management",
		href: "/credit-application-management"
	}
] as const satisfies Array<{ label: string, href: string }>;

export function DashboardShell({ user, children }: { user: PayloadCollectionType<"users", { id: true, name: true, email: true }>, children: React.ReactNode }) {
	const pathname = usePathname();
	const isMobile = useIsMobile();
	return (
		<SidebarProvider>
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
							<Collapsible asChild defaultOpen={pathname == "/user-management"} className="group/collapsible">
								<SidebarMenuItem>
									<CollapsibleTrigger asChild>
										<SidebarMenuButton tooltip="Managements">
											<UsersIcon />
											<span>Managements</span>
											<ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
										</SidebarMenuButton>
									</CollapsibleTrigger>
									<CollapsibleContent>
										<SidebarMenuSub>
											{operationManagementSidebarItems.map(item => (
												<SidebarMenuSubItem key={item.href}>
													<SidebarMenuSubButton asChild isActive={item.href == pathname}>
														<Link href={item.href}>
															<span>{item.label}</span>
														</Link>
													</SidebarMenuSubButton>
												</SidebarMenuSubItem>
											))}
										</SidebarMenuSub>
									</CollapsibleContent>
								</SidebarMenuItem>
							</Collapsible>
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
							{operationManagementSidebarItems.some(item => item.href == pathname) ? (
								<BreadcrumbList>
									<BreadcrumbItem className="hidden md:block">
										Operations
									</BreadcrumbItem>
									<BreadcrumbSeparator className="hidden md:block" />
									<BreadcrumbItem className="hidden md:block">
										Managements
									</BreadcrumbItem>
									<BreadcrumbSeparator className="hidden md:block" />
									<BreadcrumbItem>
										<BreadcrumbPage>{operationManagementSidebarItems.find(item => item.href == pathname)?.label ?? ""}</BreadcrumbPage>
									</BreadcrumbItem>
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
