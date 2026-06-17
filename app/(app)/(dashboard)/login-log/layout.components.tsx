"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";

import { rwsa, uwsa } from "@/utils/actions";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { AlertDialog, AlertDialogTitle, AlertDialogAction, AlertDialogCancel, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogDescription } from "@/components/radix/AlertDialog";
import { Button } from "@/components/radix/Button";
import { Drawer, DrawerTitle, DrawerFooter, DrawerHeader, DrawerContent, DrawerDescription } from "@/components/radix/Drawer";
import { Skeleton } from "@/components/radix/Skeleton";

import { MenuTableConfigColumn, MenuColumnConfigColumn, MenuFilterConfigColumn, useMenuRowValueRenderer, MenuRowValueRendererContext, MenuRowValueRendererConfigColumn } from "../layout.components";
import { searchRelationLoginLogsAction } from "../relation-navigation.actions";
import { defaultRelationUserRenderer } from "../relation-navigation.components";
import { userFilterConfigColumns } from "../user-management/layout.components";
import { RelationValues, getDetailsAction, queryMonitoringAction } from "./layout.actions";

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
	{ key: "outcome", label: "Outcome", type: "select", selectOptions: outcomeSelectOptions },
	{ key: "sessionId", label: "Session Id", type: "text" },
	{ key: "forcedLogoutBy", label: "Forced Logout By", type: "relation", relationFilterConfigColumn: () => ["User", userFilterConfigColumns] },
	{ key: "description", label: "Description", type: "text" }
] as MenuFilterConfigColumn[]);
export const columnConfigColumns = Object.freeze([
	{ key: "id", label: "Id" },
	{ key: "createdAt", label: "Created At" },
	{ key: "user", label: "User" },
	{ key: "ipAddress", label: "IP Address" },
	{ key: "event", label: "Event" },
	{ key: "outcome", label: "Outcome" },
	{ key: "sessionId", label: "Session Id" },
	{ key: "forcedLogoutBy", label: "Forced Logout By" },
	{ key: "description", label: "Description" }
] as MenuColumnConfigColumn[]);
export const tableConfigColumns = Object.freeze([
	{ key: "id", label: "Id", sortable: true, className: "text-xs" },
	{ key: "createdAt", label: "Created At", sortable: true },
	{ key: "user", label: "User", sortable: false },
	{ key: "ipAddress", label: "IP Address", sortable: true },
	{ key: "event", label: "Event", sortable: true },
	{ key: "outcome", label: "Outcome", sortable: true },
	{ key: "sessionId", label: "Session Id", sortable: true },
	{ key: "forcedLogoutBy", label: "Forced Logout By", sortable: false },
	{ key: "description", label: "Description", sortable: true }
] as MenuTableConfigColumn[]);
export const rowValueRendererConfigColumns = Object.freeze([
	{ key: "id", type: "text", render: v => (<span className="font-mono">{v}</span>) },
	{ key: "createdAt", type: "date" },
	{ key: "user", type: "relation", render: defaultRelationUserRenderer({ description: "User", relationSource: "login-logs.user" }) },
	{ key: "ipAddress", type: "text" },
	{ key: "event", type: "select", selectOptions: eventSelectOptions },
	{ key: "outcome", type: "select", selectOptions: outcomeSelectOptions },
	{ key: "sessionId", type: "text" },
	{ key: "forcedLogoutBy", type: "relation", render: defaultRelationUserRenderer({ description: "Forced Logout By", relationSource: "login-logs.forcedLogoutBy" }) },
	{ key: "description", type: "text" }
] as MenuRowValueRendererConfigColumn<ColumnData, RowValueRendererContext>[]);
export type RowValueRendererContext = {
	relationValues?: RelationValues;
	isMutating?: boolean;
	setForceLogoutTargetRow?: (v: ColumnData | null) => void;
} & MenuRowValueRendererContext;
export const eligibleDetailsTriggerColumns = Object.freeze([
	"id",
	"createdAt",
	"ipAddress",
	"event",
	"outcome",
	"sessionId",
	"description"
]);
export const drawerValueRendererConfigColumns = rowValueRendererConfigColumns;
export const defaultColumnOrder = Object.freeze([
	"id",
	"createdAt",
	"user",
	"ipAddress",
	"event",
	"outcome",
	"sessionId",
	"forcedLogoutBy",
	"description"
]) as string[];
export const defaultColumnsShown = Object.freeze([
	"createdAt",
	"user",
	"ipAddress",
	"event",
	"outcome",
	"sessionId",
	"forcedLogoutBy",
	"description"
]) as string[];
export const defaultColumnsSort = Object.freeze([
	["createdAt", false]
]) as [string, boolean][];

export function DetailsDrawer(
	{ open, onOpenChange, row, rowValueRendererContext, renderActions }:
	{ open: boolean, onOpenChange: (v: boolean) => void, row: ColumnData | null, rowValueRendererContext: RowValueRendererContext, renderActions?: (r: ColumnData) => React.ReactNode }
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
					{row != null && renderActions != null ? (
						renderActions(row)
					) : null}
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

export function ForceLogoutDialog(
	{ open, onOpenChange, onConfirm, isMutating }:
	{ open: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void, isMutating?: boolean }
) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="md:min-w-[520px]">
				<AlertDialogHeader>
					<AlertDialogTitle>Force Logout</AlertDialogTitle>
					<AlertDialogDescription>
						Are you sure you want to force logout this user?
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={onConfirm} disabled={isMutating}>Force Logout</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
