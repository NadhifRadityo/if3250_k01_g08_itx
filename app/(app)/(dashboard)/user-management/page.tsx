import { redirect } from "next/navigation";

import { getDashboardShellContextAction } from "../layout.actions";

export default async function Page() {
	const dashboardContext = await getDashboardShellContextAction();
	if(dashboardContext == null) return redirect("/login");
	const thisMenu = dashboardContext.menus.find(menu => menu.key == "user-management");
	if(thisMenu == null) return redirect("/");
	return redirect(thisMenu.modes[thisMenu.defaultMode].href);
}
