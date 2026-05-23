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
import { Drawer, DrawerTitle, DrawerFooter, DrawerHeader, DrawerContent, DrawerDescription } from "@/components/radix/Drawer";
import { Input } from "@/components/radix/Input";
import { Select, SelectItem, SelectValue, SelectContent, SelectTrigger } from "@/components/radix/Select";
import { Skeleton } from "@/components/radix/Skeleton";
import { CreditApplicationsAccessMask } from "@/payload-types";
import { genericMaskOptions, nameMaskOptions, emailMaskOptions, textMaskOptions, numberMaskOptions, phoneNumberMaskOptions, dateMaskOptions } from "@/collections/AccessCollection";

import { uploadGenericRichtextImage } from "../../../editor-x.actions";
import { useDashboardContext, defaultStatusRenderer, MenuTableConfigColumn, MenuColumnConfigColumn, MenuFilterConfigColumn, useMenuRowValueRenderer, defaultRelationUserRenderer, MenuRowValueRendererContext, defaultChangeRequestRenderer, MenuRowValueRendererConfigColumn } from "../../layout.components";
import { searchRelationUsersAction } from "../../relation-navigation.actions";
import { RelationValues, getDetailsAction, getHistoryAction, queryViewerAction, getDifferenceAction } from "./mask.actions";

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
	{ key: "createdBy", type: "relation", render: defaultRelationUserRenderer({ description: "Created By", relationSource: "credit-applications-access-masks.createdBy" }) },
	{ key: "updatedAt", type: "date" },
	{ key: "updatedBy", type: "relation", render: defaultRelationUserRenderer({ description: "Updated By", relationSource: "credit-applications-access-masks.updatedBy" }) },
	{ key: "deletedAt", type: "date" },
	{ key: "deletedBy", type: "relation", render: defaultRelationUserRenderer({ description: "Deleted By", relationSource: "credit-applications-access-masks.deletedBy" }) },
	{ key: "name", type: "text" },
	{ key: "description", type: "richText" },
	{ key: "#changeRequest", type: "select", render: defaultChangeRequestRenderer() },
	{ key: "#status", type: "select", render: defaultStatusRenderer() },
	{ key: "reviewedAt", type: "date" },
	{ key: "reviewedBy", type: "relation", render: defaultRelationUserRenderer({ description: "Reviewed By", relationSource: "credit-applications-access-masks.reviewedBy" }) },
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
	"reviewedAt",
	"reviewApproved"
]);
export const drawerValueRendererConfigColumns = rowValueRendererConfigColumns;
export const defaultColumnOrder = Object.freeze([
	"id",
	"name",
	"description",
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
		queryKey: ["access-management-mask", "details", row?.id ?? null],
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
					<DrawerTitle>Mask Request Details</DrawerTitle>
					<DrawerDescription>Review all available columns for this mask request entry.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
					{row == null ? (
						<p className="text-muted-foreground text-sm">
							No mask request selected.
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
								{`${query.error?.message ?? "Unable to load mask request details."}`}
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
		queryKey: ["access-management-mask", "history", row?.id ?? null],
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
					<DrawerTitle>Mask Request History</DrawerTitle>
					<DrawerDescription>Changes are shown from the most recent version to the earliest version.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
					{row == null ? (
						<p className="text-muted-foreground text-sm">No mask request selected.</p>
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
								{`${query.error?.message ?? "Unable to load mask request details."}`}
							</AlertDescription>
						</Alert>
					) : query.data.entries.length == 0 ? (
						<p className="text-muted-foreground text-sm">
							No history entries found for this mask request.
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
		queryKey: ["access-management-mask", "change-request-diff", row?.id ?? null],
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
		queryKey: ["access-management-mask", "change-request-diff", row?.id ?? null],
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
	description?: CreditApplicationsAccessMask["description"];
	maskImport?: CreditApplicationsAccessMask["maskImport"];
	maskName?: CreditApplicationsAccessMask["maskName"];
	maskEmail?: CreditApplicationsAccessMask["maskEmail"];
	maskAddresses?: CreditApplicationsAccessMask["maskAddresses"];
	maskPhoneNumbers?: CreditApplicationsAccessMask["maskPhoneNumbers"];
	maskWhatsappNumber?: CreditApplicationsAccessMask["maskWhatsappNumber"];
	maskSmsNumber?: CreditApplicationsAccessMask["maskSmsNumber"];
	maskCollateralRegistryName?: CreditApplicationsAccessMask["maskCollateralRegistryName"];
	maskCollateralName?: CreditApplicationsAccessMask["maskCollateralName"];
	maskCollateralDescription?: CreditApplicationsAccessMask["maskCollateralDescription"];
	maskAssetId?: CreditApplicationsAccessMask["maskAssetId"];
	maskAssetName?: CreditApplicationsAccessMask["maskAssetName"];
	maskAssetDescription?: CreditApplicationsAccessMask["maskAssetDescription"];
	maskPeriod?: CreditApplicationsAccessMask["maskPeriod"];
	maskInstallment?: CreditApplicationsAccessMask["maskInstallment"];
	maskDownPayment?: CreditApplicationsAccessMask["maskDownPayment"];
	maskPlafond?: CreditApplicationsAccessMask["maskPlafond"];
	maskVendor?: CreditApplicationsAccessMask["maskVendor"];
	maskRemarks?: CreditApplicationsAccessMask["maskRemarks"];
	maskOtherText1?: CreditApplicationsAccessMask["maskOtherText1"];
	maskOtherText2?: CreditApplicationsAccessMask["maskOtherText2"];
	maskOtherNumber1?: CreditApplicationsAccessMask["maskOtherNumber1"];
	maskOtherNumber2?: CreditApplicationsAccessMask["maskOtherNumber2"];
	maskOtherDate1?: CreditApplicationsAccessMask["maskOtherDate1"];
	maskOtherDate2?: CreditApplicationsAccessMask["maskOtherDate2"];
	maskOthers?: CreditApplicationsAccessMask["maskOthers"];
};
export function toFormState(data: CreditApplicationsAccessMask) {
	return {
		id: data.id,
		name: data.name,
		description: data.description,
		maskImport: data.maskImport,
		maskName: data.maskName,
		maskEmail: data.maskEmail,
		maskAddresses: data.maskAddresses,
		maskPhoneNumbers: data.maskPhoneNumbers,
		maskWhatsappNumber: data.maskWhatsappNumber,
		maskSmsNumber: data.maskSmsNumber,
		maskCollateralRegistryName: data.maskCollateralRegistryName,
		maskCollateralName: data.maskCollateralName,
		maskCollateralDescription: data.maskCollateralDescription,
		maskAssetId: data.maskAssetId,
		maskAssetName: data.maskAssetName,
		maskAssetDescription: data.maskAssetDescription,
		maskPeriod: data.maskPeriod,
		maskInstallment: data.maskInstallment,
		maskDownPayment: data.maskDownPayment,
		maskPlafond: data.maskPlafond,
		maskVendor: data.maskVendor,
		maskRemarks: data.maskRemarks,
		maskOtherText1: data.maskOtherText1,
		maskOtherText2: data.maskOtherText2,
		maskOtherNumber1: data.maskOtherNumber1,
		maskOtherNumber2: data.maskOtherNumber2,
		maskOtherDate1: data.maskOtherDate1,
		maskOtherDate2: data.maskOtherDate2,
		maskOthers: data.maskOthers
	} as FormState;
}
function MaskSelectField(
	{ label, value, onValueChange, options }:
	{ label: string, value: string | undefined, onValueChange: (v: string) => void, options: readonly { value: string, label: string }[] }
) {
	return (
		<div className="space-y-2">
			<label className="text-sm font-medium">{label}</label>
			<Select value={value} onValueChange={onValueChange}>
				<SelectTrigger className="w-full">
					<SelectValue placeholder="Select mask" />
				</SelectTrigger>
				<SelectContent>
					{options.map(option => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
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
					<DrawerDescription>Changes in editor mode create pending mask requests that require approver review before publication.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 overflow-y-auto px-4">
					<div className="grid gap-3 pb-4 sm:grid-cols-2">
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Name</label>
							<Input
								value={formState.name}
								onChange={event => onFormStateChange({ ...formState, name: event.target.value })}
								placeholder="Mask name"
							/>
						</div>
						<MaskSelectField label="Mask Import" value={formState.maskImport} onValueChange={v => onFormStateChange({ ...formState, maskImport: v as any })} options={genericMaskOptions} />
						<MaskSelectField label="Mask Name" value={formState.maskName} onValueChange={v => onFormStateChange({ ...formState, maskName: v as any })} options={nameMaskOptions} />
						<MaskSelectField label="Mask Email" value={formState.maskEmail} onValueChange={v => onFormStateChange({ ...formState, maskEmail: v as any })} options={emailMaskOptions} />
						<MaskSelectField label="Mask Addresses" value={formState.maskAddresses} onValueChange={v => onFormStateChange({ ...formState, maskAddresses: v as any })} options={textMaskOptions} />
						<MaskSelectField label="Mask Phone Numbers" value={formState.maskPhoneNumbers} onValueChange={v => onFormStateChange({ ...formState, maskPhoneNumbers: v as any })} options={phoneNumberMaskOptions} />
						<MaskSelectField label="Mask WhatsApp Number" value={formState.maskWhatsappNumber} onValueChange={v => onFormStateChange({ ...formState, maskWhatsappNumber: v as any })} options={phoneNumberMaskOptions} />
						<MaskSelectField label="Mask SMS Number" value={formState.maskSmsNumber} onValueChange={v => onFormStateChange({ ...formState, maskSmsNumber: v as any })} options={phoneNumberMaskOptions} />
						<MaskSelectField label="Mask Collateral Registry Name" value={formState.maskCollateralRegistryName} onValueChange={v => onFormStateChange({ ...formState, maskCollateralRegistryName: v as any })} options={textMaskOptions} />
						<MaskSelectField label="Mask Collateral Name" value={formState.maskCollateralName} onValueChange={v => onFormStateChange({ ...formState, maskCollateralName: v as any })} options={textMaskOptions} />
						<MaskSelectField label="Mask Collateral Description" value={formState.maskCollateralDescription} onValueChange={v => onFormStateChange({ ...formState, maskCollateralDescription: v as any })} options={genericMaskOptions} />
						<MaskSelectField label="Mask Asset ID" value={formState.maskAssetId} onValueChange={v => onFormStateChange({ ...formState, maskAssetId: v as any })} options={textMaskOptions} />
						<MaskSelectField label="Mask Asset Name" value={formState.maskAssetName} onValueChange={v => onFormStateChange({ ...formState, maskAssetName: v as any })} options={textMaskOptions} />
						<MaskSelectField label="Mask Asset Description" value={formState.maskAssetDescription} onValueChange={v => onFormStateChange({ ...formState, maskAssetDescription: v as any })} options={genericMaskOptions} />
						<MaskSelectField label="Mask Period" value={formState.maskPeriod} onValueChange={v => onFormStateChange({ ...formState, maskPeriod: v as any })} options={numberMaskOptions} />
						<MaskSelectField label="Mask Installment" value={formState.maskInstallment} onValueChange={v => onFormStateChange({ ...formState, maskInstallment: v as any })} options={numberMaskOptions} />
						<MaskSelectField label="Mask Down Payment" value={formState.maskDownPayment} onValueChange={v => onFormStateChange({ ...formState, maskDownPayment: v as any })} options={numberMaskOptions} />
						<MaskSelectField label="Mask Plafond" value={formState.maskPlafond} onValueChange={v => onFormStateChange({ ...formState, maskPlafond: v as any })} options={numberMaskOptions} />
						<MaskSelectField label="Mask Vendor" value={formState.maskVendor} onValueChange={v => onFormStateChange({ ...formState, maskVendor: v as any })} options={textMaskOptions} />
						<MaskSelectField label="Mask Remarks" value={formState.maskRemarks} onValueChange={v => onFormStateChange({ ...formState, maskRemarks: v as any })} options={genericMaskOptions} />
						<MaskSelectField label="Mask Other Text 1" value={formState.maskOtherText1} onValueChange={v => onFormStateChange({ ...formState, maskOtherText1: v as any })} options={textMaskOptions} />
						<MaskSelectField label="Mask Other Text 2" value={formState.maskOtherText2} onValueChange={v => onFormStateChange({ ...formState, maskOtherText2: v as any })} options={textMaskOptions} />
						<MaskSelectField label="Mask Other Number 1" value={formState.maskOtherNumber1} onValueChange={v => onFormStateChange({ ...formState, maskOtherNumber1: v as any })} options={numberMaskOptions} />
						<MaskSelectField label="Mask Other Number 2" value={formState.maskOtherNumber2} onValueChange={v => onFormStateChange({ ...formState, maskOtherNumber2: v as any })} options={numberMaskOptions} />
						<MaskSelectField label="Mask Other Date 1" value={formState.maskOtherDate1} onValueChange={v => onFormStateChange({ ...formState, maskOtherDate1: v as any })} options={dateMaskOptions} />
						<MaskSelectField label="Mask Other Date 2" value={formState.maskOtherDate2} onValueChange={v => onFormStateChange({ ...formState, maskOtherDate2: v as any })} options={dateMaskOptions} />
						<MaskSelectField label="Mask Others" value={formState.maskOthers} onValueChange={v => onFormStateChange({ ...formState, maskOthers: v as any })} options={genericMaskOptions} />
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
