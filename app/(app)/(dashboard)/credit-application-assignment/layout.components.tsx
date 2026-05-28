"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SerializedEditorState } from "lexical";
import { HistoryIcon, CircleAlertIcon } from "lucide-react";

import { getRelationshipId } from "@/utils/payload";
import { RichTextInput } from "@/components/RichText";
import { SearchableSelect, SearchableMultiSelect } from "@/components/SearchableSelect";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { AlertDialog, AlertDialogTitle, AlertDialogAction, AlertDialogCancel, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogDescription } from "@/components/radix/AlertDialog";
import { Badge } from "@/components/radix/Badge";
import { Button } from "@/components/radix/Button";
import { Drawer, DrawerTitle, DrawerFooter, DrawerHeader, DrawerContent, DrawerDescription } from "@/components/radix/Drawer";
import { Skeleton } from "@/components/radix/Skeleton";
import { CreditApplicationAssignment } from "@/payload-types";

import { uploadGenericRichtextImage } from "../../editor-x.actions";
import { filterConfigColumns as creditApplicationFilterConfigColumns } from "../credit-application-management/layout.components";
import { useDashboardContext, defaultStatusRenderer, MenuTableConfigColumn, MenuColumnConfigColumn, MenuFilterConfigColumn, useMenuRowValueRenderer, MenuRowValueRendererContext, defaultChangeRequestRenderer, MenuRowValueRendererConfigColumn } from "../layout.components";
import { changeRequestTypeSelectOptions } from "../layout.shared";
import { searchRelationUsersByRoleLevelAction, searchAvailableRelationCreditApplicationsAction, searchRelationCreditApplicationAssignmentsAction } from "../relation-navigation.actions";
import { defaultRelationUserRenderer, defaultRelationCreditApplicationRenderer } from "../relation-navigation.components";
import { userFilterConfigColumns, userByRoleFilterConfigColumns } from "../user-management/layout.components";
import { RelationValues, getDetailsAction, getHistoryAction, queryViewerAction, getDifferenceAction } from "./layout.actions";

export type ColumnData = Awaited<ReturnType<typeof queryViewerAction>>["docs"][number];
export const filterConfigColumns = Object.freeze([
	{ key: "id", label: "Id", type: "relation", relationSearch: searchRelationCreditApplicationAssignmentsAction },
	{ key: "createdAt", label: "Created At", type: "date" },
	{ key: "createdBy", label: "Created By", type: "relation", relationFilterConfigColumn: () => ["User", userFilterConfigColumns] },
	{ key: "updatedAt", label: "Updated At", type: "date" },
	{ key: "updatedBy", label: "Updated By", type: "relation", relationFilterConfigColumn: () => ["User", userFilterConfigColumns] },
	{ key: "deletedAt", label: "Deleted At", type: "date" },
	{ key: "deletedBy", label: "Deleted By", type: "relation", relationFilterConfigColumn: () => ["User", userFilterConfigColumns] },
	{ key: "creditApplication", label: "Credit Application", type: "relation", relationFilterConfigColumn: () => ["Credit Application", creditApplicationFilterConfigColumns] },
	{ key: "officer", label: "Officer", type: "relation", relationFilterConfigColumn: () => ["User", userByRoleFilterConfigColumns("officer")] },
	{ key: "assignedDate", label: "Assigned Date", type: "date" },
	{ key: "surveyDate", label: "Survey Date", type: "date" },
	{ key: "approvalDate", label: "Approval Date", type: "date" },
	{ key: "dueDate", label: "Due Date", type: "date" },
	{ key: "rescheduleCount", label: "Reschedule Count", type: "number" },
	{ key: "changeRequestType", label: "Change Request Type", type: "select", selectOptions: changeRequestTypeSelectOptions },
	{ key: "reviewedAt", label: "Reviewed At", type: "date" },
	{ key: "reviewedBy", label: "Reviewed By", type: "relation", relationFilterConfigColumn: () => ["User", userFilterConfigColumns] },
	{ key: "reviewApproved", label: "Review Approved", type: "boolean" }
] as MenuFilterConfigColumn[]);
export const columnConfigColumns = Object.freeze([
	{ key: "id", label: "Id" },
	{ key: "createdAt", label: "Created At" },
	{ key: "createdBy", label: "Created By" },
	{ key: "updatedAt", label: "Updated At" },
	{ key: "updatedBy", label: "Updated By" },
	{ key: "deletedAt", label: "Deleted At" },
	{ key: "deletedBy", label: "Deleted By" },
	{ key: "creditApplication", label: "Credit Application" },
	{ key: "officer", label: "Officer" },
	{ key: "assignedDate", label: "Assigned Date" },
	{ key: "surveyDate", label: "Survey Date" },
	{ key: "approvalDate", label: "Approval Date" },
	{ key: "dueDate", label: "Due Date" },
	{ key: "rescheduleCount", label: "Reschedule Count" },
	{ key: "geofenceRegions", label: "Geofence Regions" },
	{ key: "changeRequestType", label: "Change Request Type" },
	{ key: "changeRequestComment", label: "Change Request Comment" },
	{ key: "#status", label: "Status" },
	{ key: "reviewedAt", label: "Reviewed At" },
	{ key: "reviewedBy", label: "Reviewed By" },
	{ key: "reviewApproved", label: "Review Approved" },
	{ key: "reviewComment", label: "Review Comment" }
] as MenuColumnConfigColumn[]);
export const tableConfigColumns = Object.freeze([
	{ key: "id", label: "Id", sortable: true, className: "text-xs" },
	{ key: "createdAt", label: "Created At", sortable: true },
	{ key: "createdBy", label: "Created By", sortable: false },
	{ key: "updatedAt", label: "Updated At", sortable: true },
	{ key: "updatedBy", label: "Updated By", sortable: false },
	{ key: "deletedAt", label: "Deleted At", sortable: true },
	{ key: "deletedBy", label: "Deleted By", sortable: false },
	{ key: "creditApplication", label: "Credit Application", sortable: false, className: "font-medium" },
	{ key: "officer", label: "Officer", sortable: false },
	{ key: "assignedDate", label: "Assigned Date", sortable: true },
	{ key: "surveyDate", label: "Survey Date", sortable: true },
	{ key: "approvalDate", label: "Approval Date", sortable: true },
	{ key: "dueDate", label: "Due Date", sortable: true },
	{ key: "rescheduleCount", label: "Reschedule Count", sortable: true },
	{ key: "geofenceRegions", label: "Geofence Regions", sortable: false },
	{ key: "changeRequestType", label: "Change Request Type", sortable: true },
	{ key: "changeRequestComment", label: "Change Request Comment", sortable: false, className: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" },
	{ key: "#status", label: "Status", sortable: false },
	{ key: "reviewedAt", label: "Reviewed At", sortable: true },
	{ key: "reviewedBy", label: "Reviewed By", sortable: false },
	{ key: "reviewApproved", label: "Review Approved", sortable: true },
	{ key: "reviewComment", label: "Review Comment", sortable: false, className: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" }
] as MenuTableConfigColumn[]);
export const rowValueRendererConfigColumns = Object.freeze([
	{ key: "id", type: "text", render: v => (<span className="font-mono">{v}</span>) },
	{ key: "createdAt", type: "date" },
	{ key: "createdBy", type: "relation", render: defaultRelationUserRenderer({ description: "Created By", relationSource: "credit-application-assignments.createdBy" }) },
	{ key: "updatedAt", type: "date" },
	{ key: "updatedBy", type: "relation", render: defaultRelationUserRenderer({ description: "Updated By", relationSource: "credit-application-assignments.updatedBy" }) },
	{ key: "deletedAt", type: "date" },
	{ key: "deletedBy", type: "relation", render: defaultRelationUserRenderer({ description: "Deleted By", relationSource: "credit-application-assignments.deletedBy" }) },
	{ key: "creditApplication", type: "relation", render: defaultRelationCreditApplicationRenderer({ description: "Credit Application", relationSource: "credit-application-assignments.creditApplication" }) },
	{ key: "officer", type: "relation", render: defaultRelationUserRenderer({ description: "Officer", relationSource: "credit-application-assignments.officer" }) },
	{ key: "assignedDate", type: "date" },
	{ key: "surveyDate", type: "date" },
	{ key: "approvalDate", type: "date" },
	{ key: "dueDate", type: "date" },
	{ key: "rescheduleCount", type: "number" },
	{ key: "changeRequestType", type: "select", selectOptions: changeRequestTypeSelectOptions, render: defaultChangeRequestRenderer({ selectOptions: changeRequestTypeSelectOptions }) },
	{ key: "changeRequestComment", type: "richText" },
	{ key: "#status", type: "null", render: defaultStatusRenderer() },
	{ key: "reviewedAt", type: "date" },
	{ key: "reviewedBy", type: "relation", render: defaultRelationUserRenderer({ description: "Reviewed By", relationSource: "credit-application-assignments.reviewedBy" }) },
	{ key: "reviewApproved", type: "boolean" },
	{ key: "reviewComment", type: "richText" }
] as MenuRowValueRendererConfigColumn<ColumnData, RowValueRendererContext>[]);
export type RowValueRendererContext = {
	relationValues?: RelationValues;
	isMutating?: boolean;
	setChangeRequestDrawerRow?: (v: ColumnData | null) => void;
	setChangeRequestDrawerOpen?: (v: boolean) => void;
	setReviewDrawerRow?: (v: ColumnData | null) => void;
	setReviewDrawerOpen?: (v: boolean) => void;
	setEditFormDrawerState?: (v: FormState) => void;
	setEditFormDrawerOpen?: (v: boolean) => void;
	setDeleteTargetRow?: (v: ColumnData | null) => void;
	setCancelPendingRequestTargetRow?: (v: ColumnData | null) => void;
	setRevertApprovedTargetRow?: (v: ColumnData | null) => void;
	setRestoreDeletionTargetRow?: (v: ColumnData | null) => void;
} & MenuRowValueRendererContext;
export const eligibleDetailsTriggerColumns = Object.freeze([
	"id",
	"assignedDate",
	"surveyDate",
	"approvalDate",
	"dueDate",
	"rescheduleCount",
	"createdAt",
	"updatedAt",
	"deletedAt",
	"reviewedAt",
	"reviewApproved"
]);
export const drawerValueRendererConfigColumns = rowValueRendererConfigColumns;
export const defaultColumnOrder = Object.freeze([
	"id",
	"creditApplication",
	"officer",
	"assignedDate",
	"surveyDate",
	"approvalDate",
	"dueDate",
	"rescheduleCount",
	"geofenceRegions",
	"createdBy",
	"updatedBy",
	"deletedBy",
	"createdAt",
	"updatedAt",
	"deletedAt",
	"changeRequestType",
	"changeRequestComment",
	"#status",
	"reviewedAt",
	"reviewedBy",
	"reviewApproved",
	"reviewComment"
]) as string[];
export const defaultColumnsShown = Object.freeze([
	"creditApplication",
	"officer",
	"assignedDate",
	"surveyDate",
	"approvalDate",
	"dueDate",
	"changeRequestType",
	"#status",
	"updatedAt",
	"reviewComment"
]) as string[];
export const defaultColumnsSort = Object.freeze([
	["updatedAt", false]
]) as [string, boolean][];

export function DetailsDrawer(
	{ open, onOpenChange, row, rowValueRendererContext, renderActions, onOpenHistory }:
	{ open: boolean, onOpenChange: (v: boolean) => void, row: ColumnData | null, rowValueRendererContext: RowValueRendererContext, renderActions?: (r: ColumnData) => React.ReactNode, onOpenHistory?: () => void }
) {
	const { user } = useDashboardContext();
	const canAccessHistory = user.roleMenus.includes("credit-application-assignment#auditor");
	const query = useQuery({
		queryKey: ["credit-application-assignment", "details", row?.id ?? null],
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
					<DrawerTitle>Credit Application Assignment Request Details</DrawerTitle>
					<DrawerDescription>Review all available columns for this credit application assignment request entry.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
					{row == null ? (
						<p className="text-muted-foreground text-sm">
							No credit application assignment request selected.
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
								{`${query.error?.message ?? "Unable to load credit application assignment request details."}`}
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
					{canAccessHistory && onOpenHistory != null ? (
						<Button type="button" variant="secondary" onClick={onOpenHistory} disabled={row == null}>
							<HistoryIcon />History
						</Button>
					) : null}
					{row != null && renderActions != null ? (
						renderActions(row)
					) : null}
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
export function HistoryDrawer(
	{ open, onOpenChange, row, rowValueRendererContext }:
	{ open: boolean, onOpenChange: (v: boolean) => void, row: ColumnData | null, rowValueRendererContext: RowValueRendererContext }
) {
	const { user } = useDashboardContext();
	const canAccessHistory = user.roleMenus.includes("credit-application-assignment#auditor");
	const query = useQuery({
		queryKey: ["credit-application-assignment", "history", row?.id ?? null],
		enabled: canAccessHistory && open && row != null,
		queryFn: async () => await getHistoryAction(row!.id),
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
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-3xl">
				<DrawerHeader>
					<DrawerTitle>Credit Application Assignment Request History</DrawerTitle>
					<DrawerDescription>Changes are shown from the most recent version to the earliest version.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
					{row == null ? (
						<p className="text-muted-foreground text-sm">No credit application assignment request selected.</p>
					) : !canAccessHistory ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>Unauthorized</AlertTitle>
							<AlertDescription>You need Credit Application Assignment auditor access to view history.</AlertDescription>
						</Alert>
					) : query.isPending ? (
						<div className="space-y-2">
							<Skeleton className="h-28 w-full" />
							<Skeleton className="h-28 w-full" />
						</div>
					) : query.isError || query.data == null ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>
								{`${query.error?.name ?? "Error"}`}
							</AlertTitle>
							<AlertDescription>
								{`${query.error?.message ?? "Unable to load credit application assignment request details."}`}
							</AlertDescription>
						</Alert>
					) : query.data.entries.length == 0 ? (
						<p className="text-muted-foreground text-sm">
							No history entries found for this credit application assignment request.
						</p>
					) : (
						query.data.entries.map((entry, index, entries) => {
							const changedColumns = drawerValueRendererConfigColumns.filter(column => JSON.stringify(entry[column.key] ?? null) !=
								JSON.stringify(entries[index + 1]?.[column.key] ?? null));
							return (
								<div key={entry.versionId} className="space-y-2 rounded-lg border p-3">
									<div className="flex items-center justify-between gap-2">
										<p className="text-sm font-semibold">{new Date(entry.updatedAt).toLocaleString()}</p>
										<Badge variant="outline">{changedColumns.length} change(s)</Badge>
									</div>
									<div className="space-y-1">
										{changedColumns.length == 0 ? (
											<p className="text-muted-foreground text-xs">No field changes detected.</p>
										) : changedColumns.map(changedColumn => (
											<div key={changedColumn.key} className="space-y-0.5 rounded-md border p-2 text-xs">
												<div className="font-medium">{columnLabels[changedColumn.key]}</div>
												<div className="text-muted-foreground">From: {entries[index + 1] != null ? renderValue(entries[index + 1], changedColumn.key) : "-"}</div>
												<div>To: {renderValue(entry, changedColumn.key)}</div>
											</div>
										))}
									</div>
								</div>
							);
						})
					)}
				</div>
				<DrawerFooter className="border-t sm:flex-row sm:items-center sm:justify-end">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
export function ChangeRequestDrawer(
	{ open, onOpenChange, row, rowValueRendererContext }:
	{ open: boolean, onOpenChange: (v: boolean) => void, row: ColumnData | null, rowValueRendererContext: RowValueRendererContext }
) {
	const query = useQuery({
		queryKey: ["credit-application-assignment", "change-request-diff", row?.id ?? null],
		enabled: open && row != null,
		queryFn: async () => await getDifferenceAction(row!.id),
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});
	const diffs = query.data != null ? [...new Set([...Object.keys(query.data.approvedVersion ?? {}), ...Object.keys(query.data.requestedVersion)])]
		.map(columnKey => [columnKey, JSON.stringify(query.data.approvedVersion?.[columnKey] ?? null) != JSON.stringify(query.data.requestedVersion[columnKey] ?? null)] as const) : null;
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
					<DrawerTitle>Request Changes</DrawerTitle>
					<DrawerDescription>Review the differences between the last approved version and the selected request.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
					<div className="bg-muted/30 rounded-lg border p-3 text-sm">
						<p>
							<span className="font-medium">Request Type</span>{": "}
							{changeRequestTypeSelectOptions.find(option => option.value == query.data?.requestedVersion?.changeRequestType)?.label ?? "-"}
						</p>
						<p className="text-muted-foreground">
							{diffs != null ? `${diffs.filter(([_, changed]) => changed).length} changed field(s)` : "Loading differences..."}
						</p>
					</div>
					{row == null ? (
						<p className="text-muted-foreground text-sm">
							Changes are not available.
						</p>
					) : query.isPending ? (
						<div className="space-y-2">
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
						</div>
					) : query.isError || diffs == null ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>{`${query.error?.name ?? "Error"}`}</AlertTitle>
							<AlertDescription>{`${query.error?.message ?? "Unable to load request changes."}`}</AlertDescription>
						</Alert>
					) : (
						<div className="space-y-2">
							{diffs.map(([columnKey, changed]) => (
								<div key={columnKey} className="space-y-2 rounded-lg border p-3">
									<div className="flex items-center justify-between gap-2">
										<p className="text-sm font-medium">{columnLabels[columnKey]}</p>
										<Badge variant={changed ? "default" : "secondary"}>
											{changed ? "Changed" : "Unchanged"}
										</Badge>
									</div>
									<div className="grid gap-2 sm:grid-cols-2">
										<div className="space-y-1">
											<p className="text-muted-foreground text-xs font-medium">Last Approved</p>
											<div className="bg-muted/50 min-h-9 rounded border px-2 py-1.5 wrap-break-word">
												{query.data.approvedVersion != null ? renderValue(query.data.approvedVersion, columnKey) : "-"}
											</div>
										</div>
										<div className="space-y-1">
											<p className="text-muted-foreground text-xs font-medium">Requested</p>
											<div className="bg-muted/10 min-h-9 rounded border px-2 py-1.5 wrap-break-word">
												{renderValue(query.data.requestedVersion, columnKey)}
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
				<DrawerFooter className="border-t sm:flex-row sm:justify-end">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

export function ReviewDrawer(
	{ open, onOpenChange, row, rowValueRendererContext, reviewComment, onReviewCommentChange, onApprove, onReject, mutationError, isMutating = false }:
	{ open: boolean, onOpenChange: (v: boolean) => void, row: ColumnData | null, rowValueRendererContext: RowValueRendererContext, reviewComment: SerializedEditorState, onReviewCommentChange: (v: SerializedEditorState) => void, onApprove: () => void, onReject: () => void, mutationError?: any, isMutating?: boolean }
) {
	const query = useQuery({
		queryKey: ["credit-application-assignment", "change-request-diff", row?.id ?? null],
		enabled: open && row != null,
		queryFn: async () => await getDifferenceAction(row!.id),
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});
	const diffs = query.data != null ? [...new Set([...Object.keys(query.data.approvedVersion ?? {}), ...Object.keys(query.data.requestedVersion)])]
		.map(columnKey => [columnKey, JSON.stringify(query.data.approvedVersion?.[columnKey] ?? null) != JSON.stringify(query.data.requestedVersion[columnKey] ?? null)] as const) : null;
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
					<DrawerTitle>Review</DrawerTitle>
					<DrawerDescription>Review the differences between the last approved version and the current pending request before making a decision.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
					<div className="bg-muted/30 rounded-lg border p-3 text-sm">
						<p>
							<span className="font-medium">Request Type</span>{": "}
							{changeRequestTypeSelectOptions.find(option => option.value == query.data?.requestedVersion?.changeRequestType)?.label ?? "-"}
						</p>
						<p className="text-muted-foreground">
							{diffs != null ? `${diffs.filter(([_, changed]) => changed).length} changed field(s)` : "Loading differences..."}
						</p>
					</div>
					{row == null ? (
						<p className="text-muted-foreground text-sm">
							Changes are not available.
						</p>
					) : query.isPending ? (
						<div className="space-y-2">
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
						</div>
					) : query.isError || diffs == null ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>{`${query.error?.name ?? "Error"}`}</AlertTitle>
							<AlertDescription>{`${query.error?.message ?? "Unable to load request changes."}`}</AlertDescription>
						</Alert>
					) : (
						<div className="space-y-2">
							{diffs.map(([columnKey, changed]) => (
								<div key={columnKey} className="space-y-2 rounded-lg border p-3">
									<div className="flex items-center justify-between gap-2">
										<p className="text-sm font-medium">{columnLabels[columnKey]}</p>
										<Badge variant={changed ? "default" : "secondary"}>
											{changed ? "Changed" : "Unchanged"}
										</Badge>
									</div>
									<div className="grid gap-2 sm:grid-cols-2">
										<div className="space-y-1">
											<p className="text-muted-foreground text-xs font-medium">Last Approved</p>
											<div className="bg-muted/50 min-h-9 rounded border px-2 py-1.5 wrap-break-word">
												{query.data.approvedVersion != null ? renderValue(query.data.approvedVersion, columnKey) : "-"}
											</div>
										</div>
										<div className="space-y-1">
											<p className="text-muted-foreground text-xs font-medium">Requested</p>
											<div className="bg-muted/10 min-h-9 rounded border px-2 py-1.5 wrap-break-word">
												{renderValue(query.data.requestedVersion, columnKey)}
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
					{mutationError != null ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>{`${mutationError?.name ?? "Error"}`}</AlertTitle>
							<AlertDescription>{`${mutationError?.message ?? "Unable to submit review."}`}</AlertDescription>
						</Alert>
					) : null}
					<div className="space-y-2">
						<label className="text-sm font-medium">Review Comment</label>
						<RichTextInput
							serializedState={reviewComment}
							onSerializedStateChange={onReviewCommentChange}
							onImageUpload={uploadGenericRichtextImage}
							disabled={isMutating}
						/>
					</div>
				</div>
				<DrawerFooter className="border-t sm:flex-row sm:justify-end">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
					<Button type="button" variant="default" onClick={onApprove} disabled={isMutating || diffs == null}>Approve</Button>
					<Button type="button" variant="destructive" onClick={onReject} disabled={isMutating || diffs == null}>Reject</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
export type FormState = {
	id?: string;
	creditApplications?: string[];
	officer?: string;
	assignedDate?: string;
	surveyDate?: string;
	approvalDate?: string;
	dueDate?: string;
	rescheduleCount?: number;
	geofenceRegions?: any;
	changeRequestComment?: any;
};
export function toFormState(data: CreditApplicationAssignment) {
	const creditApplication = getRelationshipId(data.creditApplication);
	return {
		id: data.id,
		creditApplications: creditApplication != null ? [creditApplication] : [],
		officer: getRelationshipId(data.officer),
		changeRequestComment: data.changeRequestComment
	} as FormState;
}
export function FormDrawer(
	{ open, onOpenChange, title, formState, onFormStateChange, onSubmit, mutationError, isMutating }:
	{ open: boolean, onOpenChange: (v: boolean) => void, title: string, formState: FormState, onFormStateChange: (v: FormState) => void, onSubmit?: () => void, mutationError?: any, isMutating?: boolean }
) {
	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-2xl">
				<DrawerHeader>
					<DrawerTitle>{title}</DrawerTitle>
					<DrawerDescription>Changes in editor mode create pending credit application assignment requests that require approver review before publication.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 overflow-y-auto px-4">
					<div className="pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
						{formState.id == null ? (
							<div className="space-y-2 sm:col-span-2">
								<div className="flex items-center justify-between">
									<label className="text-sm font-medium">Credit Applications</label>
									<Badge variant="outline">{(formState.creditApplications ?? []).length} selected</Badge>
								</div>
								<SearchableMultiSelect
									values={formState.creditApplications ?? []}
									onValuesChange={values => onFormStateChange({ ...formState, creditApplications: values })}
									options={[]}
									onSearch={(keyword, selectedValues) => searchAvailableRelationCreditApplicationsAction(keyword, selectedValues)
										.then(creditApplications => creditApplications.map(creditApplication => ({
											value: creditApplication.id,
											label: creditApplication.label
										})))}
									placeholder="Search credit applications"
									searchPlaceholder="Search credit applications..."
									disabled={isMutating}
								/>
							</div>
						) : (
							<div className="space-y-2 sm:col-span-2">
								<label className="text-sm font-medium">Credit Application</label>
								<SearchableSelect
									value={formState.creditApplications![0]}
									onValueChange={value => onFormStateChange({ ...formState, creditApplications: value.length > 0 ? [value] : [] })}
									options={[]}
									onSearch={(keyword, selectedValues) => searchAvailableRelationCreditApplicationsAction(keyword, selectedValues)
										.then(creditApplications => creditApplications.map(creditApplication => ({
											value: creditApplication.id,
											label: creditApplication.label
										})))}
									disabled={isMutating}
									placeholder="Search credit application"
									searchPlaceholder="Search credit application..."
									allowClear
								/>
							</div>
						)}
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Officer</label>
							<SearchableSelect
								value={formState.officer!}
								onValueChange={value => onFormStateChange({ ...formState, officer: value })}
								options={[]}
								onSearch={(keyword, selectedValues) => searchRelationUsersByRoleLevelAction("officer", keyword, selectedValues)
									.then(users => users.map(user => ({
										value: user.id,
										label: user.label
									})))}
								disabled={isMutating}
								placeholder="Search officer"
								searchPlaceholder="Search officer..."
								allowClear
							/>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Change Request Comment</label>
							<RichTextInput
								serializedState={formState.changeRequestComment ?? undefined}
								onSerializedStateChange={value => onFormStateChange({ ...formState, changeRequestComment: value })}
								onImageUpload={uploadGenericRichtextImage}
								disabled={isMutating}
							/>
						</div>
						{mutationError != null ? (
							<Alert variant="destructive" className="sm:col-span-2">
								<CircleAlertIcon />
								<AlertTitle>{`${mutationError?.name ?? "Error"}`}</AlertTitle>
								<AlertDescription>{`${mutationError?.message ?? "Unable to submit form."}`}</AlertDescription>
							</Alert>
						) : null}
					</div>
				</div>
				<DrawerFooter className="border-t sm:flex-row sm:justify-end">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isMutating}>Cancel</Button>
					<Button type="button" onClick={onSubmit} disabled={isMutating}>Save</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

export function DeleteDialog(
	{ open, onOpenChange, onConfirm, changeRequestComment, onChangeRequestCommentChange, isMutating }:
	{ open: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void, changeRequestComment: SerializedEditorState, onChangeRequestCommentChange: (v: SerializedEditorState) => void, isMutating: boolean }
) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete</AlertDialogTitle>
					<AlertDialogDescription>
						Delete does not hard-delete data. It creates a pending delete request by setting deletedAt, and requires approver review.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className="space-y-2">
					<label className="text-sm font-medium">Change Request Comment</label>
					<RichTextInput
						serializedState={changeRequestComment}
						onSerializedStateChange={onChangeRequestCommentChange}
						onImageUpload={uploadGenericRichtextImage}
						disabled={isMutating}
					/>
				</div>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={onConfirm} disabled={isMutating}>Delete</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function CancelPendingRequestDialog(
	{ open, onOpenChange, onConfirm, isMutating }:
	{ open: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void, isMutating: boolean }
) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Cancel Pending Request</AlertDialogTitle>
					<AlertDialogDescription>
						This will cancel the pending request and keep the last approved version unchanged.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isMutating}>Back</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm} disabled={isMutating}>Cancel Pending</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function RevertApprovedDialog(
	{ open, onOpenChange, onConfirm, isMutating }:
	{ open: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void, isMutating: boolean }
) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Revert Approved</AlertDialogTitle>
					<AlertDialogDescription>
						This will revert the data to the last approved version.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isMutating}>Back</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm} disabled={isMutating}>Revert Approved</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function RestoreDeletionDialog(
	{ open, onOpenChange, onConfirm, changeRequestComment, onChangeRequestCommentChange, isMutating }:
	{ open: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void, changeRequestComment: SerializedEditorState, onChangeRequestCommentChange: (v: SerializedEditorState) => void, isMutating: boolean }
) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Restore Deletion</AlertDialogTitle>
					<AlertDialogDescription>
						This will create a new change request to restore the data.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className="space-y-2">
					<label className="text-sm font-medium">Change Request Comment</label>
					<RichTextInput
						serializedState={changeRequestComment}
						onSerializedStateChange={onChangeRequestCommentChange}
						onImageUpload={uploadGenericRichtextImage}
						disabled={isMutating}
					/>
				</div>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isMutating}>Back</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm} disabled={isMutating}>Restore Deletion</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
