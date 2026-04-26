"use client";

import { useMemo, useState, useEffect, useCallback, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	XIcon,
	DiscIcon,
	PlusIcon,
	SaveIcon,
	FileTextIcon,
	CircleAlertIcon
} from "lucide-react";

import cn from "@/utils/cn";
import { Link } from "@/components/Link";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Badge } from "@/components/radix/Badge";
import { Button } from "@/components/radix/Button";
import { Card, CardTitle, CardHeader, CardContent } from "@/components/radix/Card";
import { Checkbox } from "@/components/radix/Checkbox";
import { Input } from "@/components/radix/Input";
import { Label } from "@/components/radix/Label";
import { Select, SelectItem, SelectValue, SelectContent, SelectTrigger } from "@/components/radix/Select";
import { Sheet, SheetTitle, SheetFooter, SheetHeader, SheetContent, SheetDescription } from "@/components/radix/Sheet";
import { Skeleton } from "@/components/radix/Skeleton";
import { Table, TableRow, TableBody, TableCell, TableHead, TableHeader } from "@/components/radix/Table";
import { Textarea } from "@/components/radix/Textarea";

import {
	DashboardManagementToolbar,
	DashboardManagementPageFrame,
	DashboardManagementPagination
} from "../layout.components";
import * as satisfactionActions from "./layout.actions";

export const PAGE_SIZE = 20;

export type ActionError = {
	title: string;
	message: string;
};

export const resolveActionError = (error: unknown, fallbackMessage: string): ActionError => {
	if(error instanceof Error) {
		return {
			title: error.name.length > 0 ? error.name : "Error",
			message: error.message.length > 0 ? error.message : fallbackMessage
		};
	}
	return {
		title: "Error",
		message: fallbackMessage
	};
};

export type CustomerSatisfactionSurveyRow = satisfactionActions.CustomerSatisfactionSurveyRow;
export type SatisfactionRespondType = satisfactionActions.SatisfactionRespondType;

function useDebouncedValue<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const timer = window.setTimeout(() => setDebounced(value), delayMs);
		return () => window.clearTimeout(timer);
	}, [value, delayMs]);
	return debounced;
}

export function formatRespondTypeLabel(value: string): string {
	const key = value.trim().toLowerCase();
	if(key == "free_text")
		return "FREE TEXT";
	if(key == "option")
		return "OPTION";
	return value.length > 0 ? value.toUpperCase() : "—";
}

function respondTypeBadgeClassName(value: string): string {
	const key = value.trim().toLowerCase();
	if(key == "option")
		return "border-violet-200 bg-violet-50 text-violet-800";
	if(key == "free_text")
		return "border-sky-200 bg-sky-50 text-sky-900";
	return "text-muted-foreground";
}

function approvalBadge(row: CustomerSatisfactionSurveyRow): { label: string, className: string } | null {
	if(row.approvalState == "pending")
		return { label: "PENDING", className: "border-amber-200 bg-amber-50 text-amber-900" };
	if(row.approvalState == "approved")
		return { label: "APPROVED", className: "border-emerald-200 bg-emerald-50 text-emerald-900" };
	if(row.approvalState == "rejected")
		return { label: "REJECTED", className: "border-rose-200 bg-rose-50 text-rose-900" };
	return null;
}

function formatTableDate(value: string | null): string {
	if(value == null)
		return "—";
	const date = new Date(value);
	if(Number.isNaN(date.getTime()))
		return value;
	return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const SEQUENCE_OPTIONS = Array.from({ length: 40 }, (_, index) => String(index + 1));

export type MakerFormState = {
	id: string | null;
	csatId: string;
	title: string;
	sequence: string;
	questionPrompt: string;
	internalDescription: string;
	respondType: SatisfactionRespondType | "";
};

export const defaultMakerFormState: MakerFormState = {
	id: null,
	csatId: "",
	title: "",
	sequence: "",
	questionPrompt: "",
	internalDescription: "",
	respondType: ""
};

export function useCustomerSatisfactionSurveysQuery({
	mode,
	keyword,
	pageIndex,
	includeSoftDeleted,
	queryEditorAction,
	queryApproverAction
}: {
	mode: "editor" | "approver";
	keyword: string;
	pageIndex: number;
	includeSoftDeleted: boolean;
	queryEditorAction: typeof satisfactionActions.queryCustomerSatisfactionSurveysEditorAction;
	queryApproverAction: typeof satisfactionActions.queryCustomerSatisfactionSurveysApproverAction;
}) {
	const debouncedKeyword = useDebouncedValue(keyword, 350);
	const queryFn = mode == "approver" ?
		() => queryApproverAction({
			keyword: debouncedKeyword,
			page: pageIndex,
			limit: PAGE_SIZE
		}) :
		() => queryEditorAction({
			keyword: debouncedKeyword,
			page: pageIndex,
			limit: PAGE_SIZE,
			includeSoftDeleted
		});

	const query = useQuery({
		queryKey: ["customer-satisfaction", mode, debouncedKeyword, pageIndex, includeSoftDeleted],
		queryFn
	});

	const queryErrorMessage = query.error instanceof Error ? query.error.message : query.error != null ? "Failed to load surveys." : null;

	return {
		pageIndex,
		queryResult: query.data ?? {
			docs: [],
			totalDocs: 0,
			page: pageIndex,
			hasNextPage: false,
			hasPreviousPage: false
		},
		isLoading: query.isLoading,
		queryErrorMessage
	};
}

export function CustomerSatisfactionModeToggle({ className }: { className?: string }) {
	const pathname = usePathname();
	const isMaker = pathname.includes("/editor");
	return (
		<div className={cn("inline-flex rounded-md border border-border bg-muted/40 p-0.5", className)}>
			<Button
				asChild
				size="sm"
				variant={isMaker ? "default" : "ghost"}
				className={cn("rounded-sm px-4", !isMaker && "text-muted-foreground")}
			>
				<Link href="/customer-satisfaction/editor">Pembuat (Maker)</Link>
			</Button>
			<Button
				asChild
				size="sm"
				variant={!isMaker ? "default" : "ghost"}
				className={cn("rounded-sm px-4", isMaker && "text-muted-foreground")}
			>
				<Link href="/customer-satisfaction/approver">Penyetuju (Checker)</Link>
			</Button>
		</div>
	);
}

export function CustomerSatisfactionSurveysTable({
	rows,
	isLoading,
	selectedId,
	onSelectRow,
	mode,
	showCheckColumn
}: {
	rows: CustomerSatisfactionSurveyRow[];
	isLoading: boolean;
	selectedId: string | null;
	onSelectRow: (row: CustomerSatisfactionSurveyRow) => void;
	mode: "editor" | "approver";
	showCheckColumn: boolean;
}) {
	if(isLoading) {
		return (
			<div className="space-y-2 py-4">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
			</div>
		);
	}

	if(rows.length == 0) {
		return (
			<p className="text-muted-foreground py-8 text-center text-sm">
				No surveys match the current filters.
			</p>
		);
	}

	return (
		<div className="overflow-x-auto rounded-md border">
			<Table>
				<TableHeader>
					<TableRow className="bg-muted/40 hover:bg-muted/40">
						{showCheckColumn ? <TableHead className="w-10" /> : null}
						<TableHead>CSAT ID</TableHead>
						<TableHead>Description</TableHead>
						<TableHead className="w-14 text-center">Seq</TableHead>
						{mode == "editor" ? <TableHead>Question</TableHead> : null}
						<TableHead>Type</TableHead>
						{mode == "editor" ? <TableHead>Updated</TableHead> : <TableHead>Time</TableHead>}
						<TableHead>{mode == "editor" ? "Updated by" : "Updated by"}</TableHead>
						{mode == "editor" ? (
							<>
								<TableHead>Approved</TableHead>
								<TableHead>Approved by</TableHead>
							</>
						) : (
							<TableHead>Status</TableHead>
						)}
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.map(row => {
						const selected = selectedId == row.id;
						const approval = approvalBadge(row);
						return (
							<TableRow
								key={row.id}
								data-state={selected ? "selected" : undefined}
								className={cn("cursor-pointer", selected && "bg-muted/60")}
								onClick={() => onSelectRow(row)}
							>
								{showCheckColumn ? (
									<TableCell onClick={event => event.stopPropagation()}>
										<Checkbox
											checked={selected}
											onCheckedChange={() => onSelectRow(row)}
											aria-label={`Select ${row.csatId}`}
										/>
									</TableCell>
								) : null}
								<TableCell className="font-mono text-xs font-medium">{row.csatId}</TableCell>
								<TableCell className="max-w-[200px] truncate font-medium">{row.title}</TableCell>
								<TableCell className="text-center text-sm">{row.sequence ?? "—"}</TableCell>
								{mode == "editor" ? (
									<TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
										{row.questionPrompt.length > 0 ? row.questionPrompt : "—"}
									</TableCell>
								) : null}
								<TableCell>
									{row.respondType.length > 0 ? (
										<Badge variant="outline" className={cn("font-medium", respondTypeBadgeClassName(row.respondType))}>
											{formatRespondTypeLabel(row.respondType)}
										</Badge>
									) : (
										<span className="text-muted-foreground text-sm">—</span>
									)}
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">{formatTableDate(row.updatedAt)}</TableCell>
								<TableCell className="text-sm">{row.updatedByLabel}</TableCell>
								{mode == "editor" ? (
									<>
										<TableCell className="whitespace-nowrap text-sm">{formatTableDate(row.reviewedAt)}</TableCell>
										<TableCell className="text-sm">{row.reviewedByLabel}</TableCell>
									</>
								) : (
									<TableCell>
										{row._status == "published" ? (
											<Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-900">
												ACTIVE
											</Badge>
										) : approval != null ? (
											<Badge variant="outline" className={approval.className}>
												{approval.label}
											</Badge>
										) : (
											<span className="text-muted-foreground">—</span>
										)}
									</TableCell>
								)}
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}

export function CustomerSatisfactionMakerForm({
	form,
	onChange,
	onPickRespondType
}: {
	form: MakerFormState;
	onChange: (patch: Partial<MakerFormState>) => void;
	onPickRespondType: (value: SatisfactionRespondType) => void;
}) {
	return (
		<div className="grid gap-4 lg:grid-cols-2">
			<Card className="shadow-sm">
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Define your question</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="csat-id">CSAT ID</Label>
						<Input
							id="csat-id"
							value={form.csatId}
							onChange={event => onChange({ csatId: event.target.value })}
							placeholder="Please input"
							maxLength={20}
						/>
						<p className="text-muted-foreground text-xs">Mandatory, varchar 20</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="csat-desc">Description</Label>
						<Input
							id="csat-desc"
							value={form.title}
							onChange={event => onChange({ title: event.target.value })}
							placeholder="Please input"
							maxLength={120}
						/>
						<p className="text-muted-foreground text-xs">Mandatory, varchar 120</p>
					</div>
					<div className="space-y-2">
						<Label>Sequence</Label>
						<Select value={form.sequence.length > 0 ? form.sequence : undefined} onValueChange={value => onChange({ sequence: value })}>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Please select one" />
							</SelectTrigger>
							<SelectContent>
								{SEQUENCE_OPTIONS.map(option => (
									<SelectItem key={option} value={option}>
										{option}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="text-muted-foreground text-xs">Mandatory, numeric</p>
					</div>
				</CardContent>
			</Card>
			<Card className="shadow-sm">
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Define the respond</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label>Type of respond</Label>
						<Select
							value={form.respondType.length > 0 ? form.respondType : undefined}
							onValueChange={value => onChange({ respondType: value as SatisfactionRespondType })}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Please select type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="free_text">Free text</SelectItem>
								<SelectItem value="option">Option</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						<button
							type="button"
							onClick={() => onPickRespondType("free_text")}
							className={cn(
								"flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition hover:bg-muted/40",
								form.respondType == "free_text" ? "border-primary ring-2 ring-primary/30" : "border-border"
							)}
						>
							<FileTextIcon className="size-5 text-sky-600" />
							<span className="font-medium">Free text</span>
							<span className="text-muted-foreground text-xs">Open-ended answer from the respondent.</span>
						</button>
						<button
							type="button"
							onClick={() => onPickRespondType("option")}
							className={cn(
								"flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition hover:bg-muted/40",
								form.respondType == "option" ? "border-primary ring-2 ring-primary/30" : "border-border"
							)}
						>
							<DiscIcon className="size-5 text-violet-600" />
							<span className="font-medium">Option</span>
							<span className="text-muted-foreground text-xs">Single choice from predefined answers.</span>
						</button>
					</div>
					<div className="space-y-2">
						<Label htmlFor="question-prompt">Question shown to customer</Label>
						<Textarea
							id="question-prompt"
							value={form.questionPrompt}
							onChange={event => onChange({ questionPrompt: event.target.value })}
							placeholder="How satisfied were you with our service?"
							rows={3}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="internal-desc">Internal description</Label>
						<Textarea
							id="internal-desc"
							value={form.internalDescription}
							onChange={event => onChange({ internalDescription: event.target.value })}
							placeholder="Notes for reviewers (optional)"
							rows={2}
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export function CustomerSatisfactionReviewSheet({
	open,
	onOpenChange,
	row,
	reviewReason,
	onReviewReasonChange,
	isMutating,
	onApprove,
	onReject,
	onCancel
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	row: CustomerSatisfactionSurveyRow | null;
	reviewReason: string;
	onReviewReasonChange: (value: string) => void;
	isMutating: boolean;
	onApprove: () => void;
	onReject: () => void;
	onCancel: () => void;
}) {
	const previewQuestion = (() => {
		if(row == null)
			return "—";
		if(row.questionPrompt.trim().length > 0)
			return row.questionPrompt;
		if(row.title.trim().length > 0)
			return row.title;
		return "—";
	})();

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
				<SheetHeader>
					<SheetTitle>Question review</SheetTitle>
					<SheetDescription>
						{row != null ? `Inspecting draft: ${row.csatId}` : "Select a row to inspect a draft."}
					</SheetDescription>
				</SheetHeader>
				{row != null ? (
					<div className="flex flex-1 flex-col gap-4 overflow-y-auto px-1">
						<div className="grid grid-cols-2 gap-2">
							<Card>
								<CardContent className="space-y-1 p-3 text-xs">
									<p className="text-muted-foreground">CSAT ID</p>
									<p className="font-mono font-medium">{row.csatId}</p>
								</CardContent>
							</Card>
							<Card>
								<CardContent className="space-y-1 p-3 text-xs">
									<p className="text-muted-foreground">Sequence</p>
									<p className="font-medium">{row.sequence ?? "—"}</p>
								</CardContent>
							</Card>
						</div>
						{row.internalDescription.trim().length > 0 ? (
							<Card className="border-dashed">
								<CardContent className="p-3 text-sm text-muted-foreground leading-relaxed">
									{row.internalDescription}
								</CardContent>
							</Card>
						) : null}
						<Card className="border-dashed">
							<CardContent className="p-3 text-sm font-medium">
								{row.title}
							</CardContent>
						</Card>
						<div className="rounded-lg bg-sidebar p-4 text-sidebar-foreground shadow-inner">
							<p className="text-sm font-medium leading-relaxed">{previewQuestion}</p>
							{row.respondType == "option" ? (
								<div className="mt-4 flex gap-1">
									{[1, 2, 3, 4, 5].map(n => (
										<span
											key={n}
											className={cn(
												"flex h-9 flex-1 items-center justify-center rounded-md border text-sm font-semibold",
												n == 5 ? "border-sky-300 bg-sky-500 text-white" : "border-sidebar-border/60 bg-sidebar-accent/20"
											)}
										>
											{n}
										</span>
									))}
								</div>
							) : null}
						</div>
						<div className="space-y-2">
							<Label htmlFor="review-reason">Review comment</Label>
							<Textarea
								id="review-reason"
								value={reviewReason}
								onChange={event => onReviewReasonChange(event.target.value)}
								placeholder="Optional context for approve / reject"
								rows={3}
							/>
						</div>
					</div>
				) : null}
				<SheetFooter className="gap-2 sm:flex-col">
					<Button type="button" className="w-full" disabled={row == null || isMutating} onClick={onApprove}>
						Approve
					</Button>
					<Button type="button" variant="destructive" className="w-full" disabled={row == null || isMutating} onClick={onReject}>
						Reject
					</Button>
					<Button type="button" variant="secondary" className="w-full bg-sidebar text-sidebar-foreground hover:bg-sidebar/90" disabled={isMutating} onClick={onCancel}>
						Cancel
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

export function CustomerSatisfactionManagementShell({
	title,
	description,
	mode,
	childrenToolbarSlot,
	tableSection,
	formSection,
	footerActions,
	reviewSheet
}: {
	title: string;
	description: string;
	mode: "editor" | "approver";
	childrenToolbarSlot?: ReactNode;
	tableSection: ReactNode;
	formSection?: ReactNode;
	footerActions?: ReactNode;
	reviewSheet?: ReactNode;
}) {
	return (
		<DashboardManagementPageFrame title={title} description={description}>
			<div className="flex flex-col gap-4">
				<div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
					<p className="text-muted-foreground text-sm">
						CSAT
						{" "}
						<span className="text-foreground">›</span>
						{" "}
						{mode == "editor" ? "Maker" : "Checker"}
					</p>
					<CustomerSatisfactionModeToggle />
				</div>
				{childrenToolbarSlot}
				{tableSection}
				{formSection}
				{footerActions}
			</div>
			{reviewSheet}
		</DashboardManagementPageFrame>
	);
}

export function CustomerSatisfactionEditorView() {
	const queryClient = useQueryClient();
	const [keyword, setKeyword] = useState("");
	const [pageIndex, setPageIndex] = useState(1);
	const [showSoftDeleted, setShowSoftDeleted] = useState(false);
	const [form, setForm] = useState<MakerFormState>(defaultMakerFormState);
	const [formError, setFormError] = useState<ActionError | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [filterOpen, setFilterOpen] = useState(false);

	const { queryResult, isLoading, queryErrorMessage } = useCustomerSatisfactionSurveysQuery({
		mode: "editor",
		keyword,
		pageIndex,
		includeSoftDeleted: showSoftDeleted,
		queryEditorAction: satisfactionActions.queryCustomerSatisfactionSurveysEditorAction,
		queryApproverAction: satisfactionActions.queryCustomerSatisfactionSurveysApproverAction
	});

	const patchForm = useCallback((patch: Partial<MakerFormState>) => {
		setForm(previous => ({ ...previous, ...patch }));
	}, []);

	const onSelectRow = useCallback((row: CustomerSatisfactionSurveyRow) => {
		const respondTypeRaw = row.respondType as SatisfactionRespondType | "";
		setForm({
			id: row.id,
			csatId: row.csatId,
			title: row.title,
			sequence: row.sequence != null ? String(row.sequence) : "",
			questionPrompt: row.questionPrompt,
			internalDescription: row.internalDescription,
			respondType: respondTypeRaw.length > 0 ? respondTypeRaw : ""
		});
		setFormError(null);
	}, []);

	const listError = queryErrorMessage != null ? { title: "Error", message: queryErrorMessage } : null;

	const handleSave = useCallback(async () => {
		setIsSaving(true);
		setFormError(null);
		try {
			const result = await satisfactionActions.upsertCustomerSatisfactionSurveyDraftAction({
				id: form.id,
				csatId: form.csatId,
				title: form.title,
				sequence: form.sequence,
				questionPrompt: form.questionPrompt,
				internalDescription: form.internalDescription,
				respondType: form.respondType
			});
			await queryClient.invalidateQueries({ queryKey: ["customer-satisfaction"] });
			setForm(previous => ({ ...previous, id: result.id }));
		} catch(error) {
			setFormError(resolveActionError(error, "Could not save survey."));
		} finally {
			setIsSaving(false);
		}
	}, [form, queryClient]);

	const handleAdd = useCallback(() => {
		setForm(defaultMakerFormState);
		setFormError(null);
	}, []);

	const toolbarRight = useMemo(() => (
		<div className="flex flex-wrap items-center gap-2">
			<label className="text-muted-foreground flex items-center gap-2 text-sm">
				<Checkbox checked={showSoftDeleted} onCheckedChange={value => setShowSoftDeleted(value == true)} />
				Show soft-deleted
			</label>
		</div>
	), [showSoftDeleted]);

	return (
		<CustomerSatisfactionManagementShell
			title="CSAT Question Maker"
			description="Create and update CSAT question drafts with mandatory validation."
			mode="editor"
			childrenToolbarSlot={(
				<>
					<DashboardManagementToolbar
						keyword={keyword}
						onKeywordChange={setKeyword}
						searchPlaceholder="Search by description"
						filterCount={filterOpen ? 1 : 0}
						onToggleFilter={() => setFilterOpen(open => !open)}
						onToggleColumns={() => {}}
						isLoading={isLoading}
						isMutating={isSaving}
						rightSlot={toolbarRight}
					/>
					{filterOpen ? (
						<Card>
							<CardContent className="text-muted-foreground py-3 text-sm">
								Advanced filters will be wired to Payload query operators in a later iteration. Use search to narrow by description.
							</CardContent>
						</Card>
					) : null}
				</>
			)}
			tableSection={(
				<>
					{listError != null ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>{listError.title}</AlertTitle>
							<AlertDescription>{listError.message}</AlertDescription>
						</Alert>
					) : null}
					{formError != null ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>{formError.title}</AlertTitle>
							<AlertDescription>{formError.message}</AlertDescription>
						</Alert>
					) : null}
					<CustomerSatisfactionSurveysTable
						rows={queryResult.docs}
						isLoading={isLoading}
						selectedId={form.id}
						onSelectRow={onSelectRow}
						mode="editor"
						showCheckColumn={false}
					/>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-muted-foreground text-sm">
							Showing
							{" "}
							{queryResult.docs.length}
							{" "}
							of
							{" "}
							{queryResult.totalDocs}
							{" "}
							records
						</p>
						<div className="flex flex-wrap gap-2">
							<Button type="button" variant="outline" size="sm" onClick={() => setPageIndex(1)}>
								Cancel
							</Button>
							<Button type="button" variant="outline" size="sm" disabled>
								Preview
							</Button>
							<Button type="button" size="sm" onClick={handleAdd}>
								<PlusIcon />
								Add
							</Button>
						</div>
					</div>
					<DashboardManagementPagination
						pageIndex={queryResult.page}
						totalRequests={queryResult.totalDocs}
						hasPreviousPage={queryResult.hasPreviousPage}
						hasNextPage={queryResult.hasNextPage}
						isLoading={isLoading}
						isMutating={isSaving}
						onPrevious={() => setPageIndex(previous => Math.max(1, previous - 1))}
						onNext={() => setPageIndex(previous => previous + 1)}
					/>
				</>
			)}
			formSection={(
				<CustomerSatisfactionMakerForm
					form={form}
					onChange={patchForm}
					onPickRespondType={value => patchForm({ respondType: value })}
				/>
			)}
			footerActions={(
				<div className="flex flex-col gap-2 border-t pt-4 sm:flex-row">
					<Button type="button" className="sm:flex-1" disabled={isSaving} onClick={handleSave}>
						<SaveIcon />
						Save changes
					</Button>
					<Button type="button" variant="destructive" className="sm:flex-1" disabled={isSaving} onClick={() => { setForm(defaultMakerFormState); setFormError(null); }}>
						<XIcon />
						Cancel transaction
					</Button>
				</div>
			)}
		/>
	);
}

export function CustomerSatisfactionApproverView() {
	const queryClient = useQueryClient();
	const [keyword, setKeyword] = useState("");
	const [pageIndex, setPageIndex] = useState(1);
	const [selectedRow, setSelectedRow] = useState<CustomerSatisfactionSurveyRow | null>(null);
	const [sheetOpen, setSheetOpen] = useState(false);
	const [reviewReason, setReviewReason] = useState("");
	const [pageError, setPageError] = useState<ActionError | null>(null);
	const [isMutating, setIsMutating] = useState(false);
	const [filterOpen, setFilterOpen] = useState(false);

	const { queryResult, isLoading, queryErrorMessage } = useCustomerSatisfactionSurveysQuery({
		mode: "approver",
		keyword,
		pageIndex,
		includeSoftDeleted: false,
		queryEditorAction: satisfactionActions.queryCustomerSatisfactionSurveysEditorAction,
		queryApproverAction: satisfactionActions.queryCustomerSatisfactionSurveysApproverAction
	});

	const onSelectRow = useCallback((row: CustomerSatisfactionSurveyRow) => {
		setSelectedRow(row);
		setSheetOpen(true);
		setReviewReason("");
		setPageError(null);
	}, []);

	const displayError = pageError ?? (queryErrorMessage != null ? { title: "Error", message: queryErrorMessage } : null);

	const runReview = useCallback(async (decision: "approve" | "reject") => {
		if(selectedRow == null)
			return;
		setIsMutating(true);
		setPageError(null);
		try {
			await satisfactionActions.reviewCustomerSatisfactionSurveyAction({
				surveyId: selectedRow.id,
				decision,
				reason: reviewReason
			});
			await queryClient.invalidateQueries({ queryKey: ["customer-satisfaction"] });
			setSheetOpen(false);
			setSelectedRow(null);
		} catch(error) {
			setPageError(resolveActionError(error, "Review failed."));
		} finally {
			setIsMutating(false);
		}
	}, [queryClient, reviewReason, selectedRow]);

	return (
		<CustomerSatisfactionManagementShell
			title="CSAT Question Checker"
			description="Approve or reject CSAT question drafts before publication."
			mode="approver"
			childrenToolbarSlot={(
				<>
					<DashboardManagementToolbar
						keyword={keyword}
						onKeywordChange={setKeyword}
						searchPlaceholder="Search by description"
						filterCount={filterOpen ? 1 : 0}
						onToggleFilter={() => setFilterOpen(open => !open)}
						onToggleColumns={() => {}}
						isLoading={isLoading}
						isMutating={isMutating}
					/>
					{filterOpen ? (
						<Card>
							<CardContent className="text-muted-foreground py-3 text-sm">
								Filter presets can mirror credit-assignment filters in a follow-up. Search applies to the description field.
							</CardContent>
						</Card>
					) : null}
				</>
			)}
			tableSection={(
				<>
					{displayError != null ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>{displayError.title}</AlertTitle>
							<AlertDescription>{displayError.message}</AlertDescription>
						</Alert>
					) : null}
					<CustomerSatisfactionSurveysTable
						rows={queryResult.docs}
						isLoading={isLoading}
						selectedId={selectedRow?.id ?? null}
						onSelectRow={onSelectRow}
						mode="approver"
						showCheckColumn
					/>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-muted-foreground text-sm">
							Showing
							{" "}
							{queryResult.docs.length}
							{" "}
							of
							{" "}
							{queryResult.totalDocs}
							{" "}
							records
						</p>
						<div className="flex flex-wrap gap-2">
							<Button type="button" variant="outline" size="sm" onClick={() => setSheetOpen(false)}>
								Cancel
							</Button>
							<Button type="button" variant="outline" size="sm" disabled>
								Preview
							</Button>
							<Button type="button" size="sm" disabled>
								<PlusIcon />
								Add
							</Button>
						</div>
					</div>
					<DashboardManagementPagination
						pageIndex={queryResult.page}
						totalRequests={queryResult.totalDocs}
						hasPreviousPage={queryResult.hasPreviousPage}
						hasNextPage={queryResult.hasNextPage}
						isLoading={isLoading}
						isMutating={isMutating}
						onPrevious={() => setPageIndex(previous => Math.max(1, previous - 1))}
						onNext={() => setPageIndex(previous => previous + 1)}
					/>
				</>
			)}
			reviewSheet={(
				<CustomerSatisfactionReviewSheet
					open={sheetOpen}
					onOpenChange={setSheetOpen}
					row={selectedRow}
					reviewReason={reviewReason}
					onReviewReasonChange={setReviewReason}
					isMutating={isMutating}
					onApprove={() => void runReview("approve")}
					onReject={() => void runReview("reject")}
					onCancel={() => setSheetOpen(false)}
				/>
			)}
		/>
	);
}
