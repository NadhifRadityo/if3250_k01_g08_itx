import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { resolveManagementModeRedirectHrefAction } from "../../layout.actions";

export default async function Layout({ children }: { children: ReactNode }) {
	const redirectHref = await resolveManagementModeRedirectHrefAction("customer-satisfaction", "approver");
	if(redirectHref != null)
		redirect(redirectHref);

	return children;
}
