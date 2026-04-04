import { redirect } from "next/navigation";

import { resolveAccountAssignmentRootHrefAction } from "./layout.actions";

export default async function AccountAssignmentPage() {
	return redirect(await resolveAccountAssignmentRootHrefAction());
}
