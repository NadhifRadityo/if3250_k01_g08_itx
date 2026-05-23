import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection as nextConnection } from "next/server";

import { getDashboardContextAction } from "../layout.actions";
import { getTabContextAction } from "./layout.actions";
import { TabShell } from "./layout.components";

async function SuspensedLayout({ children }: { children: React.ReactNode }) {
	await nextConnection();
	const dashboardContext = await getDashboardContextAction();
	if(dashboardContext == null)
		return redirect("/login");
	const tabContext = await getTabContextAction();
	if(tabContext == null)
		return redirect("/login");
	const thisMenu = dashboardContext.menus.find(menu => menu.key == "access-management");
	if(thisMenu == null)
		return redirect("/");

	return (
		<TabShell initialContext={tabContext}>
			{children}
		</TabShell>
	);
}
export default async function Layout({ children }: { children: React.ReactNode }) {
	return (
		<Suspense>
			<SuspensedLayout>
				{children}
			</SuspensedLayout>
		</Suspense>
	);
}
