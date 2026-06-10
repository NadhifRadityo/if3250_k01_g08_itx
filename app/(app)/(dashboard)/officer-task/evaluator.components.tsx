"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SerializedEditorState } from "lexical";
import { ArrowLeftIcon, ArrowRightIcon, CircleAlertIcon } from "lucide-react";

import { rwsa, uwsa } from "@/utils/actions";
import { getRelationshipId } from "@/utils/payload";
import { RichTextInput } from "@/components/RichText";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Badge } from "@/components/radix/Badge";
import { Button } from "@/components/radix/Button";
import { Drawer, DrawerTitle, DrawerFooter, DrawerHeader, DrawerContent, DrawerDescription } from "@/components/radix/Drawer";
import { Skeleton } from "@/components/radix/Skeleton";

import { uploadGenericRichtextImage } from "../../editor-x.actions";
import { filterConfigColumns as creditApplicationAssignmentFilterConfigColumns } from "../credit-application-assignment/layout.components";
import { MenuTableConfigColumn, MenuColumnConfigColumn, MenuFilterConfigColumn, useMenuRowValueRenderer, MenuRowValueRendererContext, MenuRowValueRendererConfigColumn } from "../layout.components";
import { searchRelationOfficerTasksAction } from "../relation-navigation.actions";
import { defaultRelationUserRenderer, defaultRelationOfficerTaskRenderer, defaultRelationCreditApplicationAssignmentRenderer } from "../relation-navigation.components";
import { userFilterConfigColumns } from "../user-management/layout.components";
import { queryAction, RelationValues, getDetailsAction } from "./evaluator.actions";
import { officerTaskStatusLabels, computeOfficerTaskStatus, settlementStatusSelectOptions } from "./layout.shared";

export const defaultStatusRenderer = () =>
	(_, row, { activeIds }) => {
		const status = computeOfficerTaskStatus({ row: row, isActive: activeIds.includes(row.id), dueDate: row.creditApplicationAssignmentDueDate });
		return (<Badge variant={status == "approved" ? "default" : status == "rejected" || status == "cancelled" || status == "stale" ? "destructive" : status == "active" ? "default" : "secondary"}>{officerTaskStatusLabels[status]}</Badge>);
	};

export type ColumnData = rwsa<typeof queryAction>["docs"][number];
export const filterConfigColumns = Object.freeze([
	{ key: "id", label: "Id", type: "relation", relationSearch: uwsa(searchRelationOfficerTasksAction) },
	{ key: "createdAt", label: "Created At", type: "date" },
	{ key: "createdBy", label: "Created By", type: "relation", relationFilterConfigColumn: () => ["User", userFilterConfigColumns] },
	{ key: "updatedAt", label: "Updated At", type: "date" },
	{ key: "updatedBy", label: "Updated By", type: "relation", relationFilterConfigColumn: () => ["User", userFilterConfigColumns] },
	{ key: "creditApplicationAssignment", label: "Credit Application Assignment", type: "relation", relationFilterConfigColumn: () => ["Credit Application Assignment", creditApplicationAssignmentFilterConfigColumns] },
	{ key: "creditApplicationAssignmentVersion", label: "Credit Application Assignment Version", type: "text" },
	{ key: "settledAt", label: "Settled At", type: "date" },
	{ key: "settlementStatus", label: "Settlement Status", type: "select", selectOptions: settlementStatusSelectOptions },
	{ key: "evaluatedAt", label: "Evaluated At", type: "date" },
	{ key: "evaluatedBy", label: "Evaluated By", type: "relation", relationFilterConfigColumn: () => ["User", userFilterConfigColumns] },
	{ key: "evaluationApproved", label: "Evaluation Approved", type: "boolean" }
] as MenuFilterConfigColumn[]);
export const columnConfigColumns = Object.freeze([
	{ key: "id", label: "Id" },
	{ key: "createdAt", label: "Created At" },
	{ key: "createdBy", label: "Created By" },
	{ key: "updatedAt", label: "Updated At" },
	{ key: "updatedBy", label: "Updated By" },
	{ key: "creditApplicationAssignment", label: "Credit Application Assignment" },
	{ key: "creditApplicationAssignmentVersion", label: "Credit Application Assignment Version" },
	{ key: "next", label: "Next" },
	{ key: "settledAt", label: "Settled At" },
	{ key: "settlementStatus", label: "Settlement Status" },
	{ key: "settlementComment", label: "Settlement Comment" },
	{ key: "#status", label: "Status" },
	{ key: "evaluatedAt", label: "Evaluated At" },
	{ key: "evaluatedBy", label: "Evaluated By" },
	{ key: "evaluationApproved", label: "Evaluation Approved" },
	{ key: "evaluationComment", label: "Evaluation Comment" }
] as MenuColumnConfigColumn[]);
export const tableConfigColumns = Object.freeze([
	{ key: "id", label: "Id", sortable: true, className: "text-xs" },
	{ key: "createdAt", label: "Created At", sortable: true },
	{ key: "createdBy", label: "Created By", sortable: false },
	{ key: "updatedAt", label: "Updated At", sortable: true },
	{ key: "updatedBy", label: "Updated By", sortable: false },
	{ key: "creditApplicationAssignment", label: "Credit Application Assignment", sortable: false },
	{ key: "creditApplicationAssignmentVersion", label: "Credit Application Assignment Version", sortable: true },
	{ key: "next", label: "Next", sortable: false },
	{ key: "settledAt", label: "Settled At", sortable: true },
	{ key: "settlementStatus", label: "Settlement Status", sortable: true },
	{ key: "settlementComment", label: "Settlement Comment", sortable: false, className: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" },
	{ key: "#status", label: "Status", sortable: false },
	{ key: "evaluatedAt", label: "Evaluated At", sortable: true },
	{ key: "evaluatedBy", label: "Evaluated By", sortable: false },
	{ key: "evaluationApproved", label: "Evaluation Approved", sortable: true },
	{ key: "evaluationComment", label: "Evaluation Comment", sortable: false, className: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" }
] as MenuTableConfigColumn[]);
export const rowValueRendererConfigColumns = Object.freeze([
	{ key: "id", type: "text", render: v => (<span className="font-mono">{v}</span>) },
	{ key: "createdAt", type: "date" },
	{ key: "createdBy", type: "relation", render: defaultRelationUserRenderer({ description: "Created By", relationSource: "officer-tasks.createdBy" }) },
	{ key: "updatedAt", type: "date" },
	{ key: "updatedBy", type: "relation", render: defaultRelationUserRenderer({ description: "Updated By", relationSource: "officer-tasks.updatedBy" }) },
	{ key: "creditApplicationAssignment", type: "relation", render: defaultRelationCreditApplicationAssignmentRenderer({ description: "Credit Application Assignment", relationSource: "officer-tasks.creditApplicationAssignment" }) },
	{ key: "creditApplicationAssignmentVersion", type: "text" },
	{ key: "next", type: "relation", render: defaultRelationOfficerTaskRenderer({ description: "Next", relationSource: "officer-tasks.next" }) },
	{ key: "settledAt", type: "date" },
	{ key: "settlementStatus", type: "select", selectOptions: settlementStatusSelectOptions },
	{ key: "settlementComment", type: "richText" },
	{ key: "#status", type: "null", render: defaultStatusRenderer() },
	{ key: "evaluatedAt", type: "date" },
	{ key: "evaluatedBy", type: "relation", render: defaultRelationUserRenderer({ description: "Evaluated By", relationSource: "officer-tasks.evaluatedBy" }) },
	{ key: "evaluationApproved", type: "boolean" },
	{ key: "evaluationComment", type: "richText" }
] as MenuRowValueRendererConfigColumn<ColumnData, RowValueRendererContext>[]);
export type RowValueRendererContext = {
	relationValues?: RelationValues;
	activeIds?: string[];
	isMutating?: boolean;
	setEvaluateDrawerRow?: (v: ColumnData | null) => void;
	setEvaluateDrawerOpen?: (v: boolean) => void;
} & MenuRowValueRendererContext;
export const eligibleDetailsTriggerColumns = Object.freeze([
	"id",
	"createdAt",
	"updatedAt",
	"creditApplicationAssignmentVersion",
	"settledAt",
	"settlementStatus",
	"#status",
	"evaluatedAt",
	"evaluationApproved"
]);
export const drawerValueRendererConfigColumns = rowValueRendererConfigColumns;
export const defaultColumnOrder = Object.freeze([
	"id",
	"creditApplicationAssignment",
	"creditApplicationAssignmentVersion",
	"next",
	"settledAt",
	"settlementStatus",
	"settlementComment",
	"#status",
	"evaluatedAt",
	"evaluatedBy",
	"evaluationApproved",
	"evaluationComment",
	"createdBy",
	"updatedBy",
	"createdAt",
	"updatedAt"
]) as string[];
export const defaultColumnsShown = Object.freeze([
	"id",
	"creditApplicationAssignment",
	"creditApplicationAssignmentVersion",
	"settledAt",
	"settlementStatus",
	"#status",
	"evaluatedAt",
	"evaluationApproved",
	"updatedAt"
]) as string[];
export const defaultColumnsSort = Object.freeze([
	["updatedAt", false]
]) as [string, boolean][];

export function DetailsDrawer(
	{ open, onOpenChange, row, rowValueRendererContext, renderActions, onChainNavigate }:
	{ open: boolean, onOpenChange: (v: boolean) => void, row: ColumnData | null, rowValueRendererContext: RowValueRendererContext, renderActions?: (r: ColumnData) => React.ReactNode, onChainNavigate?: (id: string) => void }
) {
	const query = useQuery({
		queryKey: ["officer-task", "details", row?.id ?? null],
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
	const previousId = query.data?.row.previous ?? null;
	const nextId = getRelationshipId(query.data?.row.next);
	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-2xl">
				<DrawerHeader>
					<DrawerTitle>Officer Task Details</DrawerTitle>
					<DrawerDescription>Review all available columns for this officer task entry.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
					{onChainNavigate != null ? (
						<div className="flex items-center gap-2">
							<Button
								type="button"
								size="sm"
								variant="outline"
								disabled={previousId == null || query.isFetching}
								onClick={() => { if(previousId != null) onChainNavigate(previousId); }}
							>
								<ArrowLeftIcon />Previous
							</Button>
							<Button
								type="button"
								size="sm"
								variant="outline"
								disabled={nextId == null || query.isFetching}
								onClick={() => { if(nextId != null) onChainNavigate(nextId); }}
							>
								<ArrowRightIcon />Next
							</Button>
						</div>
					) : null}
					{row == null ? (
						<p className="text-muted-foreground text-sm">
							No officer task selected.
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
							<AlertTitle>{`${query.error?.name ?? "Error"}`}</AlertTitle>
							<AlertDescription>{`${query.error?.message ?? "Unable to load officer task details."}`}</AlertDescription>
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
					{row != null && renderActions != null ? renderActions(row) : null}
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

export function EvaluateDrawer(
	{ open, onOpenChange, row, rowValueRendererContext, evaluationComment, onEvaluationCommentChange, onApprove, onReject, mutationError, isMutating = false }:
	{ open: boolean, onOpenChange: (v: boolean) => void, row: ColumnData | null, rowValueRendererContext: RowValueRendererContext, evaluationComment: SerializedEditorState, onEvaluationCommentChange: (v: SerializedEditorState) => void, onApprove: () => void, onReject: () => void, mutationError?: any, isMutating?: boolean }
) {
	const query = useQuery({
		queryKey: ["officer-task", "details", row?.id ?? null],
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
	const columnLabels = useMemo(() => Object.fromEntries(drawerValueRendererConfigColumns.filter(c => !["evaluatedAt", "evaluatedBy", "evaluationApproved", "evaluationComment"].includes(c.key))
		.map(column => [column.key, tableConfigColumns.find(column2 => column2.key == column.key)!.label] as const)), []);
	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-2xl">
				<DrawerHeader>
					<DrawerTitle>Evaluate</DrawerTitle>
					<DrawerDescription>Review the officer task details before making an evaluation decision. The evaluation acts on the latest officer task in the chain (where next is null).</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
					{row == null ? (
						<p className="text-muted-foreground text-sm">
							No officer task selected.
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
							<AlertTitle>{`${query.error?.name ?? "Error"}`}</AlertTitle>
							<AlertDescription>{`${query.error?.message ?? "Unable to load officer task details."}`}</AlertDescription>
						</Alert>
					) : (
						<div className="space-y-2">
							{drawerValueRendererConfigColumns.map(column => (
								<div key={column.key} className="space-y-1 rounded-lg border p-3">
									<p className="text-muted-foreground text-xs font-medium">
										{columnLabels[column.key]}
									</p>
									{renderValue(query.data.row, column.key)}
								</div>
							))}
						</div>
					)}
					{mutationError != null ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>{`${mutationError?.name ?? "Error"}`}</AlertTitle>
							<AlertDescription>{`${mutationError?.message ?? "Unable to submit evaluation."}`}</AlertDescription>
						</Alert>
					) : null}
					<div className="space-y-2">
						<label className="text-sm font-medium">Evaluation Comment</label>
						<RichTextInput
							serializedState={evaluationComment}
							onSerializedStateChange={onEvaluationCommentChange}
							onImageUpload={uwsa(uploadGenericRichtextImage)}
							disabled={isMutating}
						/>
					</div>
				</div>
				<DrawerFooter className="border-t sm:flex-row sm:justify-end">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
					<Button type="button" variant="default" onClick={onApprove} disabled={isMutating || query.data == null || query.data?.row.evaluationApproved == true || query.data?.row.evaluationApproved == false}>Approve</Button>
					<Button type="button" variant="destructive" onClick={onReject} disabled={isMutating || query.data == null || query.data?.row.evaluationApproved == false}>Reject</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
