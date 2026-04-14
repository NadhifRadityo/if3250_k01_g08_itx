import { redirect } from "next/navigation";

import { resolveManagementRootHref } from "../layout.actions";

export default async function Page() {
	return redirect(await resolveManagementRootHref("credit-application-management"));
}
