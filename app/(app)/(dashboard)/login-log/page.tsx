import { redirect } from "next/navigation";

import { getDashboardContextAction } from "../layout.actions";

export default async function Page() {
	const dashboardContext = await getDashboardContextAction();
	if(dashboardContext == null) return redirect("/login");
	const thisMenu = dashboardContext.menus.find(menu => menu.key == "login-log");
	if(thisMenu == null) return redirect("/");
	return redirect(thisMenu.modes[thisMenu.defaultMode].href);
}
