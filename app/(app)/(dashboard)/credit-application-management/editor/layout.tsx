import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { resolveCreditApplicationSectionRedirectHrefAction } from "../../layout.actions";

export default async function CreditApplicationEntryEditorLayout({ children }: { children: ReactNode }) {
	const redirectHref = await resolveCreditApplicationSectionRedirectHrefAction("editor");
	if(redirectHref != null)
		redirect(redirectHref);

	return children;
}
