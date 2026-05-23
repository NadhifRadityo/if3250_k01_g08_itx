import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getDashboardContextAction } from "../../layout.actions";

export default async function Layout({ children }: { children: ReactNode }) {
	const dashboardContext = await getDashboardContextAction();
	if(dashboardContext == null) return redirect("/login");
	const thisMenu = dashboardContext.menus.find(menu => menu.key == "credit-application-management");
	if(thisMenu == null) return redirect("/");
	const editorMode = thisMenu.modes["import-editor"];
	if(editorMode != null) return redirect(editorMode.href);
	const thisMode = thisMenu.modes["import-viewer"];
	if(thisMode == null) return redirect(thisMenu.modes[thisMenu.defaultMode].href);
	return children;
}
