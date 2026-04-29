"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { XIcon, PlusIcon, PencilIcon, Trash2Icon, HistoryIcon, CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Switch } from "@/components/radix/Switch";

import { DashboardManagementToolbar, DashboardManagementPageFrame, DashboardManagementPagination } from "../../layout.components";
import { EntrySummaryDrawer, useDashboardRelationNavigation } from "../../relation-navigation.components";
import * as creditApplicationAssignmentActions from "../layout.actions";
import { CreditApplicationAssignmentActiveFiltersSummary } from "../layout.components";
import { CreditApplicationAssignmentColumnConfigCard } from "../layout.components";
import { CreditApplicationAssignmentRequestCancelDialog } from "../layout.components";
import { CreditApplicationAssignmentRequestChangePreviewDrawer } from "../layout.components";
import { CreditApplicationAssignmentRequestDetailsDrawer } from "../layout.components";
import { CreditApplicationAssignmentRequestDeleteDialog } from "../layout.components";
import { CreditApplicationAssignmentRequestFilterCard } from "../layout.components";
import { CreditApplicationAssignmentRequestFormDrawer } from "../layout.components";
import { CreditApplicationAssignmentRequestsTable } from "../layout.components";
import { defaultFormState } from "../layout.components";
import { getEligibleDetailTriggerCreditApplicationAssignmentColumnId } from "../layout.components";
import { resolveActionError } from "../layout.components";
import { useCreditApplicationAssignmentCellRenderer } from "../layout.components";
import { useCreditApplicationAssignmentColumnPreferences } from "../layout.components";
import { useCreditApplicationAssignmentFilterColumnConfig } from "../layout.components";
import { useCreditApplicationAssignmentManagementQueryState } from "../layout.components";
import { useCreditApplicationAssignmentRequestFilters } from "../layout.components";
import { useCreditApplicationAssignmentRequestsQuery } from "../layout.components";
import {
	type FormState,
	type ActionError,
	type CreditApplicationAssignmentTableRow
} from "../layout.components";

export default function CreditApplicationAssignmentEditorPage() {
	const [showSoftDeleted, setShowSoftDeleted] = useState(false);
	const [errorMessage, setErrorMessage] = useState<ActionError | null>(null);
	const queryClient = useQueryClient();

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [formState, setFormState] = useState<FormState>(defaultFormState);
	const [formError, setFormError] = useState<ActionError | null>(null);
	const [detailRow, setDetailRow] = useState<CreditApplicationAssignmentTableRow | null>(null);
	const [requestChangeRow, setRequestChangeRow] = useState<CreditApplicationAssignmentTableRow | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<CreditApplicationAssignmentTableRow | null>(null);
	const [cancelTarget, setCancelTarget] = useState<CreditApplicationAssignmentTableRow | null>(null);
	const [isMutating, startMutationTransition] = useTransition();
	const relationNavigation = useDashboardRelationNavigation();
	const columnPreferences = useCreditApplicationAssignmentColumnPreferences();
	const queryState = useCreditApplicationAssignmentManagementQueryState();
	const {
		searchCreditApplicationOptions,
		searchOfficerOptions,
		getResolvedFilterColumnConfig
	} = useCreditApplicationAssignmentFilterColumnConfig();
	const filters = useCreditApplicationAssignmentRequestFilters({ getResolvedFilterColumnConfig });

	const includeSoftDeleted = showSoftDeleted;

	const {
		pageIndex,
		setPageIndex,
		queryResult,
		isLoading,
		queryErrorMessage
	} = useCreditApplicationAssignmentRequestsQuery({
		queryScope: "editor",
		queryAction: creditApplicationAssignmentActions.queryCreditApplicationAssignmentsEditorAction,
		debouncedKeyword: queryState.debouncedKeyword,
		sortTokens: queryState.sortTokens,
		appliedFilters: filters.appliedFilters,
		isFilterStateReady: filters.isFilterStateReady,
		includeSoftDeleted
	});
	const renderAssignmentCell = useCreditApplicationAssignmentCellRenderer({
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
	const detailTriggerColumnId = getEligibleDetailTriggerCreditApplicationAssignmentColumnId(columnPreferences.visibleColumns);

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
					await queryClient.invalidateQueries({ queryKey: ["credit-application-assignment"] });
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

	const openEditDialog = (row: CreditApplicationAssignmentTableRow) => {
		setFormError(null);
		setFormState({
			assignmentId: row.id,
			creditApplication: row.creditApplication ?? "",
			officer: row.officer ?? ""
		});
		setIsFormOpen(true);
	};

	const submitForm = () => {
		setFormError(null);
		if(formState.creditApplication.trim().length == 0)
			return setFormError({ title: "ValidationError", message: "Credit application is required." });
		if(formState.officer.trim().length == 0)
			return setFormError({ title: "ValidationError", message: "Officer is required." });
		runMutation(async () => {
			await creditApplicationAssignmentActions.upsertCreditApplicationAssignmentRequestAction({
				assignmentId: formState.assignmentId,
				creditApplication: formState.creditApplication,
				officer: formState.officer
			});
			setIsFormOpen(false);
		}, {
			onError: setFormError,
			fallbackMessage: "Failed to save request.",
			clearPageError: false
		});
	};

	const requestDelete = (row: CreditApplicationAssignmentTableRow) => {
		runMutation(async () => {
			await creditApplicationAssignmentActions.requestDeleteCreditApplicationAssignmentAction(row.id);
			setDeleteTarget(null);
		});
	};

	const cancelRequest = (row: CreditApplicationAssignmentTableRow) => {
		runMutation(async () => {
			await creditApplicationAssignmentActions.cancelCreditApplicationAssignmentRequestAction(row.id);
		});
	};

	const requestRestore = (row: CreditApplicationAssignmentTableRow) => {
		runMutation(async () => {
			await creditApplicationAssignmentActions.requestRestoreCreditApplicationAssignmentAction(row.id);
		});
	};

	const renderAssignmentActions = (row: CreditApplicationAssignmentTableRow) => {
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
				title="Credit Application Assignment"
				description="Manage credit application assignment requests in editor mode before approver review."
			>
				<DashboardManagementToolbar
					keyword={queryState.keyword}
					onKeywordChange={queryState.setKeyword}
					searchPlaceholder="Search assignments by application or officer"
					filterCount={filters.appliedFilters.length}
					onToggleFilter={filters.toggleFilterPanel}
					onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
					isLoading={isLoading}
					isMutating={isMutating}
					rightSlot={(
						<>
							<div className="flex items-center gap-2">
								<label htmlFor="assignment-show-deleted" className="text-sm">Show Deleted</label>
								<Switch
									id="assignment-show-deleted"
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

				<CreditApplicationAssignmentRequestFilterCard
					isLoading={isLoading}
					isMutating={isMutating}
					filters={filters}
					getResolvedFilterColumnConfig={getResolvedFilterColumnConfig}
				/>

				<CreditApplicationAssignmentColumnConfigCard
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

				<CreditApplicationAssignmentActiveFiltersSummary items={filters.filterSummaryItems} />

				{displayError != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>{displayError.title}</AlertTitle>
						<AlertDescription>{displayError.message}</AlertDescription>
					</Alert>
				) : null}

				<CreditApplicationAssignmentRequestsTable
					queryResult={queryResult}
					visibleColumns={columnPreferences.visibleColumns}
					visibleColumnCount={columnPreferences.visibleColumns.length + 1}
					detailTriggerColumnId={detailTriggerColumnId}
					isLoading={isLoading}
					isMutating={isMutating}
					getSortDirection={queryState.getSortDirection}
					onToggleSortField={queryState.toggleSortField}
					onOpenDetails={setDetailRow}
					renderCreditApplicationAssignmentCell={renderAssignmentCell}
					renderActions={renderAssignmentActions}
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

			<CreditApplicationAssignmentRequestDetailsDrawer
				open={detailRow != null}
				onOpenChange={open => {
					if(!open)
						setDetailRow(null);
				}}
				row={detailRow}
				renderActions={renderAssignmentActions}
				onOpenRequestChanges={setRequestChangeRow}
				relationNavigation={{
					getHrefBase: relationNavigation.getTargetHrefBase,
					onRelationLinkClick: relationNavigation.onRelationLinkClick,
					onOpenSummary: relationNavigation.openSummary
				}}
			/>

			<CreditApplicationAssignmentRequestChangePreviewDrawer
				open={requestChangeRow != null}
				onOpenChange={open => {
					if(!open)
						setRequestChangeRow(null);
				}}
				row={requestChangeRow}
				relationNavigation={{
					getHrefBase: relationNavigation.getTargetHrefBase,
					onRelationLinkClick: relationNavigation.onRelationLinkClick,
					onOpenSummary: relationNavigation.openSummary
				}}
			/>

			<CreditApplicationAssignmentRequestFormDrawer
				open={isFormOpen}
				onOpenChange={open => {
					setIsFormOpen(open);
					if(!open)
						setFormError(null);
				}}
				formState={formState}
				formError={formError}
				onSearchCreditApplications={searchCreditApplicationOptions}
				onSearchOfficers={searchOfficerOptions}
				isMutating={isMutating}
				onCreditApplicationChange={value => setFormState(previous => ({ ...previous, creditApplication: value }))}
				onOfficerChange={value => setFormState(previous => ({ ...previous, officer: value }))}
				onSubmit={submitForm}
			/>

			<CreditApplicationAssignmentRequestDeleteDialog
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

			<CreditApplicationAssignmentRequestCancelDialog
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
