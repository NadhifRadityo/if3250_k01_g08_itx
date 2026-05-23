import { redirect } from "next/navigation";

import { getDashboardContextAction } from "../../layout.actions";
import { getTabContextAction } from "../layout.actions";
import { tabMenuKeys } from "../layout.shared";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const dashboardContext = await getDashboardContextAction();
	if(dashboardContext == null) return redirect("/login");
	const tabContext = await getTabContextAction();
	if(tabContext == null) return redirect("/login");
	const thisMenu = dashboardContext.menus.find(menu => menu.key == "access-management");
	if(thisMenu == null) return redirect("/");
	if(!tabContext.menus.includes(slug as typeof tabMenuKeys[number])) return redirect("/access-management");
	return redirect(thisMenu.modes[thisMenu.defaultMode].href.replace("/[slug]/", `/${slug}/`));
}
