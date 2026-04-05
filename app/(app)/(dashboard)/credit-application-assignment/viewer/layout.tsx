import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { resolveManagementModeRedirectHrefAction } from "../../layout.actions";

export default async function Layout({ children }: { children: ReactNode }) {
	const redirectHref = await resolveManagementModeRedirectHrefAction("credit-application-assignment", "viewer");
	if(redirectHref != null)
		redirect(redirectHref);

	return children;
}
