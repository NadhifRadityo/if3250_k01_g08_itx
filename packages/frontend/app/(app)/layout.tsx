import React from "react";

import Comment from "@/components/Comment";
import Root, { generateRootMetadata, generateRootViewport } from "@/app/root";

import "./layout.css";

export async function generateMetadata() {
	return generateRootMetadata();
}
export async function generateViewport() {
	return generateRootViewport();
}

export default async function Layout({ children }: { children: React.ReactNode }) {
	return (
		<Root>
			<html>
				<head>
					<Comment>(app)</Comment>
				</head>
				<body>
					{children}
				</body>
			</html>
		</Root>
	);
}
