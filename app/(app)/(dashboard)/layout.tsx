import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection as nextConnection } from "next/server";

import { uwsa } from "@/utils/actions";
import Comment from "@/components/Comment";
import Root, { generateRootMetadata, generateRootViewport } from "@/app/root";

import { getDashboardContextAction } from "./layout.actions";
import { DashboardShell } from "./layout.components";
import "./layout.css";

export async function generateMetadata() {
	return generateRootMetadata();
}
export async function generateViewport() {
	return generateRootViewport();
}

async function SuspensedLayout({ children }: { children: React.ReactNode }) {
	await nextConnection();
	const context = await uwsa(getDashboardContextAction)();
	if(context == null)
		return redirect("/login");

	return (
		<DashboardShell initialContext={context}>
			{children}
		</DashboardShell>
	);
}
export default async function Layout({ children }: { children: React.ReactNode }) {
	return (
		<Root>
			<html>
				<head>
					<Comment>(app)/(dashboard)</Comment>
				</head>
				<body>
					<Suspense>
						<SuspensedLayout>
							{children}
						</SuspensedLayout>
					</Suspense>
				</body>
			</html>
		</Root>
	);
}
