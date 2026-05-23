"use server";

import { getDashboardContextAction } from "../layout.actions";
import { tabMenuKeys } from "./layout.shared";

export async function getTabContextAction() {
	const dashboardContext = await getDashboardContextAction();
	if(dashboardContext == null) return null;
	const menus = tabMenuKeys.filter(t => dashboardContext.menus.some(m => m.key == t));
	return {
		menus: menus
	};
}
