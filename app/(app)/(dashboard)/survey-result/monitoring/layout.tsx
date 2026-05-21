import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getDashboardShellContext } from "../../layout.actions";

export default async function Layout({ children }: { children: ReactNode }) {
	const context = await getDashboardShellContext();
	if(context == null)
		return redirect("/login");

	if(!context.roleMenus.includes("survey-result-monitoring"))
		return redirect(context.managementNavigation[0]?.defaultHref ?? "/login");

	return children;
}
