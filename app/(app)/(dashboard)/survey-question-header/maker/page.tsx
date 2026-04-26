"use client";

import { useState, useCallback, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PlusIcon, PencilIcon, Trash2Icon, XCircleIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/radix/Button";
import { Input } from "@/components/radix/Input";
import { DashboardManagementPageFrame } from "@/app/(app)/(dashboard)/layout.components";

import * as sqhActions from "../layout.actions";
import type { SurveyHeaderTableRow, SurveyHeaderFormState } from "../layout.components";
import {
	useSurveyHeaderQuery,
	SurveyHeaderTable,
	SurveyHeaderFormDrawer,
	SurveyHeaderDetailsDrawer,
	SurveyHeaderDeleteDialog,
	SurveyHeaderCancelDialog,
	SurveyHeaderPagination,
	resolveActionError,
	type ActionError
} from "../layout.components";

const EMPTY_FORM: SurveyHeaderFormState = { headerId: null, parentDescription: "", product: "", isActive: "yes" };

export default function SurveyQuestionHeaderMakerPage() {
	const qc = useQueryClient();

	// ── search / pagination ──────────────────────────────────────────────
	const [keyword, setKeyword] = useState("");
	const [pageIndex, setPageIndex] = useState(1);

	const { queryResult, isLoading, queryErrorMessage } = useSurveyHeaderQuery({
		queryScope: "maker",
		queryAction: (input) => sqhActions.querySurveyHeadersMakerAction(input),
		keyword,
		pageIndex
	});

	// ── form drawer ──────────────────────────────────────────────────────
	const [formOpen, setFormOpen] = useState(false);
	const [formState, setFormState] = useState<SurveyHeaderFormState>(EMPTY_FORM);
	const [formError, setFormError] = useState<ActionError | null>(null);
	const [isPending, startTransition] = useTransition();

	const openAdd = useCallback(() => { setFormState(EMPTY_FORM); setFormError(null); setFormOpen(true); }, []);
	const openEdit = useCallback((row: SurveyHeaderTableRow) => { setFormState({ headerId: row.id, parentDescription: row.parentDescription, product: row.product, isActive: row.isActive == "no" ? "no" : "yes" }); setFormError(null); setFormOpen(true); }, []);

	const handleFormSubmit = useCallback(() => {
		startTransition(async () => {
			try {
				await sqhActions.upsertSurveyHeaderAction(formState);
				await qc.invalidateQueries({ queryKey: ["survey-header-management"] });
				setFormOpen(false);
			} catch(e) { setFormError(resolveActionError(e, "Failed to save header.")); }
		});
	}, [formState, qc]);

	// ── details drawer ───────────────────────────────────────────────────
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [detailsRow, setDetailsRow] = useState<SurveyHeaderTableRow | null>(null);
	const openDetails = useCallback((row: SurveyHeaderTableRow) => { setDetailsRow(row); setDetailsOpen(true); }, []);

	// ── delete dialog ────────────────────────────────────────────────────
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleteRow, setDeleteRow] = useState<SurveyHeaderTableRow | null>(null);
	const [deleteError, setDeleteError] = useState<ActionError | null>(null);
	const openDelete = useCallback((row: SurveyHeaderTableRow) => { setDeleteRow(row); setDeleteError(null); setDeleteOpen(true); }, []);
	const handleDeleteConfirm = useCallback(() => {
		if(!deleteRow) return;
		startTransition(async () => {
			try {
				await sqhActions.requestDeleteSurveyHeaderAction(deleteRow.id);
				await qc.invalidateQueries({ queryKey: ["survey-header-management"] });
				setDeleteOpen(false);
			} catch(e) { setDeleteError(resolveActionError(e, "Failed to request delete.")); }
		});
	}, [deleteRow, qc]);

	// ── cancel dialog ────────────────────────────────────────────────────
	const [cancelOpen, setCancelOpen] = useState(false);
	const [cancelRow, setCancelRow] = useState<SurveyHeaderTableRow | null>(null);
	const openCancel = useCallback((row: SurveyHeaderTableRow) => { setCancelRow(row); setCancelOpen(true); }, []);
	const handleCancelConfirm = useCallback(() => {
		if(!cancelRow) return;
		startTransition(async () => {
			try {
				await sqhActions.cancelSurveyHeaderRequestAction(cancelRow.id);
				await qc.invalidateQueries({ queryKey: ["survey-header-management"] });
				setCancelOpen(false);
			} catch(e) {}
		});
	}, [cancelRow, qc]);

	const isMutating = isPending;

	// ── actions per row ──────────────────────────────────────────────────
	const renderActions = useCallback((row: SurveyHeaderTableRow) => {
		const isPending = row.reviewedAt == null;
		return (
			<>
				{!row.isSoftDeleted && isPending && <Button type="button" size="sm" variant="outline" onClick={() => openEdit(row)}><PencilIcon className="h-4 w-4" />Edit</Button>}
				{!row.isSoftDeleted && !isPending && <Button type="button" size="sm" variant="outline" onClick={() => openDelete(row)}><Trash2Icon className="h-4 w-4" />Delete</Button>}
				{isPending && <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => openCancel(row)}><XCircleIcon className="h-4 w-4" />Cancel</Button>}
			</>
		);
	}, [openEdit, openDelete, openCancel]);

	return (
		<DashboardManagementPageFrame title="Survey Question Header - Maker" description="Manage survey question headers.">
			<div className="space-y-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="relative flex-1 max-w-sm">
						<SearchIcon className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
						<Input className="pl-9" value={keyword} onChange={e => { setKeyword(e.target.value); setPageIndex(1); }} placeholder="Search headers…" />
					</div>
					<Button type="button" onClick={openAdd} disabled={isMutating}><PlusIcon className="h-4 w-4" />Add Header</Button>
				</div>
				{queryErrorMessage != null && <p className="text-destructive text-sm">{queryErrorMessage}</p>}
				<SurveyHeaderTable queryResult={queryResult} isLoading={isLoading} isMutating={isMutating} onOpenDetails={openDetails} renderActions={renderActions} />
				<SurveyHeaderPagination pageIndex={pageIndex} totalDocs={queryResult.totalDocs} hasPreviousPage={queryResult.hasPreviousPage} hasNextPage={queryResult.hasNextPage} isLoading={isLoading} isMutating={isMutating} onPrevious={() => setPageIndex(p => Math.max(1, p - 1))} onNext={() => setPageIndex(p => p + 1)} />
			</div>

			<SurveyHeaderFormDrawer open={formOpen} onOpenChange={setFormOpen} formState={formState} formError={formError} isMutating={isMutating} onParentDescriptionChange={v => setFormState(s => ({ ...s, parentDescription: v }))} onProductChange={v => setFormState(s => ({ ...s, product: v }))} onIsActiveChange={v => setFormState(s => ({ ...s, isActive: v }))} onSubmit={handleFormSubmit} />
			<SurveyHeaderDetailsDrawer open={detailsOpen} onOpenChange={setDetailsOpen} row={detailsRow} renderActions={row => renderActions(row)} />
			<SurveyHeaderDeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} row={deleteRow} isMutating={isMutating} onConfirm={handleDeleteConfirm} />
			<SurveyHeaderCancelDialog open={cancelOpen} onOpenChange={setCancelOpen} row={cancelRow} isMutating={isMutating} onConfirm={handleCancelConfirm} />
		</DashboardManagementPageFrame>
	);
}
