import { redirect } from "next/navigation";

import { getDashboardContextAction } from "../../layout.actions";
import { getTabContextAction } from "../layout.actions";
import { tabMenuKeys } from "../layout.shared";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const tabContext = await getTabContextAction();
	if(tabContext == null) return redirect("/login");
	if(!tabContext.menus.includes(slug as typeof tabMenuKeys[number])) return redirect("/");
	const dashboardContext = await getDashboardContextAction();
	if(dashboardContext == null) return redirect("/login");
	const thisMenu = dashboardContext.menus.find(menu => menu.key == slug);
	if(thisMenu == null) return redirect("/");
	const hasEditor = thisMenu.modes["editor"] != null;
	const hasViewer = thisMenu.modes["viewer"] != null;
	if(hasEditor) return redirect(`/access-management/${slug}/editor`);
	if(hasViewer) return redirect(`/access-management/${slug}/viewer`);
	return redirect(`/access-management/${slug}/viewer`);
}
