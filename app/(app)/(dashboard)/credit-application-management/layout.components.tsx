"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SerializedEditorState } from "lexical";
import { XIcon, PlusIcon, HistoryIcon, CircleAlertIcon } from "lucide-react";

import { RichTextInput } from "@/components/RichText";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { AlertDialog, AlertDialogTitle, AlertDialogAction, AlertDialogCancel, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogDescription } from "@/components/radix/AlertDialog";
import { Badge } from "@/components/radix/Badge";
import { Button } from "@/components/radix/Button";
import { Drawer, DrawerTitle, DrawerFooter, DrawerHeader, DrawerContent, DrawerDescription } from "@/components/radix/Drawer";
import { Input } from "@/components/radix/Input";
import { Skeleton } from "@/components/radix/Skeleton";
import { Textarea } from "@/components/radix/Textarea";
import { CreditApplication } from "@/payload-types";

import { uploadGenericRichtextImage } from "../../editor-x.actions";
import { defaultStatusRenderer, MenuTableConfigColumn, MenuColumnConfigColumn, MenuFilterConfigColumn, useMenuRowValueRenderer, useDashboardShellContext, defaultRelationUserRenderer, defaultChangeRequestRenderer, MenuRowValueRendererConfigColumn, defaultRelationCreditApplicationImportRenderer, MenuRowValueRendererContext } from "../layout.components";
import { searchRelationUsersAction, searchRelationCreditApplicationsAction, searchRelationCreditApplicationImportsAction } from "../relation-navigation.actions";
import { RelationValues, getDetailsAction, getHistoryAction, queryViewerAction, getDifferenceAction } from "./layout.actions";

export type ColumnData = Awaited<ReturnType<typeof queryViewerAction>>["docs"][number];
export const filterConfigColumns = Object.freeze([
	{ key: "id", label: "Id", type: "relation", relationSearch: searchRelationCreditApplicationsAction },
	{ key: "createdAt", label: "Created At", type: "date" },
	{ key: "createdBy", label: "Created By", type: "relation", relationSearch: searchRelationUsersAction },
	{ key: "updatedAt", label: "Updated At", type: "date" },
	{ key: "updatedBy", label: "Updated By", type: "relation", relationSearch: searchRelationUsersAction },
	{ key: "deletedAt", label: "Deleted At", type: "date" },
	{ key: "deletedBy", label: "Deleted By", type: "relation", relationSearch: searchRelationUsersAction },
	{ key: "import", label: "Import", type: "relation", relationSearch: searchRelationCreditApplicationImportsAction },
	{ key: "name", label: "Name", type: "text" },
	{ key: "email", label: "Email", type: "text" },
	{ key: "addresses", label: "Addresses", type: "text_hasMany" },
	{ key: "phoneNumbers", label: "Phone Numbers", type: "text_hasMany" },
	{ key: "whatsappNumber", label: "Whatsapp Number", type: "text" },
	{ key: "smsNumber", label: "Sms Number", type: "text" },
	{ key: "collateralRegistryName", label: "Collateral Registry Name", type: "text" },
	{ key: "collateralName", label: "Collateral Name", type: "text" },
	{ key: "assetId", label: "Asset Id", type: "text" },
	{ key: "assetName", label: "Asset Name", type: "text" },
	{ key: "period", label: "Period", type: "number" },
	{ key: "installment", label: "Installment", type: "number" },
	{ key: "downPayment", label: "Down Payment", type: "number" },
	{ key: "plafond", label: "Plafond", type: "number" },
	{ key: "vendor", label: "Vendor", type: "text" },
	{ key: "otherText1", label: "Other Text 1", type: "text" },
	{ key: "otherText2", label: "Other Text 2", type: "text" },
	{ key: "otherNumber1", label: "Other Number 1", type: "number" },
	{ key: "otherNumber2", label: "Other Number 2", type: "number" },
	{ key: "otherDate1", label: "Other Date 1", type: "date" },
	{ key: "otherDate2", label: "Other Date 2", type: "date" },
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
	{ key: "import", label: "Import" },
	{ key: "name", label: "Name" },
	{ key: "email", label: "Email" },
	{ key: "addresses", label: "Addresses" },
	{ key: "phoneNumbers", label: "Phone Numbers" },
	{ key: "whatsappNumber", label: "Whatsapp Number" },
	{ key: "smsNumber", label: "Sms Number" },
	{ key: "collateralRegistryName", label: "Collateral Registry Name" },
	{ key: "collateralName", label: "Collateral Name" },
	{ key: "collateralDescription", label: "Collateral Description" },
	{ key: "assetId", label: "Asset Id" },
	{ key: "assetName", label: "Asset Name" },
	{ key: "assetDescription", label: "Asset Description" },
	{ key: "period", label: "Period" },
	{ key: "installment", label: "Installment" },
	{ key: "downPayment", label: "Down Payment" },
	{ key: "plafond", label: "Plafond" },
	{ key: "vendor", label: "Vendor" },
	{ key: "remarks", label: "Remarks" },
	{ key: "otherText1", label: "Other Text 1" },
	{ key: "otherText2", label: "Other Text 2" },
	{ key: "otherNumber1", label: "Other Number 1" },
	{ key: "otherNumber2", label: "Other Number 2" },
	{ key: "otherDate1", label: "Other Date 1" },
	{ key: "otherDate2", label: "Other Date 2" },
	{ key: "others", label: "Others" },
	{ key: "#changeRequest", label: "Request" },
	{ key: "#status", label: "Status" },
	{ key: "reviewedAt", label: "Reviewed At" },
	{ key: "reviewedBy", label: "Reviewed By" },
	{ key: "reviewApproved", label: "Review Approved" },
	{ key: "reviewComment", label: "Review Comment" }
] as MenuColumnConfigColumn[]);
export const tableConfigColumns = Object.freeze([
	{ key: "id", label: "Id", sortable: true, className: "font-mono text-xs" },
	{ key: "createdAt", label: "Created At", sortable: true },
	{ key: "createdBy", label: "Created By", sortable: false },
	{ key: "updatedAt", label: "Updated At", sortable: true },
	{ key: "updatedBy", label: "Updated By", sortable: false },
	{ key: "deletedAt", label: "Deleted At", sortable: true },
	{ key: "deletedBy", label: "Deleted By", sortable: false },
	{ key: "import", label: "Import", sortable: false },
	{ key: "name", label: "Name", sortable: true, className: "font-medium" },
	{ key: "email", label: "Email", sortable: true },
	{ key: "addresses", label: "Addresses", sortable: true, className: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" },
	{ key: "phoneNumbers", label: "Phone Numbers", sortable: true, className: "max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap" },
	{ key: "whatsappNumber", label: "Whatsapp Number", sortable: true },
	{ key: "smsNumber", label: "Sms Number", sortable: true },
	{ key: "collateralRegistryName", label: "Collateral Registry Name", sortable: true },
	{ key: "collateralName", label: "Collateral Name", sortable: true },
	{ key: "collateralDescription", label: "Collateral Description", sortable: false, className: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" },
	{ key: "assetId", label: "Asset Id", sortable: true },
	{ key: "assetName", label: "Asset Name", sortable: true },
	{ key: "assetDescription", label: "Asset Description", sortable: false, className: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" },
	{ key: "period", label: "Period", sortable: true },
	{ key: "installment", label: "Installment", sortable: true },
	{ key: "downPayment", label: "Down Payment", sortable: true },
	{ key: "plafond", label: "Plafond", sortable: true },
	{ key: "vendor", label: "Vendor", sortable: true },
	{ key: "remarks", label: "Remarks", sortable: false, className: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" },
	{ key: "otherText1", label: "Other Text 1", sortable: true },
	{ key: "otherText2", label: "Other Text 2", sortable: true },
	{ key: "otherNumber1", label: "Other Number 1", sortable: true },
	{ key: "otherNumber2", label: "Other Number 2", sortable: true },
	{ key: "otherDate1", label: "Other Date 1", sortable: true },
	{ key: "otherDate2", label: "Other Date 2", sortable: true },
	{ key: "others", label: "Others", sortable: false, className: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" },
	{ key: "#changeRequest", label: "Request", sortable: false },
	{ key: "#status", label: "Status", sortable: false },
	{ key: "reviewedAt", label: "Reviewed At", sortable: true },
	{ key: "reviewedBy", label: "Reviewed By", sortable: false },
	{ key: "reviewApproved", label: "Review Approved", sortable: true },
	{ key: "reviewComment", label: "Review Comment", sortable: false, className: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" }
] as MenuTableConfigColumn[]);
export const rowValueRendererConfigColumns = Object.freeze([
	{ key: "id", type: "text" },
	{ key: "createdAt", type: "date" },
	{ key: "createdBy", type: "relation", render: defaultRelationUserRenderer({ description: "Created By", relationSource: "credit-applications.createdBy" }) },
	{ key: "updatedAt", type: "date" },
	{ key: "updatedBy", type: "relation", render: defaultRelationUserRenderer({ description: "Updated By", relationSource: "credit-applications.updatedBy" }) },
	{ key: "deletedAt", type: "date" },
	{ key: "deletedBy", type: "relation", render: defaultRelationUserRenderer({ description: "Deleted By", relationSource: "credit-applications.deletedBy" }) },
	{ key: "import", type: "relation", render: defaultRelationCreditApplicationImportRenderer({ description: "Import", relationSource: "credit-applications.import" }) },
	{ key: "name", type: "text" },
	{ key: "email", type: "text" },
	{ key: "addresses", type: "text_hasMany" },
	{ key: "phoneNumbers", type: "text_hasMany" },
	{ key: "whatsappNumber", type: "text" },
	{ key: "smsNumber", type: "text" },
	{ key: "collateralRegistryName", type: "text" },
	{ key: "collateralName", type: "text" },
	{ key: "collateralDescription", type: "richText" },
	{ key: "assetId", type: "text" },
	{ key: "assetName", type: "text" },
	{ key: "assetDescription", type: "richText" },
	{ key: "period", type: "number" },
	{ key: "installment", type: "number" },
	{ key: "downPayment", type: "number" },
	{ key: "plafond", type: "number" },
	{ key: "vendor", type: "text" },
	{ key: "remarks", type: "richText" },
	{ key: "otherText1", type: "text" },
	{ key: "otherText2", type: "text" },
	{ key: "otherNumber1", type: "number" },
	{ key: "otherNumber2", type: "number" },
	{ key: "otherDate1", type: "date" },
	{ key: "otherDate2", type: "date" },
	{ key: "others", type: "text", render: value => value == null ? "-" : (<pre className="text-xs whitespace-pre-wrap break-all">{typeof value == "string" ? value : JSON.stringify(value, null, 2)}</pre>) },
	{ key: "#changeRequest", type: "select", render: defaultChangeRequestRenderer() },
	{ key: "#status", type: "select", render: defaultStatusRenderer() },
	{ key: "reviewedAt", type: "date" },
	{ key: "reviewedBy", type: "relation", render: defaultRelationUserRenderer({ description: "Reviewed By", relationSource: "credit-applications.reviewedBy" }) },
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
	"name",
	"email",
	"createdAt",
	"updatedAt",
	"deletedAt",
	"reviewedAt",
	"reviewApproved"
]);
export const drawerValueRendererConfigColumns = rowValueRendererConfigColumns;
export const defaultColumnOrder = Object.freeze([
	"id",
	"import",
	"name",
	"email",
	"addresses",
	"phoneNumbers",
	"whatsappNumber",
	"smsNumber",
	"collateralRegistryName",
	"collateralName",
	"collateralDescription",
	"assetId",
	"assetName",
	"assetDescription",
	"period",
	"installment",
	"downPayment",
	"plafond",
	"vendor",
	"remarks",
	"otherText1",
	"otherText2",
	"otherNumber1",
	"otherNumber2",
	"otherDate1",
	"otherDate2",
	"others",
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
	"email",
	"addresses",
	"phoneNumbers",
	"whatsappNumber",
	"assetName",
	"vendor",
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
	const { roles } = useDashboardShellContext();
	const canAccessHistory = roles.includes("credit-application-management-auditor");
	const query = useQuery({
		queryKey: ["credit-application-management", "details", row?.id ?? null],
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
					<DrawerTitle>Credit Application Request Details</DrawerTitle>
					<DrawerDescription>Review all available columns for this credit application request entry.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
					{row == null ? (
						<p className="text-muted-foreground text-sm">
							No credit application request selected.
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
								{`${query.error?.message ?? "Unable to load credit application request details."}`}
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
	const { roles } = useDashboardShellContext();
	const canAccessHistory = roles.includes("credit-application-management-auditor");
	const query = useQuery({
		queryKey: ["credit-application-management", "history", row?.id ?? null],
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
					<DrawerTitle>Credit Application Request History</DrawerTitle>
					<DrawerDescription>Changes are shown from the most recent version to the earliest version.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
					{row == null ? (
						<p className="text-muted-foreground text-sm">No credit application request selected.</p>
					) : !canAccessHistory ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>Unauthorized</AlertTitle>
							<AlertDescription>You need Credit Application Management auditor access to view history.</AlertDescription>
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
								{`${query.error?.message ?? "Unable to load credit application request details."}`}
							</AlertDescription>
						</Alert>
					) : query.data.entries.length == 0 ? (
						<p className="text-muted-foreground text-sm">
							No history entries found for this credit application request.
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
		queryKey: ["credit-application-management", "change-request-diff", row?.id ?? null],
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
		queryKey: ["credit-application-management", "change-request-diff", row?.id ?? null],
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
	email?: string;
	addresses?: string[];
	phoneNumbers?: string[];
	whatsappNumber?: string;
	smsNumber?: string;
	collateralRegistryName?: string;
	collateralName?: string;
	collateralDescription?: SerializedEditorState;
	assetId?: string;
	assetName?: string;
	assetDescription?: SerializedEditorState;
	period?: number;
	installment?: number;
	downPayment?: number;
	plafond?: number;
	vendor?: string;
	remarks?: SerializedEditorState;
	otherText1?: string;
	otherText2?: string;
	otherNumber1?: number;
	otherNumber2?: number;
	otherDate1?: string;
	otherDate2?: string;
	others?: string;
};
export function toFormState(data: CreditApplication) {
	return {
		id: data.id,
		name: data.name,
		email: data.email,
		addresses: data.addresses,
		phoneNumbers: data.phoneNumbers,
		whatsappNumber: data.whatsappNumber,
		smsNumber: data.smsNumber,
		collateralRegistryName: data.collateralRegistryName,
		collateralName: data.collateralName,
		collateralDescription: data.collateralDescription,
		assetId: data.assetId,
		assetName: data.assetName,
		assetDescription: data.assetDescription,
		period: data.period,
		installment: data.installment,
		downPayment: data.downPayment,
		plafond: data.plafond,
		vendor: data.vendor,
		remarks: data.remarks,
		otherText1: data.otherText1,
		otherText2: data.otherText2,
		otherNumber1: data.otherNumber1,
		otherNumber2: data.otherNumber2,
		otherDate1: data.otherDate1,
		otherDate2: data.otherDate2,
		others: data.others
	} as FormState;
}
export function FormDrawer(
	{ open, onOpenChange, title, formState, onFormStateChange, onSubmit, mutationError, isMutating = false }:
	{ open: boolean, onOpenChange: (v: boolean) => void, title: string, formState: FormState, onFormStateChange: (v: FormState) => void, onSubmit?: () => void, mutationError?: any, isMutating?: boolean }
) {
	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-3xl">
				<DrawerHeader>
					<DrawerTitle>{title}</DrawerTitle>
					<DrawerDescription>Changes in editor mode create pending credit application requests that require approver review before publication.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 overflow-y-auto px-4">
					<div className="grid gap-3 pb-4 sm:grid-cols-2">
						<div className="space-y-2">
							<label className="text-sm font-medium">Applicant Name</label>
							<Input value={formState.name} onChange={event => onFormStateChange({ ...formState, name: event.target.value })} disabled={isMutating} />
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Email</label>
							<Input value={formState.email} onChange={event => onFormStateChange({ ...formState, email: event.target.value })} disabled={isMutating} />
						</div>
						<div className="space-y-2 sm:col-span-2">
							<div className="flex items-center justify-between">
								<label className="text-sm font-medium">Addresses</label>
								<Badge variant="outline">{(formState.addresses ?? []).length} value(s)</Badge>
							</div>
							<div className="space-y-2">
								{(formState.addresses ?? []).length == 0 ? (
									<p className="text-muted-foreground text-xs">No address values yet.</p>
								) : (
									(formState.addresses ?? []).map((address, index) => (
										<div key={index} className="flex items-start gap-2">
											<Input
												value={address}
												onChange={event => onFormStateChange({ ...formState, addresses: (formState.addresses ?? []).with(index, event.target.value) })}
												placeholder="Jl. Sudirman No. 1"
												className="flex-1"
											/>
											<Button type="button" variant="outline" onClick={() => onFormStateChange({ ...formState, addresses: (formState.addresses ?? []).toSpliced(index, 1) })}>
												<XIcon />
												Remove
											</Button>
										</div>
									))
								)}
								<Button type="button" variant="outline" onClick={() => onFormStateChange({ ...formState, addresses: [...(formState.addresses ?? []), ""] })}>
									<PlusIcon />
									Add
								</Button>
							</div>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<div className="flex items-center justify-between">
								<label className="text-sm font-medium">Phone Numbers</label>
								<Badge variant="outline">{(formState.phoneNumbers ?? []).length} value(s)</Badge>
							</div>
							<div className="space-y-2">
								{(formState.phoneNumbers ?? []).length == 0 ? (
									<p className="text-muted-foreground text-xs">No address values yet.</p>
								) : (
									(formState.phoneNumbers ?? []).map((address, index) => (
										<div key={index} className="flex items-start gap-2">
											<Input
												value={address}
												onChange={event => onFormStateChange({ ...formState, phoneNumbers: (formState.phoneNumbers ?? []).with(index, event.target.value) })}
												placeholder="Jl. Sudirman No. 1"
												className="flex-1"
											/>
											<Button type="button" variant="outline" onClick={() => onFormStateChange({ ...formState, phoneNumbers: (formState.phoneNumbers ?? []).toSpliced(index, 1) })}>
												<XIcon />
												Remove
											</Button>
										</div>
									))
								)}
								<Button type="button" variant="outline" onClick={() => onFormStateChange({ ...formState, phoneNumbers: [...(formState.phoneNumbers ?? []), ""] })}>
									<PlusIcon />
									Add
								</Button>
							</div>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Whatsapp Number</label>
							<Input value={formState.whatsappNumber} onChange={event => onFormStateChange({ ...formState, whatsappNumber: event.target.value })} disabled={isMutating} />
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Sms Number</label>
							<Input value={formState.smsNumber} onChange={event => onFormStateChange({ ...formState, smsNumber: event.target.value })} disabled={isMutating} />
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Collateral Registry Name</label>
							<Input value={formState.collateralRegistryName} onChange={event => onFormStateChange({ ...formState, collateralRegistryName: event.target.value })} disabled={isMutating} />
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Collateral Name</label>
							<Input value={formState.collateralName} onChange={event => onFormStateChange({ ...formState, collateralName: event.target.value })} disabled={isMutating} />
						</div>
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Collateral Description</label>
							<RichTextInput
								serializedState={formState.collateralDescription}
								onSerializedStateChange={value => onFormStateChange({ ...formState, collateralDescription: value })}
								onImageUpload={uploadGenericRichtextImage}
							/>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Asset Id</label>
							<Input value={formState.assetId} onChange={event => onFormStateChange({ ...formState, assetId: event.target.value })} disabled={isMutating} />
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Asset Name</label>
							<Input value={formState.assetName} onChange={event => onFormStateChange({ ...formState, assetName: event.target.value })} disabled={isMutating} />
						</div>
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Asset Description</label>
							<RichTextInput
								serializedState={formState.assetDescription}
								onSerializedStateChange={value => onFormStateChange({ ...formState, assetDescription: value })}
								onImageUpload={uploadGenericRichtextImage}
							/>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Period</label>
							<Input value={formState.period} onChange={event => onFormStateChange({ ...formState, period: event.target.valueAsNumber })} disabled={isMutating} />
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Installment</label>
							<Input value={formState.installment} onChange={event => onFormStateChange({ ...formState, installment: event.target.valueAsNumber })} disabled={isMutating} />
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Down Payment</label>
							<Input value={formState.downPayment} onChange={event => onFormStateChange({ ...formState, downPayment: event.target.valueAsNumber })} disabled={isMutating} />
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Plafond</label>
							<Input value={formState.plafond} onChange={event => onFormStateChange({ ...formState, plafond: event.target.valueAsNumber })} disabled={isMutating} />
						</div>
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Vendor</label>
							<Input value={formState.vendor} onChange={event => onFormStateChange({ ...formState, vendor: event.target.value })} disabled={isMutating} />
						</div>
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Remarks</label>
							<RichTextInput
								serializedState={formState.remarks}
								onSerializedStateChange={value => onFormStateChange({ ...formState, remarks: value })}
								onImageUpload={uploadGenericRichtextImage}
							/>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Other Text 1</label>
							<Input value={formState.otherText1} onChange={event => onFormStateChange({ ...formState, otherText1: event.target.value })} disabled={isMutating} />
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Other Text 2</label>
							<Input value={formState.otherText2} onChange={event => onFormStateChange({ ...formState, otherText2: event.target.value })} disabled={isMutating} />
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Other Number 1</label>
							<Input value={formState.otherNumber1} onChange={event => onFormStateChange({ ...formState, otherNumber1: event.target.valueAsNumber })} disabled={isMutating} />
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Other Number 2</label>
							<Input value={formState.otherNumber2} onChange={event => onFormStateChange({ ...formState, otherNumber2: event.target.valueAsNumber })} disabled={isMutating} />
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Other Date 1</label>
							<Input type="date" value={formState.otherDate1} onChange={event => onFormStateChange({ ...formState, otherDate1: event.target.value })} disabled={isMutating} />
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Other Date 2</label>
							<Input type="date" value={formState.otherDate2} onChange={event => onFormStateChange({ ...formState, otherDate2: event.target.value })} disabled={isMutating} />
						</div>
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Others</label>
							<Textarea
								value={formState.others}
								onChange={event => onFormStateChange({ ...formState, others: event.target.value })}
								disabled={isMutating}
								rows={6}
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
