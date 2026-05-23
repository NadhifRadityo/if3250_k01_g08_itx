import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getDashboardContextAction } from "../../../layout.actions";
import { getTabContextAction } from "../../layout.actions";
import { tabMenuKeys } from "../../layout.shared";

export default async function Layout({ children, params }: { children: ReactNode, params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const tabContext = await getTabContextAction();
	if(tabContext == null) return redirect("/login");
	if(!tabContext.menus.includes(slug as typeof tabMenuKeys[number])) return redirect("/");
	const dashboardContext = await getDashboardContextAction();
	if(dashboardContext == null) return redirect("/login");
	const thisMenu = dashboardContext.menus.find(menu => menu.key == slug);
	if(thisMenu == null) return redirect("/");
	const editorMode = thisMenu.modes["editor"];
	if(editorMode != null) return redirect(`/access-management/${slug}/editor`);
	const thisMode = thisMenu.modes["viewer"];
	if(thisMode == null) return redirect("/");
	return children;
}
