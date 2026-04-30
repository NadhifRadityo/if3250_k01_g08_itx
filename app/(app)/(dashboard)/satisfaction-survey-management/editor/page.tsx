"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { XIcon, PlusIcon, PencilIcon, Trash2Icon, HistoryIcon, CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Switch } from "@/components/radix/Switch";

import { DashboardManagementToolbar, DashboardManagementPageFrame, DashboardManagementPagination } from "../../layout.components";
import { EntrySummaryDrawer, useDashboardRelationNavigation } from "../../relation-navigation.components";
import * as surveyActions from "../layout.actions";
import { createEmptyReviewComment } from "@/utils/reviewCommentRichText";
import { SurveyActiveFiltersSummary } from "../layout.components";
import { SurveyColumnConfigCard } from "../layout.components";
import { SurveyRequestCancelDialog } from "../layout.components";
import { SurveyRequestDeleteDialog } from "../layout.components";
import { SurveyRequestDetailsDrawer } from "../layout.components";
import { SurveyRequestChangePreviewDrawer } from "../layout.components";
import { SurveyRequestFilterCard } from "../layout.components";
import { SurveyRequestFormDrawer } from "../layout.components";
import { SurveyRequestsTable } from "../layout.components";
import { getEligibleDetailTriggerSurveyColumnId } from "../layout.components";
import { resolveActionError } from "../layout.components";
import { useSurveyCellRenderer } from "../layout.components";
import { useSurveyColumnPreferences } from "../layout.components";
import { useSurveyFilterColumnConfig } from "../layout.components";
import { useSurveyManagementQueryState } from "../layout.components";
import { useSurveyRequestFilters } from "../layout.components";
import { useSurveyRequestsQuery } from "../layout.components";
import {
	defaultFormState,
	type FormState,
	type ActionError,
	type SurveyTableRow
} from "../layout.components";

export default function SurveyManagementEditorPage() {
	const [showSoftDeleted, setShowSoftDeleted] = useState(false);
	const [errorMessage, setErrorMessage] = useState<ActionError | null>(null);
	const queryClient = useQueryClient();

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [formState, setFormState] = useState<FormState>(defaultFormState);
	const [formError, setFormError] = useState<ActionError | null>(null);
	const [detailRow, setDetailRow] = useState<SurveyTableRow | null>(null);
	const [requestChangeRow, setRequestChangeRow] = useState<SurveyTableRow | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<SurveyTableRow | null>(null);
	const [cancelTarget, setCancelTarget] = useState<SurveyTableRow | null>(null);
	const [isMutating, startMutationTransition] = useTransition();
	const relationNavigation = useDashboardRelationNavigation();
	const columnPreferences = useSurveyColumnPreferences();
	const queryState = useSurveyManagementQueryState();
	const { getResolvedFilterColumnConfig } = useSurveyFilterColumnConfig();
	const filters = useSurveyRequestFilters({ getResolvedFilterColumnConfig });

	const includeSoftDeleted = showSoftDeleted;

	const {
		pageIndex,
		setPageIndex,
		queryResult,
		isLoading,
		queryErrorMessage
	} = useSurveyRequestsQuery({
		queryScope: "editor",
		queryAction: surveyActions.querySurveysEditorAction,
		debouncedKeyword: queryState.debouncedKeyword,
		sortTokens: queryState.sortTokens,
		appliedFilters: filters.appliedFilters,
		isFilterStateReady: filters.isFilterStateReady,
		includeSoftDeleted
	});
	const renderSurveyCell = useSurveyCellRenderer({
		relations: queryResult.relations,
		onOpenRequestChanges: setRequestChangeRow,
		relationNavigation: {
			getHrefBase: relationNavigation.getTargetHrefBase,
			onRelationLinkClick: relationNavigation.onRelationLinkClick,
			onOpenSummary: relationNavigation.openSummary
		}
	});
	const displayError = errorMessage ?? (queryErrorMessage != null ? {
		title: "Error",
		message: queryErrorMessage
	} : null);
	const detailTriggerColumnId = getEligibleDetailTriggerSurveyColumnId(columnPreferences.visibleColumns);

	const runMutation = (
		action: () => Promise<void>,
		options?: {
			onError?: (error: ActionError) => void;
			fallbackMessage?: string;
			clearPageError?: boolean;
		}
	) => {
		startMutationTransition(() => {
			void (async () => {
				if(options?.clearPageError ?? true)
					setErrorMessage(null);
				try {
					await action();
					await queryClient.invalidateQueries({ queryKey: ["satisfaction-survey-management"] });
				} catch(error) {
					const actionError = resolveActionError(error, options?.fallbackMessage ?? "Operation failed.");
					if(options?.onError != null) {
						options.onError(actionError);
						return;
					}
					setErrorMessage(actionError);
				}
			})();
		});
	};

	const openCreateDialog = () => {
		setFormError(null);
		setFormState(defaultFormState);
		setIsFormOpen(true);
	};

	const openEditDialog = (row: SurveyTableRow) => {
		setFormError(null);
		setFormState({
			surveyId: row.id,
			title: row.title,
			description: row.description ?? createEmptyReviewComment(),
			content: row.content
		});
		setIsFormOpen(true);
	};

	const submitForm = () => {
		setFormError(null);
		if(formState.title.trim().length == 0)
			return setFormError({ title: "ValidationError", message: "Satisfaction survey title is required." });
		if(formState.content == null)
			return setFormError({ title: "ValidationError", message: "Content JSON is required." });
		runMutation(async () => {
			await surveyActions.upsertSurveyRequestAction({
				surveyId: formState.surveyId,
				title: formState.title,
				description: formState.description,
				content: formState.content
			});
			setIsFormOpen(false);
		}, {
			onError: setFormError,
			fallbackMessage: "Failed to save request.",
			clearPageError: false
		});
	};

	const requestDelete = (row: SurveyTableRow) => {
		runMutation(async () => {
			await surveyActions.requestDeleteSurveyAction(row.id);
			setDeleteTarget(null);
		});
	};

	const cancelRequest = (row: SurveyTableRow) => {
		runMutation(async () => {
			await surveyActions.cancelSurveyRequestAction(row.id);
		});
	};

	const requestRestore = (row: SurveyTableRow) => {
		runMutation(async () => {
			await surveyActions.requestRestoreSurveyAction(row.id);
		});
	};

	const renderSurveyActions = (row: SurveyTableRow) => {
		const isPending = row.reviewedAt == null;
		const isRejected = row.reviewedAt != null && row.reviewApproved == false;

		return (
			<>
				<Button type="button" size="sm" variant="outline" onClick={() => openEditDialog(row)} disabled={isMutating || row.isSoftDeleted}>
					<PencilIcon />
					Edit
				</Button>
				{row.isSoftDeleted ? (
					<Button type="button" size="sm" variant="outline" onClick={() => requestRestore(row)} disabled={isMutating}>
						<PlusIcon />
						Restore
					</Button>
				) : row.deletedAt == null ? (
					<Button type="button" size="sm" variant="destructive" onClick={() => setDeleteTarget(row)} disabled={isMutating}>
						<Trash2Icon />
						Delete
					</Button>
				) : null}
				{isPending && !row.isSoftDeleted ? (
					<Button type="button" size="sm" variant="secondary" onClick={() => setCancelTarget(row)} disabled={isMutating}>
						<XIcon />
						Cancel
					</Button>
				) : null}
				{isRejected && !row.isSoftDeleted ? (
					<Button type="button" size="sm" variant="secondary" onClick={() => cancelRequest(row)} disabled={isMutating}>
						<HistoryIcon />
						Restore Approved
					</Button>
				) : null}
			</>
		);
	};

	return (
		<>
			<DashboardManagementPageFrame
				title="Satisfaction Survey Management"
				description="Manage satisfaction survey draft requests with editor workflows for title, description, and content updates."
			>
				<DashboardManagementToolbar
					keyword={queryState.keyword}
					onKeywordChange={queryState.setKeyword}
					searchPlaceholder="Search satisfaction surveys by title or ID"
					filterCount={filters.appliedFilters.length}
					onToggleFilter={filters.toggleFilterPanel}
					onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
					isLoading={isLoading}
					isMutating={isMutating}
					rightSlot={(
						<>
							<div className="flex items-center gap-2">
								<label htmlFor="survey-show-deleted" className="text-sm">Show Deleted</label>
								<Switch
									id="survey-show-deleted"
									checked={showSoftDeleted}
									onCheckedChange={checked => setShowSoftDeleted(checked)}
									disabled={isLoading || isMutating}
								/>
							</div>
							<Button type="button" onClick={openCreateDialog} disabled={isLoading || isMutating}>
								<PlusIcon />
								Add
							</Button>
						</>
					)}
				/>

				<SurveyRequestFilterCard
					isLoading={isLoading}
					isMutating={isMutating}
					filters={filters}
					getResolvedFilterColumnConfig={getResolvedFilterColumnConfig}
				/>

				<SurveyColumnConfigCard
					isOpen={columnPreferences.isColumnOpen}
					onOpenChange={columnPreferences.setIsColumnOpen}
					orderedColumns={columnPreferences.orderedColumns}
					hiddenColumnIds={columnPreferences.hiddenColumnIds}
					visibleColumnCount={columnPreferences.visibleColumns.length}
					onToggleColumnVisibility={columnPreferences.toggleColumnVisibility}
					onReset={columnPreferences.resetColumnPreferences}
					onColumnDragStart={columnPreferences.handleColumnDragStart}
					onColumnDragOver={columnPreferences.handleColumnDragOver}
					onColumnDragEnd={columnPreferences.handleColumnDragEnd}
				/>

				<SurveyActiveFiltersSummary items={filters.filterSummaryItems} />

				{displayError != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>{displayError.title}</AlertTitle>
						<AlertDescription>{displayError.message}</AlertDescription>
					</Alert>
				) : null}

				<SurveyRequestsTable
					queryResult={queryResult}
					visibleColumns={columnPreferences.visibleColumns}
					visibleColumnCount={columnPreferences.visibleColumns.length + 1}
					detailTriggerColumnId={detailTriggerColumnId}
					isLoading={isLoading}
					isMutating={isMutating}
					getSortDirection={queryState.getSortDirection}
					onToggleSortField={queryState.toggleSortField}
					onOpenDetails={setDetailRow}
					renderSurveyCell={renderSurveyCell}
					renderActions={renderSurveyActions}
				/>

				<DashboardManagementPagination
					pageIndex={pageIndex}
					totalRequests={queryResult.totalDocs}
					hasPreviousPage={queryResult.hasPreviousPage}
					hasNextPage={queryResult.hasNextPage}
					isLoading={isLoading}
					isMutating={isMutating}
					onPrevious={() => setPageIndex(previous => Math.max(previous - 1, 1))}
					onNext={() => setPageIndex(previous => previous + 1)}
				/>
			</DashboardManagementPageFrame>

			<SurveyRequestDetailsDrawer
				open={detailRow != null}
				onOpenChange={open => {
					if(!open)
						setDetailRow(null);
				}}
				row={detailRow}
				renderActions={renderSurveyActions}
				onOpenRequestChanges={setRequestChangeRow}
				relationNavigation={{
					getHrefBase: relationNavigation.getTargetHrefBase,
					onRelationLinkClick: relationNavigation.onRelationLinkClick,
					onOpenSummary: relationNavigation.openSummary
				}}
			/>

			<SurveyRequestChangePreviewDrawer
				open={requestChangeRow != null}
				onOpenChange={open => {
					if(!open)
						setRequestChangeRow(null);
				}}
				row={requestChangeRow}
			/>

			<SurveyRequestFormDrawer
				open={isFormOpen}
				onOpenChange={open => {
					setIsFormOpen(open);
					if(!open)
						setFormError(null);
				}}
				formState={formState}
				formError={formError}
				isMutating={isMutating}
				onTitleChange={value => setFormState(previous => ({ ...previous, title: value }))}
				onDescriptionChange={value => setFormState(previous => ({ ...previous, description: value }))}
				onContentChange={value => setFormState(previous => ({ ...previous, content: value }))}
				onSubmit={submitForm}
			/>

			<SurveyRequestDeleteDialog
				open={deleteTarget != null}
				onOpenChange={open => {
					if(!open)
						setDeleteTarget(null);
				}}
				onConfirm={() => {
					if(deleteTarget != null)
						requestDelete(deleteTarget);
				}}
				isMutating={isMutating}
			/>

			<SurveyRequestCancelDialog
				open={cancelTarget != null}
				onOpenChange={open => {
					if(!open)
						setCancelTarget(null);
				}}
				onConfirm={() => {
					if(cancelTarget != null) {
						cancelRequest(cancelTarget);
						setCancelTarget(null);
					}
				}}
				isMutating={isMutating}
			/>

			<EntrySummaryDrawer {...relationNavigation.summaryDrawerProps} />
		</>
	);
}
