import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { resolveAccountAssignmentModeRedirectHrefAction } from "../layout.actions";

export default async function Layout({ children }: { children: ReactNode }) {
	const redirectHref = await resolveAccountAssignmentModeRedirectHrefAction("viewer");
	if(redirectHref != null)
		redirect(redirectHref);

	return children;
}
