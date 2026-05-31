"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Drawer, DrawerTitle, DrawerFooter, DrawerHeader, DrawerContent, DrawerDescription } from "@/components/radix/Drawer";
import { Skeleton } from "@/components/radix/Skeleton";
import { Table, TableRow, TableBody, TableCell, TableHead, TableHeader } from "@/components/radix/Table";

import { MenuTableConfigColumn, MenuColumnConfigColumn, MenuFilterConfigColumn, useMenuRowValueRenderer, MenuRowValueRendererContext, MenuRowValueRendererConfigColumn } from "../layout.components";
import { filterConfigColumns as officerTaskFilterConfigColumns } from "../officer-task/layout.components";
import { searchRelationGpsLogsAction } from "../relation-navigation.actions";
import { defaultRelationUserRenderer, defaultRelationOfficerTaskRenderer } from "../relation-navigation.components";
import { userFilterConfigColumns } from "../user-management/layout.components";
import { RelationValues, getDetailsAction, OfficerTrackingRow } from "./layout.actions";

export type ColumnData = OfficerTrackingRow;
export const filterConfigColumns = Object.freeze([
	{ key: "id", label: "GPS Log Id", type: "relation", relationSearch: searchRelationGpsLogsAction },
	{ key: "createdAt", label: "Created At", type: "date" },
	{ key: "user", label: "User", type: "relation", relationFilterConfigColumn: () => ["User", userFilterConfigColumns] },
	{ key: "sessionId", label: "Session Id", type: "text" },
	{ key: "officerTask", label: "Officer Task", type: "relation", relationFilterConfigColumn: () => ["Officer Task", officerTaskFilterConfigColumns] },
	{ key: "latitude", label: "Latitude", type: "number" },
	{ key: "longitude", label: "Longitude", type: "number" },
	{ key: "accuracy", label: "Accuracy", type: "number" }
] as MenuFilterConfigColumn[]);
export const columnConfigColumns = Object.freeze([
	{ key: "user", label: "User" },
	{ key: "firstSeen", label: "First Seen" },
	{ key: "lastSeen", label: "Last Seen" },
	{ key: "pointCount", label: "Point Count" },
	{ key: "sessionId", label: "Latest Session Id" },
	{ key: "officerTask", label: "Latest Officer Task" },
	{ key: "latitude", label: "Latest Latitude" },
	{ key: "longitude", label: "Latest Longitude" },
	{ key: "accuracy", label: "Latest Accuracy" }
] as MenuColumnConfigColumn[]);
export const tableConfigColumns = Object.freeze([
	{ key: "user", label: "User", sortable: false, className: "font-medium" },
	{ key: "firstSeen", label: "First Seen", sortable: true },
	{ key: "lastSeen", label: "Last Seen", sortable: true },
	{ key: "pointCount", label: "Point Count", sortable: true },
	{ key: "sessionId", label: "Latest Session Id", sortable: true },
	{ key: "officerTask", label: "Latest Officer Task", sortable: false },
	{ key: "latitude", label: "Latest Latitude", sortable: true },
	{ key: "longitude", label: "Latest Longitude", sortable: true },
	{ key: "accuracy", label: "Latest Accuracy", sortable: true }
] as MenuTableConfigColumn[]);
export const rowValueRendererConfigColumns = Object.freeze([
	{ key: "user", type: "relation", render: defaultRelationUserRenderer({ description: "User", relationSource: "officer-tracking.user" }) },
	{ key: "firstSeen", type: "date" },
	{ key: "lastSeen", type: "date" },
	{ key: "pointCount", type: "number" },
	{ key: "sessionId", type: "text" },
	{ key: "officerTask", type: "relation", render: defaultRelationOfficerTaskRenderer({ description: "Latest Officer Task", relationSource: "officer-tracking.officerTask" }) },
	{ key: "latitude", type: "number" },
	{ key: "longitude", type: "number" },
	{ key: "accuracy", type: "number" }
] as MenuRowValueRendererConfigColumn<ColumnData, RowValueRendererContext>[]);
export type RowValueRendererContext = {
	relationValues?: RelationValues;
} & MenuRowValueRendererContext;
export const eligibleDetailsTriggerColumns = Object.freeze([
	"user",
	"firstSeen",
	"lastSeen",
	"pointCount",
	"sessionId",
	"latitude",
	"longitude",
	"accuracy"
]);
export const defaultColumnOrder = Object.freeze([
	"user",
	"firstSeen",
	"lastSeen",
	"pointCount",
	"sessionId",
	"officerTask",
	"latitude",
	"longitude",
	"accuracy"
]) as string[];
export const defaultColumnsShown = Object.freeze([
	"user",
	"firstSeen",
	"lastSeen",
	"pointCount",
	"sessionId",
	"officerTask",
	"latitude",
	"longitude",
	"accuracy"
]) as string[];
export const defaultColumnsSort = Object.freeze([
	["lastSeen", false]
]) as [string, boolean][];

const detailsTableConfigColumns = Object.freeze([
	{ key: "id", label: "Id", sortable: false, className: "text-xs font-mono" },
	{ key: "createdAt", label: "Created At", sortable: false },
	{ key: "sessionId", label: "Session Id", sortable: false },
	{ key: "officerTask", label: "Officer Task", sortable: false },
	{ key: "latitude", label: "Latitude", sortable: false },
	{ key: "longitude", label: "Longitude", sortable: false },
	{ key: "accuracy", label: "Accuracy", sortable: false }
] as MenuTableConfigColumn[]);
const detailsRowValueRendererConfigColumns = Object.freeze([
	{ key: "id", type: "text", render: v => (<span className="font-mono">{v}</span>) },
	{ key: "createdAt", type: "date" },
	{ key: "sessionId", type: "text" },
	{ key: "officerTask", type: "relation", render: defaultRelationOfficerTaskRenderer({ description: "Officer Task", relationSource: "officer-tracking-details.officerTask" }) },
	{ key: "latitude", type: "number" },
	{ key: "longitude", type: "number" },
	{ key: "accuracy", type: "number" }
] as MenuRowValueRendererConfigColumn<any, RowValueRendererContext>[]);

export function DetailsDrawer(
	{ open, onOpenChange, row, periodStart, periodEnd, rowValueRendererContext }:
	{ open: boolean, onOpenChange: (v: boolean) => void, row: ColumnData | null, periodStart: string, periodEnd: string | null, rowValueRendererContext: RowValueRendererContext }
) {
	const query = useQuery({
		queryKey: ["officer-tracking", "details", row?.user ?? null, periodStart, periodEnd],
		enabled: open && row != null,
		queryFn: async () => await getDetailsAction({ userId: row!.user, periodStart, periodEnd }),
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});
	const renderDetailsCell = useMenuRowValueRenderer({
		columns: detailsRowValueRendererConfigColumns,
		context: {
			...rowValueRendererContext,
			relationValues: { ...rowValueRendererContext.relationValues, ...query.data?.relations }
		}
	});
	const headerLabel = useMemo(() => {
		if(row == null) return null;
		const userRelation = rowValueRendererContext.relationValues?.[`users:${row.user}`];
		return userRelation?.name ?? row.user;
	}, [row, rowValueRendererContext.relationValues]);
	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-3xl">
				<DrawerHeader>
					<DrawerTitle>Officer Tracking Details</DrawerTitle>
					<DrawerDescription>
						{headerLabel != null ? `GPS log entries for ${headerLabel} in the selected period.` : "GPS log entries for the selected user in the selected period."}
					</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
					{row == null ? (
						<p className="text-muted-foreground text-sm">
							No officer selected.
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
								{`${query.error?.message ?? "Unable to load officer tracking details."}`}
							</AlertDescription>
						</Alert>
					) : query.data.docs.length == 0 ? (
						<p className="text-muted-foreground text-sm">
							No GPS log entries in the selected period.
						</p>
					) : (
						<div className="rounded-xl border">
							<Table>
								<TableHeader>
									<TableRow>
										{detailsTableConfigColumns.map(column => (
											<TableHead key={column.key}>{column.label}</TableHead>
										))}
									</TableRow>
								</TableHeader>
								<TableBody>
									{query.data.docs.map(doc => (
										<TableRow key={doc.id}>
											{detailsTableConfigColumns.map(column => (
												<TableCell key={column.key} className={column.className}>
													{renderDetailsCell(doc, column.key)}
												</TableCell>
											))}
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
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
