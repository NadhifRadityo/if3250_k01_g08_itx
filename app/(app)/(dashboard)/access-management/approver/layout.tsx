import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { uwsa } from "@/utils/actions";

import { getDashboardContextAction } from "../../layout.actions";

export default async function Layout({ children }: { children: ReactNode }) {
	const dashboardContext = await uwsa(getDashboardContextAction)();
	if(dashboardContext == null) return redirect("/login");
	const thisMenu = dashboardContext.menus.find(menu => menu.key == "access-management");
	if(thisMenu == null) return redirect("/");
	const thisMode = thisMenu.modes["approver"];
	if(thisMode == null) return redirect(thisMenu.modes[thisMenu.defaultMode].href);
	return children;
}
