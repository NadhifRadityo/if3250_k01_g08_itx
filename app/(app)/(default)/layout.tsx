import React, { Suspense } from "react";
import { connection as nextConnection } from "next/server";

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
	return children;
}
export default async function Layout({ children }: { children: React.ReactNode }) {
	return (
		<Root>
			<html>
				<head>
					<Comment>(app)/(forms)</Comment>
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
