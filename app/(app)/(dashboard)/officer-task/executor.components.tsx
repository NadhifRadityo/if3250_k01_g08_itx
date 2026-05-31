"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SerializedEditorState } from "lexical";
import { ArrowLeftIcon, ArrowRightIcon, NavigationIcon, CircleAlertIcon } from "lucide-react";

import { getRelationshipId } from "@/utils/payload";
import { RichTextInput } from "@/components/RichText";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { AlertDialog, AlertDialogTitle, AlertDialogAction, AlertDialogCancel, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogDescription } from "@/components/radix/AlertDialog";
import { Badge } from "@/components/radix/Badge";
import { Button } from "@/components/radix/Button";
import { Drawer, DrawerTitle, DrawerFooter, DrawerHeader, DrawerContent, DrawerDescription } from "@/components/radix/Drawer";
import { Input } from "@/components/radix/Input";
import { Skeleton } from "@/components/radix/Skeleton";

import { uploadGenericRichtextImage } from "../../editor-x.actions";
import { filterConfigColumns as creditApplicationAssignmentFilterConfigColumns } from "../credit-application-assignment/layout.components";
import { MenuTableConfigColumn, MenuColumnConfigColumn, MenuFilterConfigColumn, useMenuRowValueRenderer, MenuRowValueRendererContext, MenuRowValueRendererConfigColumn } from "../layout.components";
import { searchRelationOfficerTasksAction } from "../relation-navigation.actions";
import { defaultRelationUserRenderer, defaultRelationOfficerTaskRenderer, defaultRelationCreditApplicationAssignmentRenderer } from "../relation-navigation.components";
import { userFilterConfigColumns } from "../user-management/layout.components";
import { queryAction, RelationValues, getDetailsAction, appendGpsLogAction } from "./executor.actions";
import { officerTaskStatusLabels, computeOfficerTaskStatus, settlementStatusSelectOptions } from "./layout.shared";

export const defaultStatusRenderer = () =>
	(_, row, { activeOfficerTask }) => {
		const status = computeOfficerTaskStatus({ row: row, isActive: activeOfficerTask?.id == row.id, dueDate: row.creditApplicationAssignmentDueDate });
		return (<Badge variant={status == "approved" ? "default" : status == "rejected" || status == "cancelled" || status == "stale" ? "destructive" : status == "active" ? "default" : "secondary"}>{officerTaskStatusLabels[status]}</Badge>);
	};

export type ColumnData = Awaited<ReturnType<typeof queryAction>>["docs"][number];
export const filterConfigColumns = Object.freeze([
	{ key: "id", label: "Id", type: "relation", relationSearch: searchRelationOfficerTasksAction },
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
	activeOfficerTask?: { id: string, otpEntered: boolean } | null;
	isMutating?: boolean;
	onActivate?: (row: ColumnData) => void;
	onClearActive?: (row: ColumnData) => void;
	onSendOtp?: (row: ColumnData) => void;
	onInputOtp?: (row: ColumnData) => void;
	onFillSurvey?: (row: ColumnData) => void;
	onFinish?: (row: ColumnData) => void;
	onUndoFinish?: (row: ColumnData) => void;
	onCancel?: (row: ColumnData) => void;
	onSendSatisfactionSurvey?: (row: ColumnData) => void;
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
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
					{row != null && renderActions != null ? renderActions(row) : null}
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

export function ActivateDialog(
	{ open, onOpenChange, isMutating, onConfirm }:
	{ open: boolean, onOpenChange: (v: boolean) => void, isMutating: boolean, onConfirm: () => void }
) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Activate Officer Task</AlertDialogTitle>
					<AlertDialogDescription>
						This sets this officer task as your active officer task.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isMutating}>Back</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm} disabled={isMutating}>Activate</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function ClearActiveDialog(
	{ open, onOpenChange, isMutating, onConfirm }:
	{ open: boolean, onOpenChange: (v: boolean) => void, isMutating: boolean, onConfirm: () => void }
) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Clear Active Officer Task</AlertDialogTitle>
					<AlertDialogDescription>
						This clears your currently active officer task.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isMutating}>Back</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={onConfirm} disabled={isMutating}>Clear</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function SendOtpDialog(
	{ open, onOpenChange, isMutating, onConfirm }:
	{ open: boolean, onOpenChange: (v: boolean) => void, isMutating: boolean, onConfirm: () => void }
) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Send OTP</AlertDialogTitle>
					<AlertDialogDescription>
						This sends a 6-digit time-based OTP via WhatsApp to the customer. The OTP is valid for 30 minutes.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isMutating}>Back</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm} disabled={isMutating}>Send</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function InputOtpDialog(
	{ open, onOpenChange, otp, onOtpChange, onConfirm, mutationError, isMutating }:
	{ open: boolean, onOpenChange: (v: boolean) => void, otp: string, onOtpChange: (v: string) => void, onConfirm: () => void, mutationError?: any, isMutating: boolean }
) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Input OTP</AlertDialogTitle>
					<AlertDialogDescription>Enter the 6-digit OTP code received from the customer.</AlertDialogDescription>
				</AlertDialogHeader>
				<div className="space-y-2">
					<Input
						value={otp}
						onChange={e => onOtpChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
						placeholder="123456"
						inputMode="numeric"
						className="font-mono text-center text-lg tracking-widest"
						disabled={isMutating}
					/>
					{mutationError != null ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>{`${mutationError?.name ?? "Error"}`}</AlertTitle>
							<AlertDescription>{`${mutationError?.message ?? "Unable to verify OTP."}`}</AlertDescription>
						</Alert>
					) : null}
				</div>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={e => { e.preventDefault(); onConfirm(); }} disabled={isMutating || otp.length != 6}>Confirm</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function FinishDialog(
	{ open, onOpenChange, settlementComment, onSettlementCommentChange, onConfirm, mutationError, isMutating }:
	{ open: boolean, onOpenChange: (v: boolean) => void, settlementComment: SerializedEditorState, onSettlementCommentChange: (v: SerializedEditorState) => void, onConfirm: () => void, mutationError?: any, isMutating: boolean }
) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="md:min-w-[520px]">
				<AlertDialogHeader>
					<AlertDialogTitle>Finish Officer Task</AlertDialogTitle>
					<AlertDialogDescription>
						Optionally provide a settlement comment to give the evaluator additional notes, then finish the officer task to be evaluated.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className="space-y-2 min-w-0">
					<label className="text-sm font-medium">Settlement Comment</label>
					<RichTextInput
						serializedState={settlementComment}
						onSerializedStateChange={onSettlementCommentChange}
						onImageUpload={uploadGenericRichtextImage}
						disabled={isMutating}
					/>
				</div>
				{mutationError != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>{`${mutationError?.name ?? "Error"}`}</AlertTitle>
						<AlertDescription>{`${mutationError?.message ?? "Unable to finish officer task."}`}</AlertDescription>
					</Alert>
				) : null}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={e => { e.preventDefault(); onConfirm(); }} disabled={isMutating}>Finish</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function UndoFinishDialog(
	{ open, onOpenChange, isMutating, onConfirm }:
	{ open: boolean, onOpenChange: (v: boolean) => void, isMutating: boolean, onConfirm: () => void }
) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Undo Finish</AlertDialogTitle>
					<AlertDialogDescription>
						This reverts this officer task back to pending so you can edit the settlement comment or cancel it.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isMutating}>Back</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={onConfirm} disabled={isMutating}>Undo Finish</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function CancelDialog(
	{ open, onOpenChange, settlementComment, onSettlementCommentChange, onConfirm, mutationError, isMutating }:
	{ open: boolean, onOpenChange: (v: boolean) => void, settlementComment: SerializedEditorState, onSettlementCommentChange: (v: SerializedEditorState) => void, onConfirm: () => void, mutationError?: any, isMutating: boolean }
) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="md:min-w-[520px]">
				<AlertDialogHeader>
					<AlertDialogTitle>Cancel Officer Task</AlertDialogTitle>
					<AlertDialogDescription>
						Optionally provide a settlement comment to give the evaluator additional notes, then cancel this officer task. A new officer task will be created in the chain.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className="space-y-2 min-w-0">
					<label className="text-sm font-medium">Settlement Comment</label>
					<RichTextInput
						serializedState={settlementComment}
						onSerializedStateChange={onSettlementCommentChange}
						onImageUpload={uploadGenericRichtextImage}
						disabled={isMutating}
					/>
				</div>
				{mutationError != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>{`${mutationError?.name ?? "Error"}`}</AlertTitle>
						<AlertDescription>{`${mutationError?.message ?? "Unable to cancel officer task."}`}</AlertDescription>
					</Alert>
				) : null}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isMutating}>Back</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={e => { e.preventDefault(); onConfirm(); }} disabled={isMutating}>Cancel Task</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function SendSatisfactionSurveyDialog(
	{ open, onOpenChange, isMutating, onConfirm }:
	{ open: boolean, onOpenChange: (v: boolean) => void, isMutating: boolean, onConfirm: () => void }
) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Send Satisfaction Survey</AlertDialogTitle>
					<AlertDialogDescription>
						This sends a WhatsApp message containing a link to fill the satisfaction survey to the customer.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isMutating}>Back</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm} disabled={isMutating}>Send</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function GeofenceWarningDialog(
	{ open, onOpenChange }:
	{ open: boolean, onOpenChange: (v: boolean) => void }
) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Location Out of Geofence</AlertDialogTitle>
					<AlertDialogDescription>
						You must have your location enabled and be within the assigned geofence regions before continuing. Please activate your location and ensure you are inside the geofence regions.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogAction onClick={() => onOpenChange(false)}>OK</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function ActivateLocationButton(
	{ disabled, onGeofenceStatusChange }:
	{ disabled?: boolean, onGeofenceStatusChange?: (isInside: boolean) => void }
) {
	const [isActive, setIsActive] = useState(false);
	const [error, setError] = useState(null as any);
	const onGeofenceStatusChangeRef = useRef(onGeofenceStatusChange);
	onGeofenceStatusChangeRef.current = onGeofenceStatusChange;
	useEffect(() => {
		if(!isActive) return;
		const watchId = navigator.geolocation.watchPosition(
			async position => {
				setError(null);
				if(!document.hasFocus()) return;
				try {
					const result = await appendGpsLogAction({
						latitude: position.coords.latitude,
						longitude: position.coords.longitude,
						accuracy: position.coords.accuracy
					});
					onGeofenceStatusChangeRef.current?.(result.isInsideGeofence);
				} catch(error) {
					setError(error);
				}
			},
			error => {
				setError(error);
			},
			{ enableHighAccuracy: true, maximumAge: 5000, timeout: 60000 }
		);
		return () => {
			navigator.geolocation.clearWatch(watchId);
			setError(null);
		};
	}, [isActive]);
	return (
		<>
			<Button
				type="button"
				variant={isActive ? "default" : "outline"}
				onClick={() => { setError(null); setIsActive(previous => !previous); }}
				disabled={disabled}
			>
				<NavigationIcon />{isActive ? "Location Active" : "Activate Location"}
			</Button>
			{error != null ? (
				<Alert variant="destructive">
					<CircleAlertIcon />
					<AlertTitle>{`${error?.name ?? "Location Error"}`}</AlertTitle>
					<AlertDescription>{`${error?.message ?? "An error occured while querying geolocation."}`}</AlertDescription>
				</Alert>
			) : null}
		</>
	);
}
