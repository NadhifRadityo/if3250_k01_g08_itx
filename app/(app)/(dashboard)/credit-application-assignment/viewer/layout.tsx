import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getDashboardShellContextAction } from "../../layout.actions";

export default async function Layout({ children }: { children: ReactNode }) {
	const dashboardContext = await getDashboardShellContextAction();
	if(dashboardContext == null) return redirect("/login");
	const thisMenu = dashboardContext.menus.find(menu => menu.key == "credit-application-assignment");
	if(thisMenu == null) return redirect("/");
	const thisMode = thisMenu.modes["viewer"];
	if(thisMode == null) return redirect(thisMenu.modes[thisMenu.defaultMode].href);
	return children;
}
