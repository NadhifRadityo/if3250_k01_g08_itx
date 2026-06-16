"use client";

import Link from "next/link";

import { Card, CardTitle, CardHeader, CardContent, CardDescription } from "@/components/radix/Card";

import { MenuIcons, useDashboardContext } from "./layout.components";
import { dashboardMenuGroups } from "./layout.shared";

export default function Page() {
	const { menus } = useDashboardContext();
	const groupedMenus = dashboardMenuGroups
		.map(([groupName, groupMenuKeys]) => ([groupName, groupMenuKeys.map(key => menus.find(menu => menu.key == key)).filter(menu => menu != null)] as const))
		.filter(([_, groupMenus]) => groupMenus.length > 0);
	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
				<p className="text-muted-foreground mt-2">Welcome to the Mobile Survey Management System</p>
			</div>
			{groupedMenus.map(([groupName, groupMenus]) => (
				<div key={groupName} className="space-y-4">
					<h2 className="text-xl font-semibold">{groupName}</h2>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{groupMenus.map(menu => {
							const Icon = MenuIcons[menu.key];
							const defaultMode = menu.modes[menu.defaultMode];
							const href = defaultMode?.href ?? Object.values(menu.modes)[0]?.href ?? "#";
							return (
								<Link key={menu.key} href={href}>
									<Card className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer h-full">
										<CardHeader>
											<div className="flex items-start gap-4">
												<div className="p-2 bg-primary/10 rounded-lg">
													<Icon className="h-6 w-6 text-primary" />
												</div>
												<div className="flex-1 space-y-1">
													<CardTitle className="text-lg">{menu.label}</CardTitle>
													<CardDescription className="text-sm">
														Manage {menu.label.toLowerCase()}
													</CardDescription>
												</div>
											</div>
										</CardHeader>
										{Object.keys(menu.modes).length > 1 ? (
											<CardContent>
												<div className="flex flex-wrap gap-2">
													{Object.entries(menu.modes).map(([modeKey, mode]) => (
														<span key={modeKey} className="text-xs px-2 py-1 bg-secondary rounded-md">
															{mode.subLabel}
														</span>
													))}
												</div>
											</CardContent>
										) : null}
									</Card>
								</Link>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
}
