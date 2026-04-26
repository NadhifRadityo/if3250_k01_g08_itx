"use client";

import { useState, useCallback, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PlusIcon, PencilIcon, Trash2Icon, XCircleIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/radix/Button";
import { Input } from "@/components/radix/Input";
import { DashboardManagementPageFrame } from "@/app/(app)/(dashboard)/layout.components";

import * as sqdActions from "../layout.actions";
import type { SurveyDetailTableRow, SurveyDetailFormState } from "../layout.components";
import {
	useSurveyDetailQuery,
	SurveyDetailTable,
	SurveyDetailFormDrawer,
	SurveyDetailDetailsDrawer,
	SurveyDetailDeleteDialog,
	SurveyDetailCancelDialog,
	SurveyDetailPagination,
	resolveActionError,
	type ActionError
} from "../layout.components";

const EMPTY_FORM: SurveyDetailFormState = { detailId: null, headerId: null, questionId: "", description: "", typeOfAnswer: "freetext", valueFreeText: "", valueOptions: [] };

export default function SurveyQuestionDetailMakerPage() {
	const qc = useQueryClient();

	const [keyword, setKeyword] = useState("");
	const [pageIndex, setPageIndex] = useState(1);

	const { queryResult, isLoading, queryErrorMessage } = useSurveyDetailQuery({
		queryScope: "maker",
		queryAction: (input) => sqdActions.querySurveyDetailsMakerAction(input),
		keyword,
		pageIndex
	});

	// ── form ─────────────────────────────────────────────────────────────
	const [formOpen, setFormOpen] = useState(false);
	const [formState, setFormState] = useState<SurveyDetailFormState>(EMPTY_FORM);
	const [formError, setFormError] = useState<ActionError | null>(null);
	const [isPending, startTransition] = useTransition();

	const openAdd = useCallback(() => { setFormState(EMPTY_FORM); setFormError(null); setFormOpen(true); }, []);
	const openEdit = useCallback((row: SurveyDetailTableRow) => {
		setFormState({ detailId: row.id, headerId: row.headerId, questionId: row.questionId, description: row.description, typeOfAnswer: row.typeOfAnswer, valueFreeText: row.valueFreeText, valueOptions: row.valueOptions });
		setFormError(null); setFormOpen(true);
	}, []);

	const handleFormSubmit = useCallback(() => {
		startTransition(async () => {
			try {
				await sqdActions.upsertSurveyDetailAction(formState);
				await qc.invalidateQueries({ queryKey: ["survey-detail-management"] });
				setFormOpen(false);
			} catch(e) { setFormError(resolveActionError(e, "Failed to save question.")); }
		});
	}, [formState, qc]);

	// ── details ───────────────────────────────────────────────────────────
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [detailsRow, setDetailsRow] = useState<SurveyDetailTableRow | null>(null);
	const openDetails = useCallback((row: SurveyDetailTableRow) => { setDetailsRow(row); setDetailsOpen(true); }, []);

	// ── delete ────────────────────────────────────────────────────────────
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleteRow, setDeleteRow] = useState<SurveyDetailTableRow | null>(null);
	const openDelete = useCallback((row: SurveyDetailTableRow) => { setDeleteRow(row); setDeleteOpen(true); }, []);
	const handleDeleteConfirm = useCallback(() => {
		if(!deleteRow) return;
		startTransition(async () => {
			try {
				await sqdActions.requestDeleteSurveyDetailAction(deleteRow.id);
				await qc.invalidateQueries({ queryKey: ["survey-detail-management"] });
				setDeleteOpen(false);
			} catch(e) {}
		});
	}, [deleteRow, qc]);

	// ── cancel ────────────────────────────────────────────────────────────
	const [cancelOpen, setCancelOpen] = useState(false);
	const [cancelRow, setCancelRow] = useState<SurveyDetailTableRow | null>(null);
	const openCancel = useCallback((row: SurveyDetailTableRow) => { setCancelRow(row); setCancelOpen(true); }, []);
	const handleCancelConfirm = useCallback(() => {
		if(!cancelRow) return;
		startTransition(async () => {
			try {
				await sqdActions.cancelSurveyDetailRequestAction(cancelRow.id);
				await qc.invalidateQueries({ queryKey: ["survey-detail-management"] });
				setCancelOpen(false);
			} catch(e) {}
		});
	}, [cancelRow, qc]);

	const isMutating = isPending;

	const renderActions = useCallback((row: SurveyDetailTableRow) => {
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
		<DashboardManagementPageFrame title="Survey Question Detail - Maker" description="Manage survey question details.">
			<div className="space-y-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="relative flex-1 max-w-sm">
						<SearchIcon className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
						<Input className="pl-9" value={keyword} onChange={e => { setKeyword(e.target.value); setPageIndex(1); }} placeholder="Search questions…" />
					</div>
					<Button type="button" onClick={openAdd} disabled={isMutating}><PlusIcon className="h-4 w-4" />Add Question</Button>
				</div>
				{queryErrorMessage != null && <p className="text-destructive text-sm">{queryErrorMessage}</p>}
				<SurveyDetailTable queryResult={queryResult} isLoading={isLoading} isMutating={isMutating} onOpenDetails={openDetails} renderActions={renderActions} />
				<SurveyDetailPagination pageIndex={pageIndex} totalDocs={queryResult.totalDocs} hasPreviousPage={queryResult.hasPreviousPage} hasNextPage={queryResult.hasNextPage} isLoading={isLoading} isMutating={isMutating} onPrevious={() => setPageIndex(p => Math.max(1, p - 1))} onNext={() => setPageIndex(p => p + 1)} />
			</div>

			<SurveyDetailFormDrawer open={formOpen} onOpenChange={setFormOpen} formState={formState} formError={formError} isMutating={isMutating}
				onHeaderSelect={(id, _) => setFormState(s => ({ ...s, headerId: id }))}
				onQuestionIdChange={v => setFormState(s => ({ ...s, questionId: v }))}
				onDescriptionChange={v => setFormState(s => ({ ...s, description: v }))}
				onTypeOfAnswerChange={v => setFormState(s => ({ ...s, typeOfAnswer: v }))}
				onValueFreeTextChange={v => setFormState(s => ({ ...s, valueFreeText: v }))}
				onValueOptionsChange={opts => setFormState(s => ({ ...s, valueOptions: opts }))}
				onSubmit={handleFormSubmit}
			/>
			<SurveyDetailDetailsDrawer open={detailsOpen} onOpenChange={setDetailsOpen} row={detailsRow} renderActions={row => renderActions(row)} />
			<SurveyDetailDeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} row={deleteRow} isMutating={isMutating} onConfirm={handleDeleteConfirm} />
			<SurveyDetailCancelDialog open={cancelOpen} onOpenChange={setCancelOpen} row={cancelRow} isMutating={isMutating} onConfirm={handleCancelConfirm} />
		</DashboardManagementPageFrame>
	);
}
