"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Drawer, DrawerTitle, DrawerFooter, DrawerHeader, DrawerContent, DrawerDescription } from "@/components/radix/Drawer";
import { Skeleton } from "@/components/radix/Skeleton";

import { MenuTableConfigColumn, MenuColumnConfigColumn, MenuFilterConfigColumn, useMenuRowValueRenderer, MenuRowValueRendererContext, MenuRowValueRendererConfigColumn } from "../layout.components";
import { filterConfigColumns as officerTaskFilterConfigColumns } from "../officer-task/layout.components";
import { searchRelationGpsLogsAction } from "../relation-navigation.actions";
import { defaultRelationUserRenderer, defaultRelationOfficerTaskRenderer } from "../relation-navigation.components";
import { userFilterConfigColumns } from "../user-management/layout.components";
import { RelationValues, getDetailsAction, queryMonitoringAction } from "./layout.actions";

export type ColumnData = Awaited<ReturnType<typeof queryMonitoringAction>>["docs"][number];
export const filterConfigColumns = Object.freeze([
	{ key: "id", label: "Id", type: "relation", relationSearch: searchRelationGpsLogsAction },
	{ key: "createdAt", label: "Created At", type: "date" },
	{ key: "user", label: "User", type: "relation", relationFilterConfigColumn: () => ["User", userFilterConfigColumns] },
	{ key: "sessionId", label: "Session Id", type: "text" },
	{ key: "officerTask", label: "Officer Task", type: "relation", relationFilterConfigColumn: () => ["Officer Task", officerTaskFilterConfigColumns] },
	{ key: "latitude", label: "Latitude", type: "number" },
	{ key: "longitude", label: "Longitude", type: "number" }
] as MenuFilterConfigColumn[]);
export const columnConfigColumns = Object.freeze([
	{ key: "id", label: "Id" },
	{ key: "createdAt", label: "Created At" },
	{ key: "user", label: "User" },
	{ key: "sessionId", label: "Session Id" },
	{ key: "officerTask", label: "Officer Task" },
	{ key: "latitude", label: "Latitude" },
	{ key: "longitude", label: "Longitude" }
] as MenuColumnConfigColumn[]);
export const tableConfigColumns = Object.freeze([
	{ key: "id", label: "Id", sortable: true, className: "text-xs" },
	{ key: "createdAt", label: "Created At", sortable: true },
	{ key: "user", label: "User", sortable: false },
	{ key: "sessionId", label: "Session Id", sortable: true },
	{ key: "officerTask", label: "Officer Task", sortable: false },
	{ key: "latitude", label: "Latitude", sortable: true },
	{ key: "longitude", label: "Longitude", sortable: true }
] as MenuTableConfigColumn[]);
export const rowValueRendererConfigColumns = Object.freeze([
	{ key: "id", type: "text", render: v => (<span className="font-mono">{v}</span>) },
	{ key: "createdAt", type: "date" },
	{ key: "user", type: "relation", render: defaultRelationUserRenderer({ description: "User", relationSource: "gps-logs.user" }) },
	{ key: "sessionId", type: "text" },
	{ key: "officerTask", type: "relation", render: defaultRelationOfficerTaskRenderer({ description: "Officer Task", relationSource: "gps-logs.officerTask" }) },
	{ key: "latitude", type: "number" },
	{ key: "longitude", type: "number" }
] as MenuRowValueRendererConfigColumn<ColumnData, RowValueRendererContext>[]);
export type RowValueRendererContext = {
	relationValues?: RelationValues;
} & MenuRowValueRendererContext;
export const eligibleDetailsTriggerColumns = Object.freeze([
	"id",
	"createdAt",
	"sessionId",
	"latitude",
	"longitude"
]);
export const drawerValueRendererConfigColumns = rowValueRendererConfigColumns;
export const defaultColumnOrder = Object.freeze([
	"id",
	"createdAt",
	"user",
	"sessionId",
	"officerTask",
	"latitude",
	"longitude"
]) as string[];
export const defaultColumnsShown = Object.freeze([
	"createdAt",
	"user",
	"sessionId",
	"officerTask",
	"latitude",
	"longitude"
]) as string[];
export const defaultColumnsSort = Object.freeze([
	["createdAt", false]
]) as [string, boolean][];

export function DetailsDrawer(
	{ open, onOpenChange, row, rowValueRendererContext }:
	{ open: boolean, onOpenChange: (v: boolean) => void, row: ColumnData | null, rowValueRendererContext: RowValueRendererContext }
) {
	const query = useQuery({
		queryKey: ["gps-log", "details", row?.id ?? null],
		enabled: open && row != null,
		queryFn: async () => await getDetailsAction(row!.id),
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
					<DrawerTitle>GPS Log Details</DrawerTitle>
					<DrawerDescription>Review all available columns for this GPS log entry.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
					{row == null ? (
						<p className="text-muted-foreground text-sm">
							No GPS log selected.
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
								{`${query.error?.message ?? "Unable to load GPS log details."}`}
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
