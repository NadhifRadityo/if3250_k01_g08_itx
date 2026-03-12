"use server";

import React from "react";
import { Metadata as NextMetadata, Viewport as NextViewport } from "next";
import Script from "next/script";
import dedent from "dedent-js";
import { ThemeProvider, ThemeProviderProps } from "next-themes";

import cn from "@/utils/cn";
import reactRegex from "@/utils/reactRegex";
import useReactRegex from "@/utils/useReactRegex";
import Comment from "@/components/Comment";
import { Toaster } from "@/components/radix/Sonner";

import favicon16x16 from "./_static/favicons/favicon-16x16.ico";
import favicon32x32 from "./_static/favicons/favicon-32x32.ico";
import favicon96x96 from "./_static/favicons/favicon-96x96.ico";
import favicon128x128 from "./_static/favicons/favicon-128x128.ico";
import favicon192x192 from "./_static/favicons/favicon-192x192.ico";
import favicon196x196 from "./_static/favicons/favicon-196x196.ico";
import favicon256x256 from "./_static/favicons/favicon-256x256.ico";
import favicon512x512 from "./_static/favicons/favicon-512x512.png";
import faviconApple57x57 from "./_static/favicons/favicon-apple-57x57.png";
import faviconApple60x60 from "./_static/favicons/favicon-apple-60x60.png";
import faviconApple72x72 from "./_static/favicons/favicon-apple-72x72.png";
import faviconApple76x76 from "./_static/favicons/favicon-apple-76x76.png";
import faviconApple114x114 from "./_static/favicons/favicon-apple-114x114.png";
import faviconApple120x120 from "./_static/favicons/favicon-apple-120x120.png";
import faviconApple144x144 from "./_static/favicons/favicon-apple-144x144.png";
import faviconApple152x152 from "./_static/favicons/favicon-apple-152x152.png";
import faviconApple167x167 from "./_static/favicons/favicon-apple-167x167.png";
import faviconApple180x180 from "./_static/favicons/favicon-apple-180x180.png";
import faviconMstile70x70 from "./_static/favicons/favicon-mstile-70x70.png";
import faviconMstile144x144 from "./_static/favicons/favicon-mstile-144x144.png";
import faviconMstile150x150 from "./_static/favicons/favicon-mstile-150x150.png";
import faviconMstile310x310 from "./_static/favicons/favicon-mstile-310x310.png";
import Entry from "./entry";

export async function generateRootMetadata() {
	return {
		metadataBase: process.env.NEXT_PUBLIC_PROJECT_WEB_ORIGIN,
		applicationName: "Website Mobile Survey Intelix",
		title: {
			default: "Mobile Survey Intelix",
			template: "%s • Mobile Survey Intelix"
		},
		description: "",
		creator: "Mobile Survey Intelix",
		publisher: "Mobile Survey Intelix",
		authors: [
			{ name: "IF3250-K01-G08-ITX" }
		],
		openGraph: {
			title: {
				default: "Mobile Survey Intelix",
				template: "%s • Mobile Survey Intelix"
			},
			description: ""
		},
		twitter: {
			title: {
				default: "Mobile Survey Intelix",
				template: "%s • Mobile Survey Intelix"
			},
			description: ""
		},
		icons: {
			icon: [
				{ url: favicon16x16.src, sizes: "16x16", type: "image/x-icon" },
				{ url: favicon32x32.src, sizes: "32x32", type: "image/x-icon" },
				{ url: favicon96x96.src, sizes: "96x96", type: "image/x-icon" },
				{ url: favicon128x128.src, sizes: "128x128", type: "image/x-icon" },
				{ url: favicon192x192.src, sizes: "192x192", type: "image/x-icon" },
				{ url: favicon196x196.src, sizes: "196x196", type: "image/x-icon" },
				{ url: favicon256x256.src, sizes: "256x256", type: "image/x-icon" },
				{ url: favicon512x512.src, sizes: "512x512", type: "image/png" }
			],
			apple: [
				{ url: faviconApple57x57.src, sizes: "57x57" },
				{ url: faviconApple60x60.src, sizes: "60x60" },
				{ url: faviconApple72x72.src, sizes: "72x72" },
				{ url: faviconApple76x76.src, sizes: "76x76" },
				{ url: faviconApple114x114.src, sizes: "114x114" },
				{ url: faviconApple120x120.src, sizes: "120x120" },
				{ url: faviconApple144x144.src, sizes: "144x144" },
				{ url: faviconApple152x152.src, sizes: "152x152" },
				{ url: faviconApple167x167.src, sizes: "167x167" },
				{ url: faviconApple180x180.src, sizes: "180x180" }
			]
		},
		other: {
			"msapplication-TileColor": "#ff0000",
			"msapplication-TileImage": faviconMstile144x144.src,
			"msapplication-square70x70logo": faviconMstile70x70.src,
			"msapplication-square144x144logo": faviconMstile144x144.src,
			"msapplication-square150x150logo": faviconMstile150x150.src,
			"msapplication-square310x310logo": faviconMstile310x310.src
		}
	} as NextMetadata;
}
export async function generateRootViewport() {
	return {
		colorScheme: "light",
		themeColor: "#672431",
		width: "device-width",
		initialScale: 1,
		maximumScale: 6
	} as NextViewport;
}

const elementChildrenRegex = new reactRegex(({ Anchor, Group, Any, Count }) => (
	<>
		<Anchor kind="start" />
		<Group kind="named" id="html">
			<html>
				<Group kind="named" id="head">
					<head>
						<Any />
						<Count min={0} max={Infinity} />
					</head>
				</Group>
				<Group kind="named" id="body">
					<body>
						<Any />
						<Count min={0} max={Infinity} />
					</body>
				</Group>
			</html>
		</Group>
		<Anchor kind="end" />
	</>
));

export default async function Root({
	withBuildMeta = true,
	withAnalytics = true,
	withAsciiComment = true,
	withSonner = true,
	theme,
	children: childrenNode
}: {
	withBuildMeta?: boolean;
	withAnalytics?: boolean;
	withAsciiComment?: boolean;
	withSonner?: boolean;
	theme?: ThemeProviderProps;
	children: React.ReactNode;
}) {
	const children = useReactRegex(elementChildrenRegex, childrenNode);
	return (
		children!.groups!.html!.c0!<"html">(Html => (
			<Html lang={Html.props.lang ?? "id"} suppressHydrationWarning>
				{children!.groups!.head!.c0!<"head">(Head => (
					<Head>
						{withBuildMeta ? (
							<>
								<Comment>
									Build ID:
									{process.env.NEXT_PUBLIC_BUILD_ID}
									{" "}
									(Build Date:
									{process.env.NEXT_PUBLIC_BUILD_DATE}
									)
								</Comment>
								<Comment>
									Revision was commited by
									{process.env.NEXT_PUBLIC_BUILD_COMMIT_COMMITTER_NAME}
									{" "}
									at
									{process.env.NEXT_PUBLIC_BUILD_COMMIT_COMMITTER_TIME}
								</Comment>
								<Comment>
									Revision was authored by
									{process.env.NEXT_PUBLIC_BUILD_COMMIT_AUTHOR_NAME}
									{" "}
									at
									{process.env.NEXT_PUBLIC_BUILD_COMMIT_AUTHOR_TIME}
								</Comment>
							</>
						) : null}
						{Head.children.map(c => c(Child => (<Child />)))}
						{withAnalytics ? (
							<>
								<Script async defer src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_TOKEN}`}></Script>
								<Script async defer src={`https://www.googletagmanager.com/gtm.js?id=${process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_TOKEN}`}></Script>
								<Script id="google_analytics">
									{dedent`
										window.dataLayer = window.dataLayer || [];
										function gtag() { dataLayer.push(arguments); }
										gtag("js", new Date());
										gtag("config", "${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_TOKEN}");
										gtag({ event: "gtm.js", "gtm.start": Date.now() });
									`}
								</Script>
							</>
						) : null}
					</Head>
				))}
				{children!.groups!.body!.c0!<"body">(Body => (
					<Body className={cn("bg-background text-foreground font-sans antialiased", Body.props.className)}>
						{withAnalytics ? (
							<noscript>
								<iframe src={`https://www.googletagmanager.com/ns.html?id=${process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_TOKEN}`} width="0" height="0" style={{ display: "none", visibility: "hidden" }} />
							</noscript>
						) : null}
						{withAsciiComment ? (
							<Comment multiline>
								{`
									███╗   ███╗ ██████╗ ██████╗ ██╗██╗     ███████╗    
									████╗ ████║██╔═══██╗██╔══██╗██║██║     ██╔════╝    
									██╔████╔██║██║   ██║██████╔╝██║██║     █████╗      
									██║╚██╔╝██║██║   ██║██╔══██╗██║██║     ██╔══╝      
									██║ ╚═╝ ██║╚██████╔╝██████╔╝██║███████╗███████╗    
									╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚═╝╚══════╝╚══════╝    
																					
									███████╗██╗   ██╗██████╗ ██╗   ██╗███████╗██╗   ██╗
									██╔════╝██║   ██║██╔══██╗██║   ██║██╔════╝╚██╗ ██╔╝
									███████╗██║   ██║██████╔╝██║   ██║█████╗   ╚████╔╝ 
									╚════██║██║   ██║██╔══██╗╚██╗ ██╔╝██╔══╝    ╚██╔╝  
									███████║╚██████╔╝██║  ██║ ╚████╔╝ ███████╗   ██║   
									╚══════╝ ╚═════╝ ╚═╝  ╚═╝  ╚═══╝  ╚══════╝   ╚═╝   
																					
									██╗███╗   ██╗████████╗███████╗██╗     ██╗██╗  ██╗  
									██║████╗  ██║╚══██╔══╝██╔════╝██║     ██║╚██╗██╔╝  
									██║██╔██╗ ██║   ██║   █████╗  ██║     ██║ ╚███╔╝   
									██║██║╚██╗██║   ██║   ██╔══╝  ██║     ██║ ██╔██╗   
									██║██║ ╚████║   ██║   ███████╗███████╗██║██╔╝ ██╗  
									╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚══════╝╚═╝╚═╝  ╚═╝  
								`}
							</Comment>
						) : null}
						<ThemeProvider {...theme}>
							<Entry>
								{Body.children.map(c => c(Child => (<Child />)))}
								{withSonner ? (<Toaster />) : null}
							</Entry>
						</ThemeProvider>
					</Body>
				))}
			</Html>
		))
	);
}
