"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SerializedEditorState } from "lexical";
import { CheckIcon, HistoryIcon, CircleAlertIcon } from "lucide-react";

import { RichTextInput } from "@/components/RichText";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { AlertDialog, AlertDialogTitle, AlertDialogAction, AlertDialogCancel, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogDescription } from "@/components/radix/AlertDialog";
import { Badge } from "@/components/radix/Badge";
import { Button } from "@/components/radix/Button";
import { Checkbox } from "@/components/radix/Checkbox";
import { Drawer, DrawerTitle, DrawerFooter, DrawerHeader, DrawerContent, DrawerDescription } from "@/components/radix/Drawer";
import { Input } from "@/components/radix/Input";
import { Skeleton } from "@/components/radix/Skeleton";
import { CreditApplicationsAccess } from "@/payload-types";

import { uploadGenericRichtextImage } from "../../../editor-x.actions";
import { useDashboardContext, defaultStatusRenderer, MenuTableConfigColumn, MenuColumnConfigColumn, MenuFilterConfigColumn, useMenuRowValueRenderer, defaultRelationUserRenderer, MenuRowValueRendererContext, defaultChangeRequestRenderer, MenuRowValueRendererConfigColumn } from "../../layout.components";
import { searchRelationUsersAction } from "../../relation-navigation.actions";
import { RelationValues, getDetailsAction, getHistoryAction, queryViewerAction, getDifferenceAction } from "./layout.actions";

export type ColumnData = Awaited<ReturnType<typeof queryViewerAction>>["docs"][number];
export const filterConfigColumns = Object.freeze([
	{ key: "id", label: "Id", type: "relation" },
	{ key: "createdAt", label: "Created At", type: "date" },
	{ key: "createdBy", label: "Created By", type: "relation", relationSearch: searchRelationUsersAction },
	{ key: "updatedAt", label: "Updated At", type: "date" },
	{ key: "updatedBy", label: "Updated By", type: "relation", relationSearch: searchRelationUsersAction },
	{ key: "deletedAt", label: "Deleted At", type: "date" },
	{ key: "deletedBy", label: "Deleted By", type: "relation", relationSearch: searchRelationUsersAction },
	{ key: "name", label: "Name", type: "text" },
	{ key: "defaultShowAll", label: "Default Show All", type: "boolean" },
	{ key: "reviewedAt", label: "Reviewed At", type: "date" },
	{ key: "reviewedBy", label: "Reviewed By", type: "relation", relationSearch: searchRelationUsersAction },
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
	{ key: "name", label: "Name" },
	{ key: "description", label: "Description" },
	{ key: "defaultShowAll", label: "Default Show All" },
	{ key: "#changeRequest", label: "Request" },
	{ key: "#status", label: "Status" },
	{ key: "reviewedAt", label: "Reviewed At" },
	{ key: "reviewedBy", label: "Reviewed By" },
	{ key: "reviewApproved", label: "Review Approved" },
	{ key: "reviewComment", label: "Review Comment" }
] as MenuColumnConfigColumn[]);
export const tableConfigColumns = Object.freeze([
	{ key: "id", label: "Id", sortable: true, className: "text-xs" },
	{ key: "createdAt", label: "Created At", sortable: true },
	{ key: "createdBy", label: "Created By", sortable: true },
	{ key: "updatedAt", label: "Updated At", sortable: true },
	{ key: "updatedBy", label: "Updated By", sortable: true },
	{ key: "deletedAt", label: "Deleted At", sortable: true },
	{ key: "deletedBy", label: "Deleted By", sortable: true },
	{ key: "name", label: "Name", sortable: true, className: "font-medium" },
	{ key: "description", label: "Description", sortable: false, className: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" },
	{ key: "defaultShowAll", label: "Default Show All", sortable: true },
	{ key: "#changeRequest", label: "Request", sortable: false },
	{ key: "#status", label: "Status", sortable: false },
	{ key: "reviewedAt", label: "Reviewed At", sortable: true },
	{ key: "reviewedBy", label: "Reviewed By", sortable: true },
	{ key: "reviewApproved", label: "Review Approved", sortable: true },
	{ key: "reviewComment", label: "Review Comment", sortable: false, className: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" }
] as MenuTableConfigColumn[]);
export const rowValueRendererConfigColumns = Object.freeze([
	{ key: "id", type: "text", render: v => (<span className="font-mono">{v}</span>) },
	{ key: "createdAt", type: "date" },
	{ key: "createdBy", type: "relation", render: defaultRelationUserRenderer({ description: "Created By", relationSource: "credit-applications-accesses.createdBy" }) },
	{ key: "updatedAt", type: "date" },
	{ key: "updatedBy", type: "relation", render: defaultRelationUserRenderer({ description: "Updated By", relationSource: "credit-applications-accesses.updatedBy" }) },
	{ key: "deletedAt", type: "date" },
	{ key: "deletedBy", type: "relation", render: defaultRelationUserRenderer({ description: "Deleted By", relationSource: "credit-applications-accesses.deletedBy" }) },
	{ key: "name", type: "text" },
	{ key: "description", type: "richText" },
	{ key: "defaultShowAll", type: "boolean" },
	{ key: "#changeRequest", type: "select", render: defaultChangeRequestRenderer() },
	{ key: "#status", type: "select", render: defaultStatusRenderer() },
	{ key: "reviewedAt", type: "date" },
	{ key: "reviewedBy", type: "relation", render: defaultRelationUserRenderer({ description: "Reviewed By", relationSource: "credit-applications-accesses.reviewedBy" }) },
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
	"createdAt",
	"updatedAt",
	"deletedAt",
	"name",
	"defaultShowAll",
	"reviewedAt",
	"reviewApproved"
]);
export const drawerValueRendererConfigColumns = rowValueRendererConfigColumns;
export const defaultColumnOrder = Object.freeze([
	"id",
	"name",
	"description",
	"defaultShowAll",
	"createdBy",
	"updatedBy",
	"deletedBy",
	"createdAt",
	"updatedAt",
	"deletedAt",
	"#changeRequest",
	"#status",
	"reviewedAt",
	"reviewedBy",
	"reviewApproved",
	"reviewComment"
]) as string[];
export const defaultColumnsShown = Object.freeze([
	"name",
	"defaultShowAll",
	"#changeRequest",
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
	const canAccessHistory = user.roleMenus.includes("credit-application-management#auditor");
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
								{renderValue(row, column.key)}
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
	const canAccessHistory = user.roleMenus.includes("credit-application-management#auditor");
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
							<AlertDescription>You need auditor access to view history.</AlertDescription>
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
							{query.data?.requestType ?? "-"}
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
												{renderValue(query.data.approvedVersion, columnKey)}
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
							{query.data?.requestType ?? "-"}
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
												{renderValue(query.data.approvedVersion, columnKey)}
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
	description?: CreditApplicationsAccess["description"];
	subjectUsers?: string[];
	subjectTeams?: string[];
	subjectRoles?: string[];
	subjectLevels?: CreditApplicationsAccess["subjectLevels"];
	defaultShowAll?: boolean;
	forceShow?: string[];
	forceHide?: string[];
	mask?: string;
	showIfCreatedByUsers?: string[];
	hideIfCreatedByUsers?: string[];
	showIfUpdatedByUsers?: string[];
	hideIfUpdatedByUsers?: string[];
	showIfDeletedByUsers?: string[];
	hideIfDeletedByUsers?: string[];
	showIfReviewedByUsers?: string[];
	hideIfReviewedByUsers?: string[];
	showIfCreatedByRoles?: string[];
	hideIfCreatedByRoles?: string[];
	showIfUpdatedByRoles?: string[];
	hideIfUpdatedByRoles?: string[];
	showIfDeletedByRoles?: string[];
	hideIfDeletedByRoles?: string[];
	showIfReviewedByRoles?: string[];
	hideIfReviewedByRoles?: string[];
};
export function toFormState(data: CreditApplicationsAccess) {
	return {
		id: data.id,
		name: data.name,
		description: data.description,
		subjectUsers: (data.subjectUsers ?? []).map(v => typeof v == "string" ? v : v.id),
		subjectTeams: (data.subjectTeams ?? []).map(v => typeof v == "string" ? v : v.id),
		subjectRoles: (data.subjectRoles ?? []).map(v => typeof v == "string" ? v : v.id),
		subjectLevels: data.subjectLevels,
		defaultShowAll: data.defaultShowAll,
		forceShow: (data.forceShow ?? []).map(v => typeof v == "string" ? v : v.id),
		forceHide: (data.forceHide ?? []).map(v => typeof v == "string" ? v : v.id),
		mask: typeof data.mask == "string" ? data.mask : data.mask?.id,
		showIfCreatedByUsers: (data.showIfCreatedByUsers ?? []).map(v => typeof v == "string" ? v : v.id),
		hideIfCreatedByUsers: (data.hideIfCreatedByUsers ?? []).map(v => typeof v == "string" ? v : v.id),
		showIfUpdatedByUsers: (data.showIfUpdatedByUsers ?? []).map(v => typeof v == "string" ? v : v.id),
		hideIfUpdatedByUsers: (data.hideIfUpdatedByUsers ?? []).map(v => typeof v == "string" ? v : v.id),
		showIfDeletedByUsers: (data.showIfDeletedByUsers ?? []).map(v => typeof v == "string" ? v : v.id),
		hideIfDeletedByUsers: (data.hideIfDeletedByUsers ?? []).map(v => typeof v == "string" ? v : v.id),
		showIfReviewedByUsers: (data.showIfReviewedByUsers ?? []).map(v => typeof v == "string" ? v : v.id),
		hideIfReviewedByUsers: (data.hideIfReviewedByUsers ?? []).map(v => typeof v == "string" ? v : v.id),
		showIfCreatedByRoles: (data.showIfCreatedByRoles ?? []).map(v => typeof v == "string" ? v : v.id),
		hideIfCreatedByRoles: (data.hideIfCreatedByRoles ?? []).map(v => typeof v == "string" ? v : v.id),
		showIfUpdatedByRoles: (data.showIfUpdatedByRoles ?? []).map(v => typeof v == "string" ? v : v.id),
		hideIfUpdatedByRoles: (data.hideIfUpdatedByRoles ?? []).map(v => typeof v == "string" ? v : v.id),
		showIfDeletedByRoles: (data.showIfDeletedByRoles ?? []).map(v => typeof v == "string" ? v : v.id),
		hideIfDeletedByRoles: (data.hideIfDeletedByRoles ?? []).map(v => typeof v == "string" ? v : v.id),
		showIfReviewedByRoles: (data.showIfReviewedByRoles ?? []).map(v => typeof v == "string" ? v : v.id),
		hideIfReviewedByRoles: (data.hideIfReviewedByRoles ?? []).map(v => typeof v == "string" ? v : v.id)
	} as FormState;
}
export function FormDrawer(
	{ open, onOpenChange, title, formState, onFormStateChange, onSubmit, mutationError, isMutating = false }:
	{ open: boolean, onOpenChange: (v: boolean) => void, title: string, formState: FormState, onFormStateChange: (v: FormState) => void, onSubmit?: () => void, mutationError?: any, isMutating?: boolean }
) {
	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-2xl">
				<DrawerHeader>
					<DrawerTitle>{title}</DrawerTitle>
					<DrawerDescription>Changes in editor mode create pending access requests that require approver review before publication.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 overflow-y-auto px-4">
					<div className="grid gap-3 pb-4 sm:grid-cols-2">
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Name</label>
							<Input
								value={formState.name}
								onChange={event => onFormStateChange({ ...formState, name: event.target.value })}
								placeholder="Access rule name"
							/>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Default Show All</label>
							<div className="flex items-center gap-2">
								<Checkbox
									checked={formState.defaultShowAll ?? false}
									onCheckedChange={checked => onFormStateChange({ ...formState, defaultShowAll: !!checked })}
								/>
								<span className="text-sm">Show all records by default</span>
							</div>
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
	{ open, onOpenChange, onConfirm, isMutating = false }:
	{ open: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void, isMutating?: boolean }
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
	{ open, onOpenChange, onConfirm, isMutating = false }:
	{ open: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void, isMutating?: boolean }
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
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isMutating}>Back</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm} disabled={isMutating}>Restore Deletion</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
