import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { resolveCreditApplicationSectionRedirectHrefAction } from "../../layout.actions";

export default async function CreditApplicationImportLayout({ children }: { children: ReactNode }) {
	const redirectHref = await resolveCreditApplicationSectionRedirectHrefAction("import");
	if(redirectHref != null)
		redirect(redirectHref);

	return children;
}
