"use client";

import { memo, useRef, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { SerializedEditorState } from "lexical";
import { HistoryIcon, CircleAlertIcon } from "lucide-react";

import { lexicalPlainText } from "@/utils/payload";
import { RichTextInput } from "@/components/RichText";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { AlertDialog, AlertDialogTitle, AlertDialogAction, AlertDialogCancel, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogDescription } from "@/components/radix/AlertDialog";
import { Badge } from "@/components/radix/Badge";
import { Button } from "@/components/radix/Button";
import { Drawer, DrawerTitle, DrawerFooter, DrawerHeader, DrawerContent, DrawerDescription } from "@/components/radix/Drawer";
import { Input } from "@/components/radix/Input";
import { Label } from "@/components/radix/Label";
import { Select, SelectItem, SelectValue, SelectContent, SelectTrigger } from "@/components/radix/Select";
import { Skeleton } from "@/components/radix/Skeleton";
import { Switch } from "@/components/radix/Switch";
import { Access } from "@/payload-types";

import { uploadGenericRichtextImage } from "../../editor-x.actions";
import { columnConfigColumns as creditApplicationAssignmentColumnConfigColumns, filterConfigColumns as creditApplicationAssignmentFilterConfigColumns } from "../credit-application-assignment/layout.components";
import { columnConfigColumns as creditApplicationImportColumnConfigColumns, filterConfigColumns as creditApplicationImportFilterConfigColumns } from "../credit-application-management/import.components";
import { columnConfigColumns as creditApplicationColumnConfigColumns, filterConfigColumns as creditApplicationFilterConfigColumns } from "../credit-application-management/layout.components";
import { columnConfigColumns as gpsLogColumnConfigColumns, filterConfigColumns as gpsLogFilterConfigColumns } from "../gps-log/layout.components";
import { MenuFilterState, MenuFilterSummary, useDashboardContext, MenuFilterConfigCard, defaultStatusRenderer, MenuTableConfigColumn, MenuColumnConfigColumn, MenuFilterConfigColumn, useMenuRowValueRenderer, MenuRowValueRendererContext, defaultChangeRequestRenderer, MenuRowValueRendererConfigColumn } from "../layout.components";
import { changeRequestTypeSelectOptions } from "../layout.shared";
import { columnConfigColumns as loginLogColumnConfigColumns, filterConfigColumns as loginLogFilterConfigColumns } from "../login-log/layout.components";
import { columnConfigColumns as officerTaskColumnConfigColumns, filterConfigColumns as officerTaskFilterConfigColumns } from "../officer-task/layout.components";
import { columnConfigColumns as otpLogColumnConfigColumns, filterConfigColumns as otpLogFilterConfigColumns } from "../otp-log/layout.components";
import { columnConfigColumns as recordingLogColumnConfigColumns, filterConfigColumns as recordingLogFilterConfigColumns } from "../recording-log/layout.components";
import { searchRelationAccessesAction } from "../relation-navigation.actions";
import { defaultRelationUserRenderer } from "../relation-navigation.components";
import { columnConfigColumns as roleColumnConfigColumns, filterConfigColumns as roleFilterConfigColumns } from "../role-management/layout.components";
import { columnConfigColumns as satisfactionSurveyColumnConfigColumns, filterConfigColumns as satisfactionSurveyFilterConfigColumns } from "../satisfaction-survey-management/layout.components";
import { columnConfigColumns as satisfactionSurveyResultColumnConfigColumns, filterConfigColumns as satisfactionSurveyResultFilterConfigColumns } from "../satisfaction-survey-result/layout.components";
import { columnConfigColumns as surveyColumnConfigColumns, filterConfigColumns as surveyFilterConfigColumns } from "../survey-management/layout.components";
import { columnConfigColumns as surveyResultColumnConfigColumns, filterConfigColumns as surveyResultFilterConfigColumns } from "../survey-result/layout.components";
import { columnConfigColumns as teamColumnConfigColumns, filterConfigColumns as teamFilterConfigColumns } from "../team-management/layout.components";
import { userFilterConfigColumns, columnConfigColumns as userColumnConfigColumns } from "../user-management/layout.components";
import { RelationValues, getDetailsAction, getHistoryAction, queryViewerAction, getDifferenceAction } from "./layout.actions";
import { maskOptionsMap, collectionMaskFields, operationSelectOptions, collectionSelectOptions } from "./layout.shared";

const collectionFilterConfigColumns = {
	"staged-users": userFilterConfigColumns,
	"roles": roleFilterConfigColumns,
	"teams": teamFilterConfigColumns,
	// "accesses": filterConfigColumns,
	"credit-applications": creditApplicationFilterConfigColumns,
	"credit-application-imports": creditApplicationImportFilterConfigColumns,
	"credit-application-assignments": creditApplicationAssignmentFilterConfigColumns,
	"officer-tasks": officerTaskFilterConfigColumns,
	"surveys": surveyFilterConfigColumns,
	"survey-results": surveyResultFilterConfigColumns,
	"satisfaction-surveys": satisfactionSurveyFilterConfigColumns,
	"satisfaction-survey-results": satisfactionSurveyResultFilterConfigColumns,
	"login-logs": loginLogFilterConfigColumns,
	"gps-logs": gpsLogFilterConfigColumns,
	"otp-logs": otpLogFilterConfigColumns,
	"recording-logs": recordingLogFilterConfigColumns
} as Record<string, readonly MenuFilterConfigColumn[]>;
const collectionColumnConfigColumns = {
	"staged-users": userColumnConfigColumns,
	"roles": roleColumnConfigColumns,
	"teams": teamColumnConfigColumns,
	// "accesses": columnConfigColumns,
	"credit-applications": creditApplicationColumnConfigColumns,
	"credit-application-imports": creditApplicationImportColumnConfigColumns,
	"credit-application-assignments": creditApplicationAssignmentColumnConfigColumns,
	"officer-tasks": officerTaskColumnConfigColumns,
	"surveys": surveyColumnConfigColumns,
	"survey-results": surveyResultColumnConfigColumns,
	"satisfaction-surveys": satisfactionSurveyColumnConfigColumns,
	"satisfaction-survey-results": satisfactionSurveyResultColumnConfigColumns,
	"login-logs": loginLogColumnConfigColumns,
	"gps-logs": gpsLogColumnConfigColumns,
	"otp-logs": otpLogColumnConfigColumns,
	"recording-logs": recordingLogColumnConfigColumns
} as Record<string, readonly MenuColumnConfigColumn[]>;
const defaultAccessFilterRenderer = ({ collection }: { collection?: Access["collection"] } = {}) =>
	(value: MenuFilterState[], { collection: collection_ }: { collection: Access["collection"] }) => (
		<MenuFilterSummary columns={collectionFilterConfigColumns[collection ?? collection_]} filters={value ?? []} contentOnly />
	);
const defaultAccessMaskRenderer = () =>
	(value: Record<string, string>, { collection }: { collection: Access["collection"] }, { accessMaskClamp }: { accessMaskClamp?: boolean }) => (sortedValues => (
		<div className="flex flex-wrap gap-1">
			{(accessMaskClamp == true ? sortedValues.slice(0, 2) : sortedValues).map(([k, v]) => (
				<Badge key={k} variant="outline" className="text-xs">
					{collectionColumnConfigColumns[collection].find(c => c.key == k)!.label}: {maskOptionsMap[collectionMaskFields[collection][k]].find(o => o.value == v)!.label}
				</Badge>
			))}
			{accessMaskClamp == true && sortedValues.length > 2 ? (
				<Badge variant="outline" className="text-xs">+{sortedValues.length - 2} more</Badge>
			) : null}
		</div>
	))(collectionColumnConfigColumns[collection].filter(c => value[c.key] != null).map(c => [c.key, value[c.key]] as const));

export type ColumnData = Awaited<ReturnType<typeof queryViewerAction>>["docs"][number];
export const filterConfigColumns = Object.freeze([
	{ key: "id", label: "Id", type: "relation", relationSearch: searchRelationAccessesAction },
	{ key: "createdAt", label: "Created At", type: "date" },
	{ key: "createdBy", label: "Created By", type: "relation", relationFilterConfigColumn: () => ["User", userFilterConfigColumns] },
	{ key: "updatedAt", label: "Updated At", type: "date" },
	{ key: "updatedBy", label: "Updated By", type: "relation", relationFilterConfigColumn: () => ["User", userFilterConfigColumns] },
	{ key: "deletedAt", label: "Deleted At", type: "date" },
	{ key: "deletedBy", label: "Deleted By", type: "relation", relationFilterConfigColumn: () => ["User", userFilterConfigColumns] },
	{ key: "name", label: "Name", type: "text" },
	{ key: "enabled", label: "Enabled", type: "boolean" },
	{ key: "priority", label: "Priority", type: "number" },
	{ key: "operation", label: "Operation", type: "select", selectOptions: operationSelectOptions },
	{ key: "collection", label: "Collection", type: "select", selectOptions: collectionSelectOptions },
	{ key: "changeRequestType", label: "Request", type: "select", selectOptions: changeRequestTypeSelectOptions },
	{ key: "reviewedAt", label: "Reviewed At", type: "date" },
	{ key: "reviewedBy", label: "Reviewed By", type: "relation", relationFilterConfigColumn: () => ["User", userFilterConfigColumns] },
	{ key: "reviewApproved", label: "Review Approved", type: "boolean" }
] as MenuFilterConfigColumn[]);
collectionFilterConfigColumns["accesses"] = filterConfigColumns;
export const columnConfigColumns = Object.freeze([
	{ key: "id", label: "Id" },
	{ key: "createdAt", label: "Created At" },
	{ key: "createdBy", label: "Created By" },
	{ key: "updatedAt", label: "Updated At" },
	{ key: "updatedBy", label: "Updated By" },
	{ key: "deletedAt", label: "Deleted At" },
	{ key: "deletedBy", label: "Deleted By" },
	{ key: "name", label: "Name" },
	{ key: "description", label: "Description" },
	{ key: "enabled", label: "Enabled" },
	{ key: "priority", label: "Priority" },
	{ key: "operation", label: "Operation" },
	{ key: "subjectUserFilters", label: "Subject User Filters" },
	{ key: "subjectTeamFilters", label: "Subject Team Filters" },
	{ key: "subjectRoleFilters", label: "Subject Role Filters" },
	{ key: "collection", label: "Collection" },
	{ key: "filters", label: "Filters" },
	{ key: "masks", label: "Masks" },
	{ key: "changeRequestType", label: "Request" },
	{ key: "changeRequestComment", label: "Change Request Comment" },
	{ key: "#status", label: "Status" },
	{ key: "reviewedAt", label: "Reviewed At" },
	{ key: "reviewedBy", label: "Reviewed By" },
	{ key: "reviewApproved", label: "Review Approved" },
	{ key: "reviewComment", label: "Review Comment" }
] as MenuColumnConfigColumn[]);
collectionColumnConfigColumns["accesses"] = columnConfigColumns;
export const tableConfigColumns = Object.freeze([
	{ key: "id", label: "Id", sortable: true, className: "text-xs" },
	{ key: "createdAt", label: "Created At", sortable: true },
	{ key: "createdBy", label: "Created By", sortable: false },
	{ key: "updatedAt", label: "Updated At", sortable: true },
	{ key: "updatedBy", label: "Updated By", sortable: false },
	{ key: "deletedAt", label: "Deleted At", sortable: true },
	{ key: "deletedBy", label: "Deleted By", sortable: false },
	{ key: "name", label: "Name", sortable: true, className: "font-medium" },
	{ key: "description", label: "Description", sortable: false, className: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" },
	{ key: "enabled", label: "Enabled", sortable: true },
	{ key: "priority", label: "Priority", sortable: true },
	{ key: "operation", label: "Operation", sortable: true },
	{ key: "subjectUserFilters", label: "Subject User Filters", sortable: false },
	{ key: "subjectTeamFilters", label: "Subject Team Filters", sortable: false },
	{ key: "subjectRoleFilters", label: "Subject Role Filters", sortable: false },
	{ key: "collection", label: "Collection", sortable: true },
	{ key: "filters", label: "Filters", sortable: false },
	{ key: "masks", label: "Masks", sortable: false },
	{ key: "changeRequestType", label: "Request", sortable: true },
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
	{ key: "createdBy", type: "relation", render: defaultRelationUserRenderer({ description: "Created By", relationSource: "accesses.createdBy" }) },
	{ key: "updatedAt", type: "date" },
	{ key: "updatedBy", type: "relation", render: defaultRelationUserRenderer({ description: "Updated By", relationSource: "accesses.updatedBy" }) },
	{ key: "deletedAt", type: "date" },
	{ key: "deletedBy", type: "relation", render: defaultRelationUserRenderer({ description: "Deleted By", relationSource: "accesses.deletedBy" }) },
	{ key: "name", type: "text" },
	{ key: "description", type: "richText" },
	{ key: "enabled", type: "boolean" },
	{ key: "priority", type: "number" },
	{ key: "operation", type: "select", selectOptions: operationSelectOptions },
	{ key: "subjectUserFilters", type: "null", render: defaultAccessFilterRenderer({ collection: "staged-users" }) },
	{ key: "subjectTeamFilters", type: "null", render: defaultAccessFilterRenderer({ collection: "teams" }) },
	{ key: "subjectRoleFilters", type: "null", render: defaultAccessFilterRenderer({ collection: "roles" }) },
	{ key: "collection", type: "select", selectOptions: collectionSelectOptions },
	{ key: "filters", type: "null", render: defaultAccessFilterRenderer() },
	{ key: "masks", type: "null", render: defaultAccessMaskRenderer() },
	{ key: "changeRequestType", type: "select", selectOptions: changeRequestTypeSelectOptions, render: defaultChangeRequestRenderer() },
	{ key: "changeRequestComment", type: "richText" },
	{ key: "#status", type: "null", render: defaultStatusRenderer() },
	{ key: "reviewedAt", type: "date" },
	{ key: "reviewedBy", type: "relation", render: defaultRelationUserRenderer({ description: "Reviewed By", relationSource: "accesses.reviewedBy" }) },
	{ key: "reviewApproved", type: "boolean" },
	{ key: "reviewComment", type: "richText" }
] as MenuRowValueRendererConfigColumn<ColumnData, RowValueRendererContext>[]);
export type RowValueRendererContext = {
	relationValues?: RelationValues;
	accessMaskClamp?: boolean;
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
	"createdAt",
	"updatedAt",
	"deletedAt",
	"name",
	"collection",
	"reviewedAt",
	"reviewApproved"
]);
export const drawerValueRendererConfigColumns = rowValueRendererConfigColumns;
export const defaultColumnOrder = Object.freeze([
	"id",
	"name",
	"description",
	"enabled",
	"priority",
	"operation",
	"subjectUserFilters",
	"subjectTeamFilters",
	"subjectRoleFilters",
	"collection",
	"filters",
	"masks",
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
	"name",
	"collection",
	"filters",
	"enabled",
	"priority",
	"changeRequestType",
	"#status",
	"updatedAt",
	"reviewComment"
]) as string[];
export const defaultColumnsSort = Object.freeze([
	["priority", false],
	["createdAt", false]
]) as [string, boolean][];

export function DetailsDrawer(
	{ open, onOpenChange, row, rowValueRendererContext, renderActions, onOpenHistory }:
	{ open: boolean, onOpenChange: (v: boolean) => void, row: ColumnData | null, rowValueRendererContext: RowValueRendererContext, renderActions?: (r: ColumnData) => React.ReactNode, onOpenHistory?: () => void }
) {
	const { user } = useDashboardContext();
	const canAccessHistory = user.roleMenus.includes("access-management#auditor");
	const query = useQuery({
		queryKey: ["access-management", "details", row?.id ?? null],
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
					<DrawerTitle>Access Request Details</DrawerTitle>
					<DrawerDescription>Review all available columns for this access request entry.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
					{row == null ? (
						<p className="text-muted-foreground text-sm">
							No access request selected.
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
								{`${query.error?.message ?? "Unable to load access request details."}`}
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
	const canAccessHistory = user.roleMenus.includes("access-management#auditor");
	const query = useQuery({
		queryKey: ["access-management", "history", row?.id ?? null],
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
					<DrawerTitle>Access Request History</DrawerTitle>
					<DrawerDescription>Changes are shown from the most recent version to the earliest version.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
					{row == null ? (
						<p className="text-muted-foreground text-sm">No access request selected.</p>
					) : !canAccessHistory ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>Unauthorized</AlertTitle>
							<AlertDescription>You need Access Management auditor access to view history.</AlertDescription>
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
								{`${query.error?.message ?? "Unable to load access request details."}`}
							</AlertDescription>
						</Alert>
					) : query.data.entries.length == 0 ? (
						<p className="text-muted-foreground text-sm">
							No history entries found for this access request.
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
		queryKey: ["access-management", "change-request-diff", row?.id ?? null],
		enabled: open && row != null,
		queryFn: async () => await getDifferenceAction(row!.id),
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});
	const diffs = query.data != null ? tableConfigColumns.filter(c => c.key != "id" && (c.key in (query.data.approvedVersion ?? {}) || c.key in query.data.requestedVersion)).map(c => c.key)
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
		queryKey: ["access-management", "change-request-diff", row?.id ?? null],
		enabled: open && row != null,
		queryFn: async () => await getDifferenceAction(row!.id),
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});
	const diffs = query.data != null ? tableConfigColumns.filter(c => c.key != "id" && (c.key in (query.data.approvedVersion ?? {}) || c.key in query.data.requestedVersion)).map(c => c.key)
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
	name?: string;
	description?: SerializedEditorState | null;
	enabled?: boolean;
	priority?: number;
	operation?: Access["operation"];
	subjectUserFilters?: any;
	subjectTeamFilters?: any;
	subjectRoleFilters?: any;
	collection?: Access["collection"];
	filters?: any;
	masks?: any;
	changeRequestComment?: any;
};
export function toFormState(data: Access) {
	return {
		id: data.id,
		name: data.name,
		description: data.description,
		enabled: data.enabled,
		priority: data.priority,
		operation: data.operation,
		subjectUserFilters: data.subjectUserFilters,
		subjectTeamFilters: data.subjectTeamFilters,
		subjectRoleFilters: data.subjectRoleFilters,
		collection: data.collection,
		filters: data.filters,
		masks: data.masks,
		changeRequestComment: data.changeRequestComment
	} as FormState;
}
export function FormDrawer(
	{ open, onOpenChange, title, formState, onFormStateChange, onSubmit, mutationError, isMutating = false }:
	{ open: boolean, onOpenChange: (v: boolean) => void, title: string, formState: FormState, onFormStateChange: (v: FormState) => void, onSubmit?: () => void, mutationError?: any, isMutating?: boolean }
) {
	const InternalMemoizedSelect = useMemo(() => memo((
		{ options, value, onValueChange, placeholder, disabled = false }:
		{ options: readonly { value: string, label: React.ReactNode }[], value: string | undefined, onValueChange: (v: string | undefined) => void, placeholder?: string, disabled?: boolean }
	) => (
		<Select
			value={value ?? ""}
			onValueChange={v => onValueChange(v != "<clear>" ? v : undefined)}
			disabled={disabled}
		>
			<SelectTrigger className="w-full">
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{value != null ? (
					<SelectItem value="<clear>">
						Clear
					</SelectItem>
				) : null}
				{options.map(o => (
					<SelectItem key={o.value} value={o.value}>
						{o.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)), []);
	const MemoizedSelect = useMemo(() => ({ options, onValueChange, ...props }: Parameters<typeof InternalMemoizedSelect>[0]) => {
		const onValueChangeRef = useRef(onValueChange);
		onValueChangeRef.current = onValueChange;
		const onValueChangeStable = useCallback((v: string | undefined) => onValueChangeRef.current(v), []);
		const optionsStable = useMemo(() => options, [options.some(o => o.label != null && typeof o.label == "object") ? options : JSON.stringify(options)]);
		return (<InternalMemoizedSelect options={optionsStable} onValueChange={onValueChangeStable} {...props} />);
	}, []);
	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-2xl">
				<DrawerHeader>
					<DrawerTitle>{title}</DrawerTitle>
					<DrawerDescription>Changes in editor mode create pending access requests that require approver review before publication.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 overflow-y-auto px-4">
					<div className="pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Name</label>
							<Input value={formState.name ?? ""} onChange={event => onFormStateChange({ ...formState, name: event.target.value })} disabled={isMutating} />
						</div>
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Description</label>
							<RichTextInput
								serializedState={formState.description ?? lexicalPlainText("")}
								onSerializedStateChange={value => onFormStateChange({ ...formState, description: value })}
								onImageUpload={uploadGenericRichtextImage}
								disabled={isMutating}
							/>
						</div>
						<div className="space-y-2">
							<div className="flex flex-row">
								<div className="flex-1 flex flex-col">
									<div className="flex items-center justify-between">
										<label className="text-sm font-medium">Enabled</label>
									</div>
									<div className="my-auto flex items-center space-x-2">
										<Switch id="access-management-enabled-switch" checked={formState.enabled ?? false} onCheckedChange={v => onFormStateChange({ ...formState, enabled: v })} disabled={isMutating} />
										<Label htmlFor="access-management-enabled-switch">{(formState.enabled ?? false) ? "Enabled" : "Disabled"}</Label>
									</div>
								</div>
								<div className="flex-1">
									<label className="text-sm font-medium">Priority</label>
									<Input type="number" value={formState.priority ?? ""} onChange={e => onFormStateChange({ ...formState, priority: e.target.value != "" ? e.target.valueAsNumber : undefined })} disabled={isMutating} />
								</div>
							</div>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Operation</label>
							<Select value={formState.operation} onValueChange={value => onFormStateChange({ ...formState, operation: value as any })}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select operation" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="union">Union</SelectItem>
									<SelectItem value="difference">Difference</SelectItem>
									<SelectItem value="intersect">Intersect</SelectItem>
									<SelectItem value="exclusion">Exclusion</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<div className="flex items-center justify-between">
								<label className="text-sm font-medium">Subject User Filters</label>
							</div>
							<MenuFilterConfigCard
								open={true}
								onOpenChange={() => {}}
								disabled={isMutating}
								columns={userFilterConfigColumns}
								filters={formState.subjectUserFilters ?? []}
								onFiltersChange={value => onFormStateChange({ ...formState, subjectUserFilters: value.length > 0 ? value : null })}
								contentOnly
							/>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<div className="flex items-center justify-between">
								<label className="text-sm font-medium">Subject Team Filters</label>
							</div>
							<MenuFilterConfigCard
								open={true}
								onOpenChange={() => {}}
								disabled={isMutating}
								columns={teamFilterConfigColumns}
								filters={formState.subjectTeamFilters ?? []}
								onFiltersChange={value => onFormStateChange({ ...formState, subjectTeamFilters: value.length > 0 ? value : null })}
								contentOnly
							/>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<div className="flex items-center justify-between">
								<label className="text-sm font-medium">Subject Role Filters</label>
							</div>
							<MenuFilterConfigCard
								open={true}
								onOpenChange={() => {}}
								disabled={isMutating}
								columns={roleFilterConfigColumns}
								filters={formState.subjectRoleFilters ?? []}
								onFiltersChange={value => onFormStateChange({ ...formState, subjectRoleFilters: value.length > 0 ? value : null })}
								contentOnly
							/>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Collection</label>
							<Select value={formState.collection} onValueChange={value => onFormStateChange({ ...formState, collection: value as any, filters: [], masks: {} })} disabled={isMutating}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select level" />
								</SelectTrigger>
								<SelectContent>
									{collectionSelectOptions.map(option => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<div className="flex items-center justify-between">
								<label className="text-sm font-medium">Filter</label>
								<Badge variant="outline">Required</Badge>
							</div>
							<MenuFilterConfigCard
								open={true}
								onOpenChange={() => {}}
								disabled={isMutating || formState.collection == null}
								columns={formState.collection != null ? collectionFilterConfigColumns[formState.collection] : []}
								filters={formState.filters ?? []}
								onFiltersChange={value => onFormStateChange({ ...formState, filters: value })}
								contentOnly
							/>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Mask</label>
							{formState.collection != null ? (
								<div className="grid gap-2 sm:grid-cols-2">
									{collectionColumnConfigColumns[formState.collection].filter(f => f.key in collectionMaskFields[formState.collection!]).map(f => (
										<div key={f.key} className="space-y-1">
											<label className="text-xs text-muted-foreground">{f.label}</label>
											<MemoizedSelect
												options={maskOptionsMap[collectionMaskFields[formState.collection!][f.key]]}
												value={(formState.masks ?? {})[f.key]}
												onValueChange={value => onFormStateChange({ ...formState, masks: { ...formState.masks, [f.key]: value } })}
												placeholder="Inherit"
												disabled={isMutating}
											/>
										</div>
									))}
								</div>
							) : (
								<p className="text-sm text-muted-foreground">Select a collection first</p>
							)}
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
	{ open, onOpenChange, onConfirm, changeRequestComment, onChangeRequestCommentChange, isMutating = false }:
	{ open: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void, changeRequestComment: SerializedEditorState, onChangeRequestCommentChange: (v: SerializedEditorState) => void, isMutating?: boolean }
) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="md:min-w-[520px]">
				<AlertDialogHeader>
					<AlertDialogTitle>Delete</AlertDialogTitle>
					<AlertDialogDescription>
						Delete does not hard-delete data. It creates a pending delete request by setting deletedAt, and requires approver review.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className="space-y-2 min-w-0">
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
	{ open, onOpenChange, onConfirm, isMutating = false }:
	{ open: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void, isMutating?: boolean }
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
	{ open, onOpenChange, onConfirm, isMutating = false }:
	{ open: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void, isMutating?: boolean }
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
	{ open, onOpenChange, onConfirm, changeRequestComment, onChangeRequestCommentChange, isMutating = false }:
	{ open: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void, changeRequestComment: SerializedEditorState, onChangeRequestCommentChange: (v: SerializedEditorState) => void, isMutating?: boolean }
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
				<div className="space-y-2 min-w-0">
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
