import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getDashboardContextAction } from "../../layout.actions";

export default async function Layout({ children }: { children: ReactNode }) {
	const dashboardContext = await getDashboardContextAction();
	if(dashboardContext == null) return redirect("/login");
	const thisMenu = dashboardContext.menus.find(menu => menu.key == "access-management");
	if(thisMenu == null) return redirect("/");
	const editorMode = thisMenu.modes["editor"];
	if(editorMode != null) return redirect(editorMode.href);
	const thisMode = thisMenu.modes["viewer"];
	if(thisMode == null) return redirect(thisMenu.modes[thisMenu.defaultMode].href);
	return children;
}
