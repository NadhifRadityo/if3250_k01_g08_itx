"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";

import { getRelationshipId } from "@/utils/payload";
import { SearchableSelect } from "@/components/SearchableSelect";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { AlertDialog, AlertDialogTitle, AlertDialogAction, AlertDialogCancel, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogDescription } from "@/components/radix/AlertDialog";
import { Button } from "@/components/radix/Button";
import { Drawer, DrawerTitle, DrawerFooter, DrawerHeader, DrawerContent, DrawerDescription } from "@/components/radix/Drawer";
import { Skeleton } from "@/components/radix/Skeleton";
import { OfficerTask } from "@/payload-types";

import { filterConfigColumns as creditApplicationAssignmentFilterConfigColumns } from "../credit-application-assignment/layout.components";
import { MenuTableConfigColumn, MenuColumnConfigColumn, MenuFilterConfigColumn, useMenuRowValueRenderer, MenuRowValueRendererContext, MenuRowValueRendererConfigColumn } from "../layout.components";
import { searchRelationOfficerTasksAction, searchRelationCreditApplicationAssignmentsAction } from "../relation-navigation.actions";
import { defaultRelationUserRenderer, defaultRelationOfficerTaskRenderer, defaultRelationCreditApplicationAssignmentRenderer } from "../relation-navigation.components";
import { userFilterConfigColumns } from "../user-management/layout.components";
import { FormState, queryExecutorAction } from "./executor.actions";
import { RelationValues, getDetailsAction } from "./layout.actions";
import { settlementStatusSelectOptions } from "./layout.shared";

export type ColumnData = Awaited<ReturnType<typeof queryExecutorAction>>["docs"][number];
export const filterConfigColumns = Object.freeze([
	{ key: "id", label: "Id", type: "relation", relationSearch: searchRelationOfficerTasksAction },
	{ key: "createdAt", label: "Created At", type: "date" },
	{ key: "createdBy", label: "Created By", type: "relation", relationFilterConfigColumn: () => ["User", userFilterConfigColumns] },
	{ key: "updatedAt", label: "Updated At", type: "date" },
	{ key: "updatedBy", label: "Updated By", type: "relation", relationFilterConfigColumn: () => ["User", userFilterConfigColumns] },
	{ key: "deletedAt", label: "Deleted At", type: "date" },
	{ key: "deletedBy", label: "Deleted By", type: "relation", relationFilterConfigColumn: () => ["User", userFilterConfigColumns] },
	{ key: "creditApplicationAssignment", label: "Credit Application Assignment", type: "relation", relationFilterConfigColumn: () => ["Credit Application Assignment", creditApplicationAssignmentFilterConfigColumns] },
	{ key: "creditApplicationAssignmentVersion", label: "Credit Application Assignment Version", type: "text" },
	{ key: "next", label: "Next", type: "relation", relationSearch: searchRelationOfficerTasksAction },
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
	{ key: "deletedAt", label: "Deleted At" },
	{ key: "deletedBy", label: "Deleted By" },
	{ key: "creditApplicationAssignment", label: "Credit Application Assignment" },
	{ key: "creditApplicationAssignmentVersion", label: "Credit Application Assignment Version" },
	{ key: "next", label: "Next" },
	{ key: "settledAt", label: "Settled At" },
	{ key: "settlementStatus", label: "Settlement Status" },
	{ key: "settlementComment", label: "Settlement Comment" },
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
	{ key: "deletedAt", label: "Deleted At", sortable: true },
	{ key: "deletedBy", label: "Deleted By", sortable: false },
	{ key: "creditApplicationAssignment", label: "Credit Application Assignment", sortable: false },
	{ key: "creditApplicationAssignmentVersion", label: "Credit Application Assignment Version", sortable: true },
	{ key: "next", label: "Next", sortable: false },
	{ key: "settledAt", label: "Settled At", sortable: true },
	{ key: "settlementStatus", label: "Settlement Status", sortable: true },
	{ key: "settlementComment", label: "Settlement Comment", sortable: false, className: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" },
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
	{ key: "deletedAt", type: "date" },
	{ key: "deletedBy", type: "relation", render: defaultRelationUserRenderer({ description: "Deleted By", relationSource: "officer-tasks.deletedBy" }) },
	{ key: "creditApplicationAssignment", type: "relation", render: defaultRelationCreditApplicationAssignmentRenderer({ description: "Credit Application Assignment", relationSource: "officer-tasks.creditApplicationAssignment" }) },
	{ key: "creditApplicationAssignmentVersion", type: "text" },
	{ key: "next", type: "relation", render: defaultRelationOfficerTaskRenderer({ description: "Next", relationSource: "officer-tasks.next" }) },
	{ key: "settledAt", type: "date" },
	{ key: "settlementStatus", type: "select", selectOptions: settlementStatusSelectOptions },
	{ key: "settlementComment", type: "richText" },
	{ key: "evaluatedAt", type: "date" },
	{ key: "evaluatedBy", type: "relation", render: defaultRelationUserRenderer({ description: "Evaluated By", relationSource: "officer-tasks.evaluatedBy" }) },
	{ key: "evaluationApproved", type: "boolean" },
	{ key: "evaluationComment", type: "richText" }
] as MenuRowValueRendererConfigColumn<ColumnData, RowValueRendererContext>[]);
export type RowValueRendererContext = {
	relationValues?: RelationValues;
	isMutating?: boolean;
	setEditFormDrawerState?: (v: FormState) => void;
	setEditFormDrawerOpen?: (v: boolean) => void;
	setCancelTargetRow?: (v: ColumnData | null) => void;
	setRestoreTargetRow?: (v: ColumnData | null) => void;
} & MenuRowValueRendererContext;
export const eligibleDetailsTriggerColumns = Object.freeze([
	"id",
	"createdAt",
	"updatedAt",
	"deletedAt",
	"creditApplicationAssignmentVersion",
	"settledAt",
	"settlementStatus",
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
	"evaluatedAt",
	"evaluatedBy",
	"evaluationApproved",
	"evaluationComment",
	"createdBy",
	"updatedBy",
	"deletedBy",
	"createdAt",
	"updatedAt",
	"deletedAt"
]) as string[];
export const defaultColumnsShown = Object.freeze([
	"id",
	"creditApplicationAssignment",
	"creditApplicationAssignmentVersion",
	"settledAt",
	"settlementStatus",
	"evaluatedAt",
	"evaluationApproved",
	"updatedAt"
]) as string[];
export const defaultColumnsSort = Object.freeze([
	["updatedAt", false]
]) as [string, boolean][];

export function DetailsDrawer(
	{ open, onOpenChange, row, rowValueRendererContext, renderActions }:
	{ open: boolean, onOpenChange: (v: boolean) => void, row: ColumnData | null, rowValueRendererContext: RowValueRendererContext, renderActions?: (r: ColumnData) => React.ReactNode }
) {
	const query = useQuery({
		queryKey: ["officer-task", "details", row?.id ?? null],
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
					<DrawerTitle>Officer Task Details</DrawerTitle>
					<DrawerDescription>Review all available columns for this officer task entry.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
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
							<AlertTitle>
								{`${query.error?.name ?? "Error"}`}
							</AlertTitle>
							<AlertDescription>
								{`${query.error?.message ?? "Unable to load officer task details."}`}
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
export function toFormState(data: OfficerTask) {
	return {
		id: data.id,
		creditApplicationAssignment: getRelationshipId(data.creditApplicationAssignment),
		next: getRelationshipId(data.next) ?? undefined
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
					<DrawerDescription>Manage the officer task linkage to its credit application assignment and the next officer task in the chain.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 overflow-y-auto px-4">
					<div className="pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Credit Application Assignment</label>
							<SearchableSelect
								value={formState.creditApplicationAssignment!}
								onValueChange={value => onFormStateChange({ ...formState, creditApplicationAssignment: value })}
								options={[]}
								onSearch={(keyword, selectedValues) => searchRelationCreditApplicationAssignmentsAction(keyword, selectedValues)
									.then(creditApplicationAssignments => creditApplicationAssignments.map(creditApplicationAssignment => ({
										value: creditApplicationAssignment.id,
										label: creditApplicationAssignment.label
									})))}
								disabled={isMutating}
								placeholder="Search credit application assignment"
								searchPlaceholder="Search credit application assignment..."
								allowClear
							/>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Next</label>
							<SearchableSelect
								value={formState.next!}
								onValueChange={value => onFormStateChange({ ...formState, next: value.length > 0 ? value : undefined })}
								options={[]}
								onSearch={(keyword, selectedValues) => searchRelationOfficerTasksAction(keyword, selectedValues)
									.then(officerTasks => officerTasks.map(officerTask => ({
										value: officerTask.id,
										label: officerTask.label
									})))}
								disabled={isMutating}
								placeholder="Search next officer task"
								searchPlaceholder="Search next officer task..."
								allowClear
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

export function CancelDialog(
	{ open, onOpenChange, onConfirm, isMutating }:
	{ open: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void, isMutating: boolean }
) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Cancel Officer Task</AlertDialogTitle>
					<AlertDialogDescription>
						This will mark the officer task as cancelled by setting settledAt and settlementStatus to "cancelled".
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isMutating}>Back</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={onConfirm} disabled={isMutating}>Cancel</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function RestoreDialog(
	{ open, onOpenChange, onConfirm, isMutating }:
	{ open: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void, isMutating: boolean }
) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Restore Officer Task</AlertDialogTitle>
					<AlertDialogDescription>
						This will clear settledAt and settlementStatus to restore the officer task.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isMutating}>Back</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm} disabled={isMutating}>Restore</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
