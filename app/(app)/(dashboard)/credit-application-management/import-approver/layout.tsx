import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { resolveCreditApplicationSectionRedirectHrefAction } from "../../layout.actions";

export default async function CreditApplicationImportApproverLayout({ children }: { children: ReactNode }) {
	const redirectHref = await resolveCreditApplicationSectionRedirectHrefAction("import-approver");
	if(redirectHref != null)
		redirect(redirectHref);

	return children;
}
