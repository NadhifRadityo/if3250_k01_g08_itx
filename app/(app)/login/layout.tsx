import React, { Suspense } from "react";
import { headers as nextHeaders } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { connection as nextConnection } from "next/server";
import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import Comment from "@/components/Comment";
import Root, { generateRootMetadata, generateRootViewport } from "@/app/root";

import "./layout.css";

export async function generateMetadata() {
	return generateRootMetadata();
}
export async function generateViewport() {
	return generateRootViewport();
}

async function SuspensedLayout({ children }: { children: React.ReactNode }) {
	await nextConnection();
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user != null)
		return redirect("/", RedirectType.push);
	return children;
}
export default async function Layout({ children }: { children: React.ReactNode }) {
	return (
		<Root>
			<html>
				<head>
					<Comment>(app)/login</Comment>
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
