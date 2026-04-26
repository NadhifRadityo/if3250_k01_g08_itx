"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon, PlusIcon, XIcon } from "lucide-react";

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

import * as sqdActions from "./layout.actions";
import type { SurveyDetailTableRow, SurveyDetailFormState, SurveyDetailRelationValues, QuerySurveyDetailsOutput } from "./layout.actions";

export type { SurveyDetailTableRow, SurveyDetailFormState };

export type ActionError = { title: string; message: string };
export function resolveActionError(error: unknown, fallback: string): ActionError {
	if(error instanceof Error) return { title: "Error", message: error.message || fallback };
	return { title: "Error", message: fallback };
}

const PAGE_SIZE = 10;

function getReviewStatus(row: SurveyDetailTableRow): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
	if(row.reviewedAt == null) return { label: "Pending", variant: "secondary" };
	if(row.reviewApproved == true) return { label: "Approved", variant: "default" };
	return { label: "Rejected", variant: "destructive" };
}

function getRequestType(row: SurveyDetailTableRow): string {
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

const emptyQueryResult: QuerySurveyDetailsOutput = { docs: [], totalDocs: 0, page: 1, hasNextPage: false, hasPreviousPage: false };

// ── useSurveyDetailQuery ───────────────────────────────────────────────────
export function useSurveyDetailQuery({ queryScope, queryAction, keyword, pageIndex }: {
	queryScope: string;
	queryAction: (input: { keyword: string; page: number; limit: number }) => Promise<QuerySurveyDetailsOutput>;
	keyword: string;
	pageIndex: number;
}) {
	const [debouncedKeyword, setDebouncedKeyword] = useState(keyword);
	useEffect(() => { const t = setTimeout(() => setDebouncedKeyword(keyword), 400); return () => clearTimeout(t); }, [keyword]);
	const queryResult_raw = useQuery({ queryKey: ["survey-detail-management", queryScope, debouncedKeyword, pageIndex], queryFn: () => queryAction({ keyword: debouncedKeyword, page: pageIndex, limit: PAGE_SIZE }), staleTime: 15000, refetchOnWindowFocus: true });
	return { queryResult: queryResult_raw.data ?? emptyQueryResult, isLoading: queryResult_raw.isPending, queryErrorMessage: queryResult_raw.isError ? "Failed to load data." : null };
}

// ── HeaderSearchInput ──────────────────────────────────────────────────────
export function HeaderSearchInput({ value, onSelect }: { value: string | null; onSelect: (id: string | null, title: string) => void }) {
	const [keyword, setKeyword] = useState("");
	const [options, setOptions] = useState<Array<{ id: string; title: string }>>([]);
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if(keyword.trim().length == 0 && value == null) { setOptions([]); return; }
		setLoading(true);
		sqdActions.searchSurveyDetailHeaderOptionsAction(keyword, value != null ? [value] : [])
			.then(opts => setOptions(opts))
			.catch(() => setOptions([]))
			.finally(() => setLoading(false));
	}, [keyword, value]);

	const selectedLabel = value != null ? (options.find(o => o.id == value)?.title ?? value) : "";

	return (
		<div className="relative" ref={ref}>
			<Input value={open ? keyword : selectedLabel} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)} onChange={e => { setKeyword(e.target.value); setOpen(true); }} placeholder="Search and select question header…" />
			{open && (
				<div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
					{loading && <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>}
					{!loading && options.length == 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No headers found.</div>}
					{options.map(opt => (
						<button key={opt.id} type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-accent" onMouseDown={() => { onSelect(opt.id, opt.title); setOpen(false); setKeyword(""); }}>
							{opt.title}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

// ── OptionListInput ────────────────────────────────────────────────────────
export function OptionListInput({ options, onChange }: { options: string[]; onChange: (opts: string[]) => void }) {
	const handleChange = (index: number, value: string) => { const next = [...options]; next[index] = value; onChange(next); };
	const handleAdd = () => { if(options.length < 10) onChange([...options, ""]); };
	const handleRemove = (index: number) => onChange(options.filter((_, i) => i != index));
	return (
		<div className="space-y-2">
			{options.map((opt, i) => (
				<div key={i} className="flex gap-2">
					<Input value={opt} onChange={e => handleChange(i, e.target.value)} placeholder={`Option ${i + 1}`} />
					<Button type="button" variant="ghost" size="icon" onClick={() => handleRemove(i)}><XIcon className="h-4 w-4" /></Button>
				</div>
			))}
			{options.length < 10 && <Button type="button" variant="outline" size="sm" onClick={handleAdd}><PlusIcon className="h-4 w-4" />Add Option</Button>}
		</div>
	);
}

// ── SurveyDetailTable ──────────────────────────────────────────────────────
export function SurveyDetailTable({ queryResult, isLoading, isMutating, onOpenDetails, renderActions }: {
	queryResult: QuerySurveyDetailsOutput;
	isLoading: boolean;
	isMutating: boolean;
	onOpenDetails: (row: SurveyDetailTableRow) => void;
	renderActions: (row: SurveyDetailTableRow) => ReactNode;
}) {
	return (
		<div className="overflow-x-auto rounded-xl border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Header</TableHead>
						<TableHead>Question ID</TableHead>
						<TableHead>Description</TableHead>
						<TableHead>Type of Answer</TableHead>
						<TableHead>Value</TableHead>
						<TableHead>Updated Time</TableHead>
						<TableHead>Updated By</TableHead>
						<TableHead>Approved Time</TableHead>
						<TableHead>Approved By</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className="w-40">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{isLoading && <TableRow><TableCell colSpan={11} className="text-muted-foreground py-8 text-center">Loading details…</TableCell></TableRow>}
					{!isLoading && queryResult.docs.length == 0 && <TableRow><TableCell colSpan={11} className="text-muted-foreground py-8 text-center">No question details found.</TableCell></TableRow>}
					{queryResult.docs.map(row => <SurveyDetailTableRowComp key={row.id} row={row} isMutating={isMutating} onOpenDetails={onOpenDetails} renderActions={renderActions} />)}
				</TableBody>
			</Table>
		</div>
	);
}

function SurveyDetailTableRowComp({ row, isMutating, onOpenDetails, renderActions }: { row: SurveyDetailTableRow; isMutating: boolean; onOpenDetails: (row: SurveyDetailTableRow) => void; renderActions: (row: SurveyDetailTableRow) => ReactNode }) {
	const [relValues, setRelValues] = useState<SurveyDetailRelationValues>({});
	useEffect(() => {
		sqdActions.resolveSurveyDetailRelationColumnsAction([{ id: row.id, headerId: row.headerId, createdById: row.createdById, updatedById: row.updatedById, deletedById: row.deletedById, reviewedById: row.reviewedById }])
			.then(results => { if(results[0]) setRelValues(results[0].values); })
			.catch(() => {});
	}, [row]);
	const status = getReviewStatus(row);
	const valueDisplay = row.typeOfAnswer == "freetext" ? row.valueFreeText : row.valueOptions.join(", ");
	return (
		<TableRow>
			<TableCell className="text-sm">{row.headerTitle}</TableCell>
			<TableCell className="font-mono text-sm">{row.questionId}</TableCell>
			<TableCell>
				<Button type="button" variant="link" onClick={() => onOpenDetails(row)} className="h-auto p-0 text-left whitespace-normal">{row.description || "-"}</Button>
			</TableCell>
			<TableCell><Badge variant="outline">{row.typeOfAnswer == "freetext" ? "Free Text" : "Option"}</Badge></TableCell>
			<TableCell className="max-w-40 truncate text-sm" title={valueDisplay}>{valueDisplay || "-"}</TableCell>
			<TableCell className="text-sm">{formatDateTime(row.updatedAt)}</TableCell>
			<TableCell>{relValues.updatedBy ?? <span className="inline-block h-4 w-20 animate-pulse rounded bg-muted" />}</TableCell>
			<TableCell className="text-sm">{formatDateTime(row.reviewedAt)}</TableCell>
			<TableCell>{relValues.reviewedBy ?? <span className="inline-block h-4 w-20 animate-pulse rounded bg-muted" />}</TableCell>
			<TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
			<TableCell><div className="flex flex-wrap gap-2">{renderActions(row)}</div></TableCell>
		</TableRow>
	);
}

// ── SurveyDetailFormDrawer ─────────────────────────────────────────────────
export function SurveyDetailFormDrawer({ open, onOpenChange, formState, formError, isMutating, onHeaderSelect, onQuestionIdChange, onDescriptionChange, onTypeOfAnswerChange, onValueFreeTextChange, onValueOptionsChange, onSubmit }: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	formState: SurveyDetailFormState;
	formError: ActionError | null;
	isMutating: boolean;
	onHeaderSelect: (id: string | null, title: string) => void;
	onQuestionIdChange: (v: string) => void;
	onDescriptionChange: (v: string) => void;
	onTypeOfAnswerChange: (v: "freetext" | "option") => void;
	onValueFreeTextChange: (v: string) => void;
	onValueOptionsChange: (opts: string[]) => void;
	onSubmit: () => void;
}) {
	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-lg">
				<DrawerHeader>
					<DrawerTitle>{formState.detailId == null ? "Add Survey Question Detail" : "Edit Survey Question Detail"}</DrawerTitle>
					<DrawerDescription>Changes create pending requests that require checker review.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 overflow-y-auto px-4">
					<div className="grid gap-4 pb-4">
						<div className="space-y-2">
							<label className="text-sm font-medium">Question Header *</label>
							<HeaderSearchInput value={formState.headerId} onSelect={onHeaderSelect} />
							<p className="text-muted-foreground text-xs">Mandatory, relation to surveys</p>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Question ID *</label>
							<Input value={formState.questionId} onChange={e => onQuestionIdChange(e.target.value)} placeholder="Enter question ID" />
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Description *</label>
							<Input value={formState.description} onChange={e => onDescriptionChange(e.target.value)} placeholder="Enter question description" />
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Type of Answer *</label>
							<Select value={formState.typeOfAnswer} onValueChange={v => onTypeOfAnswerChange(v as "freetext" | "option")}>
								<SelectTrigger><SelectValue /></SelectTrigger>
								<SelectContent>
									<SelectItem value="freetext">Free Text</SelectItem>
									<SelectItem value="option">Option</SelectItem>
								</SelectContent>
							</Select>
						</div>
						{formState.typeOfAnswer == "freetext" && (
							<div className="space-y-2">
								<label className="text-sm font-medium">Value (Free Text)</label>
								<Input value={formState.valueFreeText} onChange={e => onValueFreeTextChange(e.target.value)} placeholder="Default free text value (optional)" />
							</div>
						)}
						{formState.typeOfAnswer == "option" && (
							<div className="space-y-2">
								<label className="text-sm font-medium">Value Options (max 10)</label>
								<OptionListInput options={formState.valueOptions} onChange={onValueOptionsChange} />
							</div>
						)}
						{formError != null && <Alert variant="destructive"><CircleAlertIcon /><AlertTitle>{formError.title}</AlertTitle><AlertDescription>{formError.message}</AlertDescription></Alert>}
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

// ── SurveyDetailDetailsDrawer ──────────────────────────────────────────────
export function SurveyDetailDetailsDrawer({ open, onOpenChange, row, renderActions }: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	row: SurveyDetailTableRow | null;
	renderActions: (row: SurveyDetailTableRow) => ReactNode;
}) {
	const detailsQuery = useQuery({ queryKey: ["survey-detail-management", "details", row?.id ?? null], enabled: open && row != null, queryFn: () => sqdActions.getSurveyDetailDetailsAction(row!.id), refetchInterval: 10000 });
	const details = detailsQuery.data;
	const actionRow = details?.row ?? row;
	const renderField = (label: string, value: ReactNode) => (
		<div className="space-y-1 rounded-lg border p-3"><p className="text-muted-foreground text-xs font-medium">{label}</p><div className="text-sm wrap-break-word">{value}</div></div>
	);
	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-lg">
				<DrawerHeader><DrawerTitle>Survey Question Detail</DrawerTitle><DrawerDescription>Review all fields for this question detail request.</DrawerDescription></DrawerHeader>
				<div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
					{row == null ? <p className="text-muted-foreground text-sm">No entry selected.</p> :
					detailsQuery.isPending ? <><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></> :
					detailsQuery.isError || details == null ? <Alert variant="destructive"><CircleAlertIcon /><AlertTitle>Error</AlertTitle><AlertDescription>Unable to load details.</AlertDescription></Alert> : (
						<>
							{renderField("Question Header", details.relationValues.questionHeader ?? details.row.headerTitle)}
							{renderField("Question ID", <span className="font-mono">{details.row.questionId}</span>)}
							{renderField("Description", details.row.description)}
							{renderField("Type of Answer", <Badge variant="outline">{details.row.typeOfAnswer == "freetext" ? "Free Text" : "Option"}</Badge>)}
							{details.row.typeOfAnswer == "freetext" && renderField("Value (Free Text)", details.row.valueFreeText || "-")}
							{details.row.typeOfAnswer == "option" && renderField("Value Options", details.row.valueOptions.length > 0 ? <ul className="list-decimal list-inside space-y-1">{details.row.valueOptions.map((o, i) => <li key={i}>{o}</li>)}</ul> : "-")}
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

// ── SurveyDetailReviewDrawer ───────────────────────────────────────────────
export function SurveyDetailReviewDrawer({ open, onOpenChange, row, reviewReason, onReviewReasonChange, onApprove, onReject, isMutating, reviewError }: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	row: SurveyDetailTableRow | null;
	reviewReason: string;
	onReviewReasonChange: (v: string) => void;
	onApprove: () => void;
	onReject: () => void;
	isMutating: boolean;
	reviewError: ActionError | null;
}) {
	const diffQuery = useQuery({ queryKey: ["survey-detail-management", "review-diff", row?.id ?? null], enabled: open && row != null, queryFn: () => sqdActions.getSurveyDetailReviewDiffAction(row!.id), refetchInterval: 10000 });
	const diff = diffQuery.data;
	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-lg">
				<DrawerHeader><DrawerTitle>Review Detail Request</DrawerTitle><DrawerDescription>Compare changes before approving or rejecting.</DrawerDescription></DrawerHeader>
				<div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
					{diffQuery.isPending ? <><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></> :
					diff == null ? <p className="text-muted-foreground text-sm">No diff available.</p> : (
						<>
							<div className="bg-muted/30 rounded-lg border p-3 text-sm"><p><span className="font-medium">Request Type:</span> {diff.requestType}</p><p className="text-muted-foreground">{diff.changedCount} changed field(s)</p></div>
							{diff.items.map(item => (
								<div key={item.field} className="space-y-2 rounded-lg border p-3">
									<div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{item.label}</p><Badge variant={item.changed ? "default" : "secondary"}>{item.changed ? "Changed" : "Unchanged"}</Badge></div>
									<div className="grid gap-2 sm:grid-cols-2">
										<div className="space-y-1"><p className="text-muted-foreground text-xs font-medium">Last Approved</p><div className="bg-muted/50 min-h-9 rounded border px-2 py-1.5 text-sm">{item.previousValue}</div></div>
										<div className="space-y-1"><p className="text-muted-foreground text-xs font-medium">Requested</p><div className="bg-muted/50 min-h-9 rounded border px-2 py-1.5 text-sm">{item.requestedValue}</div></div>
									</div>
								</div>
							))}
						</>
					)}
					{reviewError != null && <Alert variant="destructive"><CircleAlertIcon /><AlertTitle>{reviewError.title}</AlertTitle><AlertDescription>{reviewError.message}</AlertDescription></Alert>}
					<div className="space-y-2"><label className="text-sm font-medium">Review Reason (optional)</label><Textarea value={reviewReason} onChange={e => onReviewReasonChange(e.target.value)} placeholder="Provide a reason" /></div>
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

// ── Dialogs ────────────────────────────────────────────────────────────────
export function SurveyDetailDeleteDialog({ open, onOpenChange, row, isMutating, onConfirm }: { open: boolean; onOpenChange: (open: boolean) => void; row: SurveyDetailTableRow | null; isMutating: boolean; onConfirm: () => void }) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent><DialogHeader><DialogTitle>Delete Question</DialogTitle><DialogDescription>This marks the question for deletion and submits for checker review.</DialogDescription></DialogHeader>
			{row != null && <p className="text-sm px-1">Delete question <span className="font-medium">{row.questionId}</span> — {row.description}?</p>}
			<DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isMutating}>Cancel</Button><Button type="button" variant="destructive" onClick={onConfirm} disabled={isMutating}>Delete</Button></DialogFooter></DialogContent>
		</Dialog>
	);
}

export function SurveyDetailCancelDialog({ open, onOpenChange, row, isMutating, onConfirm }: { open: boolean; onOpenChange: (open: boolean) => void; row: SurveyDetailTableRow | null; isMutating: boolean; onConfirm: () => void }) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent><DialogHeader><DialogTitle>Cancel Request</DialogTitle><DialogDescription>Reverts changes back to last approved state.</DialogDescription></DialogHeader>
			{row != null && <p className="text-sm px-1">Cancel pending request for <span className="font-medium">{row.questionId}</span>?</p>}
			<DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isMutating}>Keep</Button><Button type="button" variant="destructive" onClick={onConfirm} disabled={isMutating}>Cancel Request</Button></DialogFooter></DialogContent>
		</Dialog>
	);
}

// ── Pagination ─────────────────────────────────────────────────────────────
export function SurveyDetailPagination({ pageIndex, totalDocs, hasPreviousPage, hasNextPage, isLoading, isMutating, onPrevious, onNext }: { pageIndex: number; totalDocs: number; hasPreviousPage: boolean; hasNextPage: boolean; isLoading: boolean; isMutating: boolean; onPrevious: () => void; onNext: () => void }) {
	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<p className="text-muted-foreground text-sm">Showing page {pageIndex} ({totalDocs} question(s))</p>
			<div className="flex gap-2">
				<Button type="button" variant="outline" size="sm" onClick={onPrevious} disabled={pageIndex <= 1 || !hasPreviousPage || isLoading || isMutating}>Previous</Button>
				<Button type="button" variant="outline" size="sm" onClick={onNext} disabled={!hasNextPage || isLoading || isMutating}>Next</Button>
			</div>
		</div>
	);
}
