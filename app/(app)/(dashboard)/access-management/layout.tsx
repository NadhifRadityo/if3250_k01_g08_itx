import React, { Suspense } from "react";
import { redirect, RedirectType } from "next/navigation";
import { connection as nextConnection } from "next/server";

import { getTabContextAction } from "./layout.actions";
import { AccessManagementShell } from "./layout.components";

async function SuspensedLayout({ children }: { children: React.ReactNode }) {
	await nextConnection();
	const context = await getTabContextAction();
	if(context == null)
		return redirect("/login", RedirectType.push);

	return (
		<AccessManagementShell initialContext={context}>
			{children}
		</AccessManagementShell>
	);
}
export default async function Layout({ children }: { children: React.ReactNode }) {
	return (
		<Suspense>
			<SuspensedLayout>
				{children}
			</SuspensedLayout>
		</Suspense>
	);
}
