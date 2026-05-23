"use client";

import React, { useMemo } from "react";
import { usePathname } from "next/navigation";
import { redirect } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Link } from "@/components/Link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/radix/Tabs";

import { useDashboardContext } from "../layout.components";
import { getTabContextAction } from "./layout.actions";
import { tabMenuKeys, dashboardMenuLabels } from "./layout.shared";

export function AccessManagementShell(
	{ initialContext, children }:
	{ initialContext: Awaited<ReturnType<typeof getTabContextAction>>, children: React.ReactNode }
) {
	const context = useQuery({
		queryKey: ["access-management", "tab-context"],
		queryFn: async () => await getTabContextAction(),
		initialData: initialContext,
		staleTime: 60000,
		gcTime: 120000
	}).data;
	if(context == null)
		return redirect("/login");
	const { menus } = context;
	const pathname = usePathname();
	const activeTab = useMemo(() => {
		for(const menu of menus) {
			if(pathname.startsWith(`/access-management/${menu}`))
				return menu;
		}
		return menus[0] ?? null;
	}, [menus, pathname]);

	if(menus.length == 0)
		return redirect("/");

	return (
		<Tabs value={activeTab ?? undefined} className="flex-1">
			<div className="bg-muted px-4 pt-4 md:px-6 md:pt-6">
				<div className="mb-4 space-y-1">
					<h1 className="text-2xl font-semibold font-sans">Access Management</h1>
					<p className="text-muted-foreground text-sm">Manage data access rules and field masking configurations.</p>
				</div>
				<TabsList variant="line">
					{menus.map(menu => (
						<TabsTrigger key={menu} value={menu} asChild>
							<Link href={`/access-management/${menu}`}>
								{dashboardMenuLabels[menu]}
							</Link>
						</TabsTrigger>
					))}
				</TabsList>
			</div>
			{menus.map(menu => (
				<TabsContent key={menu} value={menu}>
					{activeTab == menu ? children : null}
				</TabsContent>
			))}
		</Tabs>
	);
}
