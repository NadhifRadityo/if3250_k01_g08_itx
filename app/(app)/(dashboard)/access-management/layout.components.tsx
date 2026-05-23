"use client";

import React, { useContext, createContext, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Link } from "@/components/Link";
import { Tabs, TabsList, TabsTrigger } from "@/components/radix/Tabs";

import { getTabContextAction } from "./layout.actions";
import { tabMenuKeys, tabMenuLabels } from "./layout.shared";

const TabContext = createContext<Awaited<ReturnType<typeof getTabContextAction>> | null>(null);
export function useTabContext() {
	return useContext(TabContext)!;
}
export function TabShell(
	{ initialContext, children }:
	{ initialContext: Awaited<ReturnType<typeof getTabContextAction>>, children: ReactNode }
) {
	const context = useQuery({
		queryKey: ["access-management", "tab-context"],
		queryFn: async () => await getTabContextAction(),
		initialData: initialContext,
		staleTime: 60000,
		gcTime: 120000
	}).data;
	const pathname = usePathname();
	const activeSlug = tabMenuKeys.find(key => pathname.startsWith(`/access-management/${key}`));

	return (
		<TabContext.Provider value={context}>
			<div className="flex flex-col">
				<Tabs value={activeSlug ?? ""}>
					<TabsList className="mx-4 mt-2">
						{(context?.menus ?? []).map(menuKey => (
							<TabsTrigger key={menuKey} value={menuKey} asChild>
								<Link href={`/access-management/${menuKey}`}>
									{tabMenuLabels[menuKey]}
								</Link>
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
				{children}
			</div>
		</TabContext.Provider>
	);
}
