"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/radix/Alert";
import { Badge } from "@/components/radix/Badge";
import { Button } from "@/components/radix/Button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/radix/Dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/radix/Drawer";
import { Input } from "@/components/radix/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/radix/Select";
import { Skeleton } from "@/components/radix/Skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/radix/Table";
import { Textarea } from "@/components/radix/Textarea";

import * as sqhActions from "./layout.actions";
import type { SurveyHeaderTableRow, SurveyHeaderFormState, SurveyHeaderRelationValues, QuerySurveyHeadersOutput } from "./layout.actions";

export type { SurveyHeaderTableRow, SurveyHeaderFormState };

export type ActionError = { title: string; message: string };
export function resolveActionError(error: unknown, fallback: string): ActionError {
	if(error instanceof Error) return { title: "Error", message: error.message || fallback };
	return { title: "Error", message: fallback };
}

const PAGE_SIZE = 10;

function getReviewStatus(row: SurveyHeaderTableRow): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
	if(row.reviewedAt == null) return { label: "Pending", variant: "secondary" };
	if(row.reviewApproved == true) return { label: "Approved", variant: "default" };
	return { label: "Rejected", variant: "destructive" };
}

function getRequestType(row: SurveyHeaderTableRow): string {
	if(row.isSoftDeleted) return "Delete";
	if(row.reviewedAt == null && row.createdAt == row.updatedAt) return "Create";
	return "Update";
}

function formatDateTime(value: string | null | undefined): string {
	if(value == null) return "-";
	const date = new Date(value);
	if(Number.isNaN(date.getTime())) return value;
	return `${date.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})} ${date.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",hour12:false})}`;
}

const emptyQueryResult: QuerySurveyHeadersOutput = { docs: [], totalDocs: 0, page: 1, hasNextPage: false, hasPreviousPage: false };

// ── useSurveyHeaderQuery ───────────────────────────────────────────────────
export function useSurveyHeaderQuery({ queryScope, queryAction, keyword, pageIndex }: {
	queryScope: string;
	queryAction: (input: { keyword: string; page: number; limit: number }) => Promise<QuerySurveyHeadersOutput>;
	keyword: string;
	pageIndex: number;
}) {
	const [debouncedKeyword, setDebouncedKeyword] = useState(keyword);
	useEffect(() => {
		const t = setTimeout(() => setDebouncedKeyword(keyword), 400);
		return () => clearTimeout(t);
	}, [keyword]);

	const queryResult_raw = useQuery({
		queryKey: ["survey-header-management", queryScope, debouncedKeyword, pageIndex],
		queryFn: () => queryAction({ keyword: debouncedKeyword, page: pageIndex, limit: PAGE_SIZE }),
		staleTime: 15000,
		refetchOnWindowFocus: true
	});

	return {
		queryResult: queryResult_raw.data ?? emptyQueryResult,
		isLoading: queryResult_raw.isPending,
		queryErrorMessage: queryResult_raw.isError ? "Failed to load data." : null
	};
}

// ── useSurveyHeaderRelations ───────────────────────────────────────────────
export function useSurveyHeaderRelations({ docs }: { docs: SurveyHeaderTableRow[] }) {
	const [relationValuesByRowId, setRelationValuesByRowId] = useState<Record<string, SurveyHeaderRelationValues>>({});
	const [isRelationLoading, setIsRelationLoading] = useState(false);

	useEffect(() => {
		if(docs.length == 0) return;
		setIsRelationLoading(true);
		sqhActions.resolveSurveyHeaderRelationColumnsAction(docs.map(row => ({ id: row.id, createdById: row.createdById, updatedById: row.updatedById, deletedById: row.deletedById, reviewedById: row.reviewedById })))
			.then(results => {
				const map: Record<string, SurveyHeaderRelationValues> = {};
				for(const r of results) map[r.id] = r.values;
				setRelationValuesByRowId(map);
			})
			.catch(() => {})
			.finally(() => setIsRelationLoading(false));
	}, [docs]);

	return { relationValuesByRowId, isRelationLoading };
}

// ── SurveyHeaderTable ──────────────────────────────────────────────────────
export function SurveyHeaderTable({ queryResult, isLoading, isMutating, onOpenDetails, renderActions }: {
	queryResult: QuerySurveyHeadersOutput;
	isLoading: boolean;
	isMutating: boolean;
	onOpenDetails: (row: SurveyHeaderTableRow) => void;
	renderActions: (row: SurveyHeaderTableRow) => ReactNode;
}) {
	return (
		<div className="rounded-xl border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Parent ID</TableHead>
						<TableHead>Parent Description</TableHead>
						<TableHead>Product</TableHead>
						<TableHead>Is Active</TableHead>
						<TableHead>Updated Time</TableHead>
						<TableHead>Updated By</TableHead>
						<TableHead>Approved Time</TableHead>
						<TableHead>Approved By</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className="w-40">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{isLoading && <TableRow><TableCell colSpan={10} className="text-muted-foreground py-8 text-center">Loading headers...</TableCell></TableRow>}
					{!isLoading && queryResult.docs.length == 0 && <TableRow><TableCell colSpan={10} className="text-muted-foreground py-8 text-center">No headers found.</TableCell></TableRow>}
					{queryResult.docs.map(row => (
						<SurveyHeaderTableRowComp key={row.id} row={row} isMutating={isMutating} onOpenDetails={onOpenDetails} renderActions={renderActions} />
					))}
				</TableBody>
			</Table>
		</div>
	);
}

function SurveyHeaderTableRowComp({ row, isMutating, onOpenDetails, renderActions }: { row: SurveyHeaderTableRow; isMutating: boolean; onOpenDetails: (row: SurveyHeaderTableRow) => void; renderActions: (row: SurveyHeaderTableRow) => ReactNode }) {
	const [relValues, setRelValues] = useState<SurveyHeaderRelationValues>({});
	useEffect(() => {
		sqhActions.resolveSurveyHeaderRelationColumnsAction([{ id: row.id, createdById: row.createdById, updatedById: row.updatedById, deletedById: row.deletedById, reviewedById: row.reviewedById }])
			.then(results => { if(results[0]) setRelValues(results[0].values); })
			.catch(() => {});
	}, [row]);
	const status = getReviewStatus(row);
	return (
		<TableRow>
			<TableCell className="font-mono text-xs">{row.id.slice(0, 8)}…</TableCell>
			<TableCell>
				<Button type="button" variant="link" onClick={() => onOpenDetails(row)} className="h-auto p-0 text-left whitespace-normal">{row.parentDescription || "-"}</Button>
			</TableCell>
			<TableCell>{row.product || "-"}</TableCell>
			<TableCell>
				<Badge variant={row.isActive == "yes" ? "default" : "secondary"}>{row.isActive == "yes" ? "Yes" : "No"}</Badge>
			</TableCell>
			<TableCell className="text-sm">{formatDateTime(row.updatedAt)}</TableCell>
			<TableCell>{relValues.updatedBy ?? <span className="inline-block h-4 w-20 animate-pulse rounded bg-muted" />}</TableCell>
			<TableCell className="text-sm">{formatDateTime(row.reviewedAt)}</TableCell>
			<TableCell>{relValues.reviewedBy ?? <span className="inline-block h-4 w-20 animate-pulse rounded bg-muted" />}</TableCell>
			<TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
			<TableCell><div className="flex flex-wrap gap-2">{renderActions(row)}</div></TableCell>
		</TableRow>
	);
}

// ── SurveyHeaderFormDrawer ─────────────────────────────────────────────────
export function SurveyHeaderFormDrawer({ open, onOpenChange, formState, formError, isMutating, onParentDescriptionChange, onProductChange, onIsActiveChange, onSubmit }: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	formState: SurveyHeaderFormState;
	formError: ActionError | null;
	isMutating: boolean;
	onParentDescriptionChange: (v: string) => void;
	onProductChange: (v: string) => void;
	onIsActiveChange: (v: "yes" | "no") => void;
	onSubmit: () => void;
}) {
	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-lg">
				<DrawerHeader>
					<DrawerTitle>{formState.headerId == null ? "Add Survey Question Header" : "Edit Survey Question Header"}</DrawerTitle>
					<DrawerDescription>Changes create pending requests that require checker review.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 overflow-y-auto px-4">
					<div className="grid gap-4 pb-4">
						<div className="space-y-2">
							<label className="text-sm font-medium">Parent Description *</label>
							<Input value={formState.parentDescription} onChange={e => onParentDescriptionChange(e.target.value)} placeholder="Enter parent description" />
							<p className="text-muted-foreground text-xs">Mandatory</p>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Product *</label>
							<Input value={formState.product} onChange={e => onProductChange(e.target.value)} placeholder="Enter product name" />
							<p className="text-muted-foreground text-xs">Mandatory</p>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Is Active *</label>
							<Select value={formState.isActive} onValueChange={v => onIsActiveChange(v as "yes" | "no")}>
								<SelectTrigger><SelectValue /></SelectTrigger>
								<SelectContent>
									<SelectItem value="yes">Yes</SelectItem>
									<SelectItem value="no">No</SelectItem>
								</SelectContent>
							</Select>
							<p className="text-muted-foreground text-xs">Mandatory, harcode option (yes/no)</p>
						</div>
						{formError != null && (
							<Alert variant="destructive">
								<CircleAlertIcon /><AlertTitle>{formError.title}</AlertTitle><AlertDescription>{formError.message}</AlertDescription>
							</Alert>
						)}
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

// ── SurveyHeaderDetailsDrawer ──────────────────────────────────────────────
export function SurveyHeaderDetailsDrawer({ open, onOpenChange, row, renderActions }: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	row: SurveyHeaderTableRow | null;
	renderActions: (row: SurveyHeaderTableRow) => ReactNode;
}) {
	const detailsQuery = useQuery({ queryKey: ["survey-header-management", "details", row?.id ?? null], enabled: open && row != null, queryFn: () => sqhActions.getSurveyHeaderDetailsAction(row!.id), refetchInterval: 10000 });
	const details = detailsQuery.data;
	const actionRow = details?.row ?? row;
	const renderField = (label: string, value: ReactNode) => (
		<div className="space-y-1 rounded-lg border p-3">
			<p className="text-muted-foreground text-xs font-medium">{label}</p>
			<div className="text-sm wrap-break-word">{value}</div>
		</div>
	);
	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-lg">
				<DrawerHeader>
					<DrawerTitle>Survey Question Header Details</DrawerTitle>
					<DrawerDescription>Review all fields for this header request.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
					{row == null ? <p className="text-muted-foreground text-sm">No entry selected.</p> :
					detailsQuery.isPending ? <><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></> :
					detailsQuery.isError || details == null ? <Alert variant="destructive"><CircleAlertIcon /><AlertTitle>Error</AlertTitle><AlertDescription>Unable to load details.</AlertDescription></Alert> : (
						<>
							{renderField("Question Parent ID", <span className="font-mono text-xs">{details.row.id}</span>)}
							{renderField("Parent Description", details.row.parentDescription)}
							{renderField("Product", details.row.product)}
							{renderField("Is Active", <Badge variant={details.row.isActive == "yes" ? "default" : "secondary"}>{details.row.isActive == "yes" ? "Yes" : "No"}</Badge>)}
							{renderField("Status", <Badge variant={getReviewStatus(details.row).variant}>{getReviewStatus(details.row).label}</Badge>)}
							{renderField("Request Type", getRequestType(details.row))}
							{renderField("Updated Time", formatDateTime(details.row.updatedAt))}
							{renderField("Updated By", details.relationValues.updatedBy ?? "-")}
							{renderField("Approved Time", formatDateTime(details.row.reviewedAt))}
							{renderField("Approved By", details.relationValues.reviewedBy ?? "-")}
							{renderField("Review Comment", details.row.reviewCommentText || "-")}
						</>
					)}
				</div>
				<DrawerFooter className="border-t sm:flex-row sm:items-center sm:justify-end">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
					{actionRow != null && renderActions(actionRow)}
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

// ── SurveyHeaderReviewDrawer ───────────────────────────────────────────────
export function SurveyHeaderReviewDrawer({ open, onOpenChange, row, reviewReason, onReviewReasonChange, onApprove, onReject, isMutating, reviewError }: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	row: SurveyHeaderTableRow | null;
	reviewReason: string;
	onReviewReasonChange: (v: string) => void;
	onApprove: () => void;
	onReject: () => void;
	isMutating: boolean;
	reviewError: ActionError | null;
}) {
	const diffQuery = useQuery({ queryKey: ["survey-header-management", "review-diff", row?.id ?? null], enabled: open && row != null, queryFn: () => sqhActions.getSurveyHeaderReviewDiffAction(row!.id), refetchInterval: 10000 });
	const diff = diffQuery.data;
	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-lg">
				<DrawerHeader><DrawerTitle>Review Header Request</DrawerTitle><DrawerDescription>Compare changes before approving or rejecting.</DrawerDescription></DrawerHeader>
				<div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
					{diffQuery.isPending ? <><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></> :
					diff == null ? <p className="text-muted-foreground text-sm">No diff available.</p> : (
						<>
							<div className="bg-muted/30 rounded-lg border p-3 text-sm">
								<p><span className="font-medium">Request Type:</span> {diff.requestType}</p>
								<p className="text-muted-foreground">{diff.changedCount} changed field(s)</p>
							</div>
							{diff.items.map(item => (
								<div key={item.field} className="space-y-2 rounded-lg border p-3">
									<div className="flex items-center justify-between gap-2">
										<p className="text-sm font-medium">{item.label}</p>
										<Badge variant={item.changed ? "default" : "secondary"}>{item.changed ? "Changed" : "Unchanged"}</Badge>
									</div>
									<div className="grid gap-2 sm:grid-cols-2">
										<div className="space-y-1"><p className="text-muted-foreground text-xs font-medium">Last Approved</p><div className="bg-muted/50 min-h-9 rounded border px-2 py-1.5 text-sm">{item.previousValue}</div></div>
										<div className="space-y-1"><p className="text-muted-foreground text-xs font-medium">Requested</p><div className="bg-muted/50 min-h-9 rounded border px-2 py-1.5 text-sm">{item.requestedValue}</div></div>
									</div>
								</div>
							))}
						</>
					)}
					{reviewError != null && <Alert variant="destructive"><CircleAlertIcon /><AlertTitle>{reviewError.title}</AlertTitle><AlertDescription>{reviewError.message}</AlertDescription></Alert>}
					<div className="space-y-2">
						<label className="text-sm font-medium">Review Reason (optional)</label>
						<Textarea value={reviewReason} onChange={e => onReviewReasonChange(e.target.value)} placeholder="Provide a reason" />
					</div>
				</div>
				<DrawerFooter className="border-t sm:flex-row sm:justify-end">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isMutating}>Cancel</Button>
					<Button type="button" variant="default" onClick={onApprove} disabled={isMutating || diff == null}>Approve</Button>
					<Button type="button" variant="destructive" onClick={onReject} disabled={isMutating || diff == null}>Reject</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

// ── SurveyHeaderDeleteDialog ───────────────────────────────────────────────
export function SurveyHeaderDeleteDialog({ open, onOpenChange, row, isMutating, onConfirm }: { open: boolean; onOpenChange: (open: boolean) => void; row: SurveyHeaderTableRow | null; isMutating: boolean; onConfirm: () => void }) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader><DialogTitle>Delete Header</DialogTitle><DialogDescription>This will mark the header for deletion and submit it for checker review.</DialogDescription></DialogHeader>
				{row != null && <p className="text-sm px-1">Are you sure you want to delete <span className="font-medium">{row.parentDescription}</span>?</p>}
				<DialogFooter>
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isMutating}>Cancel</Button>
					<Button type="button" variant="destructive" onClick={onConfirm} disabled={isMutating}>Delete</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ── SurveyHeaderCancelDialog ───────────────────────────────────────────────
export function SurveyHeaderCancelDialog({ open, onOpenChange, row, isMutating, onConfirm }: { open: boolean; onOpenChange: (open: boolean) => void; row: SurveyHeaderTableRow | null; isMutating: boolean; onConfirm: () => void }) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader><DialogTitle>Cancel Request</DialogTitle><DialogDescription>This will revert the pending changes back to the last approved state.</DialogDescription></DialogHeader>
				{row != null && <p className="text-sm px-1">Cancel the pending request for <span className="font-medium">{row.parentDescription}</span>?</p>}
				<DialogFooter>
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isMutating}>Keep</Button>
					<Button type="button" variant="destructive" onClick={onConfirm} disabled={isMutating}>Cancel Request</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ── DashboardManagementPagination (local) ──────────────────────────────────
export function SurveyHeaderPagination({ pageIndex, totalDocs, hasPreviousPage, hasNextPage, isLoading, isMutating, onPrevious, onNext }: { pageIndex: number; totalDocs: number; hasPreviousPage: boolean; hasNextPage: boolean; isLoading: boolean; isMutating: boolean; onPrevious: () => void; onNext: () => void }) {
	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<p className="text-muted-foreground text-sm">Showing page {pageIndex} ({totalDocs} header(s))</p>
			<div className="flex gap-2">
				<Button type="button" variant="outline" size="sm" onClick={onPrevious} disabled={pageIndex <= 1 || !hasPreviousPage || isLoading || isMutating}>Previous</Button>
				<Button type="button" variant="outline" size="sm" onClick={onNext} disabled={!hasNextPage || isLoading || isMutating}>Next</Button>
			</div>
		</div>
	);
}
