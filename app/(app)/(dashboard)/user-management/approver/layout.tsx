import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getDashboardContextAction } from "../../layout.actions";

export default async function Layout({ children }: { children: ReactNode }) {
	const dashboardContext = await getDashboardContextAction();
	if(dashboardContext == null) return redirect("/login");
	const thisMenu = dashboardContext.menus.find(menu => menu.key == "user-management");
	if(thisMenu == null) return redirect("/");
	const thisMode = thisMenu.modes["approver"];
	if(thisMode == null) return redirect(thisMenu.modes[thisMenu.defaultMode].href);
	return children;
}
