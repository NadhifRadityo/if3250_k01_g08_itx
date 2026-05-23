import { redirect } from "next/navigation";

import { getDashboardContextAction } from "../layout.actions";
import { getTabContextAction } from "./layout.actions";

export default async function Page() {
	const dashboardContext = await getDashboardContextAction();
	if(dashboardContext == null) return redirect("/login");
	const tabContext = await getTabContextAction();
	if(tabContext == null) return redirect("/login");
	const thisMenu = dashboardContext.menus.find(menu => menu.key == "access-management");
	if(thisMenu == null) return redirect("/");
	const firstSlug = tabContext.menus[0];
	if(firstSlug == null) return redirect("/");
	return redirect(`/access-management/${firstSlug}`);
}
