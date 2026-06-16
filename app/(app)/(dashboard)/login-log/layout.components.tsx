"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";

import { rwsa, uwsa } from "@/utils/actions";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Drawer, DrawerTitle, DrawerFooter, DrawerHeader, DrawerContent, DrawerDescription } from "@/components/radix/Drawer";
import { Skeleton } from "@/components/radix/Skeleton";

import { MenuTableConfigColumn, MenuColumnConfigColumn, MenuFilterConfigColumn, useMenuRowValueRenderer, MenuRowValueRendererContext, MenuRowValueRendererConfigColumn, type MenuFilterState } from "../layout.components";
import { searchRelationLoginLogsAction } from "../relation-navigation.actions";
import { defaultRelationUserRenderer } from "../relation-navigation.components";
import { StatisticsLoader, StatisticsSection, CommonLogMonitoringCards, CommonLogReportingCards, commonLogMonitoringCardDefinitions, commonLogReportingCardDefinitions, useStatisticsVisibleKeys } from "../statistics.components";
import { userFilterConfigColumns } from "../user-management/layout.components";
import { RelationValues, getDetailsAction, queryMonitoringAction, getMonitoringStatisticsAction, getReportingStatisticsAction } from "./layout.actions";

export type ColumnData = rwsa<typeof queryMonitoringAction>["docs"][number];
export const eventSelectOptions = Object.freeze([
	{ value: "login", label: "Login" },
	{ value: "logout", label: "Logout" }
] as const);
export const outcomeSelectOptions = Object.freeze([
	{ value: "success", label: "Success" },
	{ value: "failure", label: "Failure" }
] as const);
export const filterConfigColumns = Object.freeze([
	{ key: "id", label: "Id", type: "relation", relationSearch: uwsa(searchRelationLoginLogsAction) },
	{ key: "createdAt", label: "Created At", type: "date" },
	{ key: "user", label: "User", type: "relation", relationFilterConfigColumn: () => ["User", userFilterConfigColumns] },
	{ key: "ipAddress", label: "IP Address", type: "text" },
	{ key: "event", label: "Event", type: "select", selectOptions: eventSelectOptions },
	{ key: "outcome", label: "Outcome", type: "select", selectOptions: outcomeSelectOptions }
] as MenuFilterConfigColumn[]);
export const columnConfigColumns = Object.freeze([
	{ key: "id", label: "Id" },
	{ key: "createdAt", label: "Created At" },
	{ key: "user", label: "User" },
	{ key: "ipAddress", label: "IP Address" },
	{ key: "event", label: "Event" },
	{ key: "outcome", label: "Outcome" }
] as MenuColumnConfigColumn[]);
export const tableConfigColumns = Object.freeze([
	{ key: "id", label: "Id", sortable: true, className: "text-xs" },
	{ key: "createdAt", label: "Created At", sortable: true },
	{ key: "user", label: "User", sortable: false },
	{ key: "ipAddress", label: "IP Address", sortable: true },
	{ key: "event", label: "Event", sortable: true },
	{ key: "outcome", label: "Outcome", sortable: true }
] as MenuTableConfigColumn[]);
export const rowValueRendererConfigColumns = Object.freeze([
	{ key: "id", type: "text", render: v => (<span className="font-mono">{v}</span>) },
	{ key: "createdAt", type: "date" },
	{ key: "user", type: "relation", render: defaultRelationUserRenderer({ description: "User", relationSource: "login-logs.user" }) },
	{ key: "ipAddress", type: "text" },
	{ key: "event", type: "select" },
	{ key: "outcome", type: "select" }
] as MenuRowValueRendererConfigColumn<ColumnData, RowValueRendererContext>[]);
export type RowValueRendererContext = {
	relationValues?: RelationValues;
} & MenuRowValueRendererContext;
export const eligibleDetailsTriggerColumns = Object.freeze([
	"id",
	"createdAt",
	"ipAddress",
	"event",
	"outcome"
]);
export const drawerValueRendererConfigColumns = rowValueRendererConfigColumns;
export const defaultColumnOrder = Object.freeze([
	"id",
	"createdAt",
	"user",
	"ipAddress",
	"event",
	"outcome"
]) as string[];
export const defaultColumnsShown = Object.freeze([
	"createdAt",
	"user",
	"ipAddress",
	"event",
	"outcome"
]) as string[];
export const defaultColumnsSort = Object.freeze([
	["createdAt", false]
]) as [string, boolean][];

export function MonitoringStatistics({ filters, onFiltersChange }: { filters: MenuFilterState[], onFiltersChange: (v: MenuFilterState[]) => void }) {
	const keys = useStatisticsVisibleKeys({ layoutKey: "login-log.monitoring", cards: commonLogMonitoringCardDefinitions });
	return (
		<StatisticsLoader
			queryKey={["login-log", "monitoring", filters, keys]}
			queryAction={() => uwsa(getMonitoringStatisticsAction)({ filters, keys })}
			refetchInterval={30000}
			render={data => (
				<StatisticsSection layoutKey="login-log.monitoring">
					<CommonLogMonitoringCards data={data} totalLabel="Today's Events" filters={filters} onFiltersChange={onFiltersChange} />
				</StatisticsSection>
			)}
		/>
	);
}

export function ReportingStatistics({ filters, onFiltersChange }: { filters: MenuFilterState[], onFiltersChange: (v: MenuFilterState[]) => void }) {
	const keys = useStatisticsVisibleKeys({ layoutKey: "login-log.reporting", cards: commonLogReportingCardDefinitions });
	return (
		<StatisticsLoader
			queryKey={["login-log", "reporting", filters, keys]}
			queryAction={() => uwsa(getReportingStatisticsAction)({ filters, keys })}
			render={data => (
				<StatisticsSection layoutKey="login-log.reporting">
					<CommonLogReportingCards data={data} totalLabel="Total Events" filters={filters} onFiltersChange={onFiltersChange} />
				</StatisticsSection>
			)}
		/>
	);
}

export function DetailsDrawer(
	{ open, onOpenChange, row, rowValueRendererContext }:
	{ open: boolean, onOpenChange: (v: boolean) => void, row: ColumnData | null, rowValueRendererContext: RowValueRendererContext }
) {
	const query = useQuery({
		queryKey: ["login-log", "details", row?.id ?? null],
		enabled: open && row != null,
		queryFn: async () => await uwsa(getDetailsAction)(row!.id),
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});
	const renderValue = useMenuRowValueRenderer({
		columns: drawerValueRendererConfigColumns,
		context: {
			...rowValueRendererContext,
			relationValues: { ...rowValueRendererContext.relationValues, ...query.data?.relations }
		}
	});
	const columnLabels = useMemo(() => Object.fromEntries(drawerValueRendererConfigColumns.map(column =>
		[column.key, tableConfigColumns.find(column2 => column2.key == column.key)!.label] as const)), []);
	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-2xl">
				<DrawerHeader>
					<DrawerTitle>Login Log Details</DrawerTitle>
					<DrawerDescription>Review all available columns for this login log entry.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
					{row == null ? (
						<p className="text-muted-foreground text-sm">
							No login log selected.
						</p>
					) : query.isPending ? (
						<div className="space-y-2">
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
						</div>
					) : query.isError || query.data == null ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>
								{`${query.error?.name ?? "Error"}`}
							</AlertTitle>
							<AlertDescription>
								{`${query.error?.message ?? "Unable to load login log details."}`}
							</AlertDescription>
						</Alert>
					) : (
						drawerValueRendererConfigColumns.map(column => (
							<div key={column.key} className="space-y-1 rounded-lg border p-3">
								<p className="text-muted-foreground text-xs font-medium">
									{columnLabels[column.key]}
								</p>
								{renderValue(query.data.row, column.key)}
							</div>
						))
					)}
				</div>
				<DrawerFooter className="border-t sm:flex-row sm:items-center sm:justify-end">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
						Close
					</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
