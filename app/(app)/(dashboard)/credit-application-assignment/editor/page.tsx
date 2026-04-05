"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlertIcon, EyeIcon, PencilIcon, PlusIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";

import { DashboardManagementPageFrame, DashboardManagementPagination, DashboardManagementToolbar } from "../../layout.components";
import { EntrySummaryDrawer, useDashboardRelationNavigation } from "../../relation-navigation.components";
import * as assignmentActions from "../layout.actions";
import {
	CREDIT_APPLICATION_ASSIGNMENT_PAGE_SIZE,
	CreditApplicationActiveFiltersSummary,
	CreditApplicationAssignmentCancelDialog,
	CreditApplicationAssignmentDeleteDialog,
	CreditApplicationAssignmentDetailsDrawer,
	CreditApplicationAssignmentFilterCard,
	CreditApplicationAssignmentFormDrawer,
	CreditApplicationAssignmentPreviewDrawer,
	CreditApplicationAssignmentTable,
	CreditApplicationColumnConfigCard,
	getCreditApplicationAssignmentRowKey,
	parseErrorMessage,
	useCreditApplicationAssignmentCellRenderer,
	useCreditApplicationAssignmentColumnPreferences,
	useCreditApplicationAssignmentFilterColumnConfig,
	useCreditApplicationAssignmentFilters,
	useCreditApplicationAssignmentQueryState,
	useCreditApplicationAssignmentRelations,
	useCreditApplicationAssignmentsQuery,
	type CreditApplicationAssignmentFormState,
	type CreditApplicationAssignmentRow
} from "../layout.components";

const emptyQueryResult: assignmentActions.AccountAssignmentEditorListOutput = {
	docs: [],
	totalDocs: 0,
	page: 1,
	hasNextPage: false,
	hasPreviousPage: false
};

const defaultFormState: CreditApplicationAssignmentFormState = {
	applyId: "",
	officerIds: [],
	notes: ""
};

export default function CreditApplicationAssignmentEditorPage() {
	const queryClient = useQueryClient();
	const relationNavigation = useDashboardRelationNavigation();
	const queryState = useCreditApplicationAssignmentQueryState();
	const columnPreferences = useCreditApplicationAssignmentColumnPreferences();
	const filterColumnConfig = useCreditApplicationAssignmentFilterColumnConfig();
	const filters = useCreditApplicationAssignmentFilters({
		getResolvedFilterColumnConfig: filterColumnConfig.getResolvedFilterColumnConfig
	});

	const [pageIndex, setPageIndex] = useState(1);
	const [pageError, setPageError] = useState<string | null>(null);

	const [detailRow, setDetailRow] = useState<CreditApplicationAssignmentRow | null>(null);
	const [previewRow, setPreviewRow] = useState<CreditApplicationAssignmentRow | null>(null);

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [formState, setFormState] = useState<CreditApplicationAssignmentFormState>(defaultFormState);
	const [formError, setFormError] = useState<string | null>(null);

	const [deleteTarget, setDeleteTarget] = useState<CreditApplicationAssignmentRow | null>(null);
	const [cancelTarget, setCancelTarget] = useState<CreditApplicationAssignmentRow | null>(null);

	useEffect(() => {
		setPageIndex(1);
	}, [filters.appliedFilters, queryState.debouncedKeyword, queryState.sortTokens]);

	const queryResult = useCreditApplicationAssignmentsQuery({
		mode: "editor",
		debouncedKeyword: queryState.debouncedKeyword,
		sortTokens: queryState.sortTokens,
		appliedFilters: filters.appliedFilters,
		isFilterStateReady: filters.isFilterStateReady,
		page: pageIndex,
		limit: CREDIT_APPLICATION_ASSIGNMENT_PAGE_SIZE
	});

	useEffect(() => {
		if(queryResult.data == null || queryResult.isFetching)
			return;
		if(queryResult.data.page != pageIndex)
			setPageIndex(queryResult.data.page);
	}, [pageIndex, queryResult.data, queryResult.isFetching]);

	const officerOptionsResult = useQuery({
		queryKey: ["credit-application-assignment", "officer-options"],
		queryFn: assignmentActions.listAssignmentOfficerOptionsAction,
		staleTime: 60_000
	});

	const assignmentMutation = useMutation({
		mutationFn: async (input: CreditApplicationAssignmentFormState) => {
			const applyId = input.applyId.trim();
			if(applyId.length == 0)
				throw new Error("Apply ID is required.");
			if(input.officerIds.length != 1)
				throw new Error("Please select exactly one officer.");

			if(input.assignmentId == null) {
				await assignmentActions.createAssignmentRequestsAction({
					applyIds: [applyId],
					officerIds: input.officerIds
				});
				return;
			}

			await assignmentActions.reassignAssignmentRequestAction({
				assignmentId: input.assignmentId,
				officerIds: input.officerIds
			});
		},
		onSuccess: async () => {
			setIsFormOpen(false);
			setFormError(null);
			setFormState(defaultFormState);
			await queryClient.invalidateQueries({ queryKey: ["credit-application-assignment", "query"] });
		},
		onError: error => {
			setFormError(parseErrorMessage(error, "Failed to submit assignment request."));
		}
	});

	const queryData = queryResult.data ?? emptyQueryResult;
	const tableRows = queryData.docs;

	const relationQuery = useCreditApplicationAssignmentRelations({
		docs: tableRows,
		visibleColumns: columnPreferences.visibleColumns
	});

	const cellRenderer = useCreditApplicationAssignmentCellRenderer({
		hasEditorAccess: true,
		hasAuditorAccess: false,
		relationValuesByRowId: relationQuery.relationValuesByRowId,
		isRelationLoading: relationQuery.isRelationLoading,
		relationNavigation: {
			getHrefBase: relationNavigation.getTargetHrefBase,
			onRelationLinkClick: relationNavigation.onRelationLinkClick,
			onOpenSummary: relationNavigation.openSummary
		}
	});

	const queryErrorMessage = queryResult.error != null ? parseErrorMessage(queryResult.error, "Failed to load assignment data.") : null;
	const displayErrorMessage = pageError ?? queryErrorMessage;
	const isLoading = queryResult.isLoading;
	const isMutating = assignmentMutation.isPending;

	const openCreateDialog = () => {
		setFormError(null);
		setFormState(defaultFormState);
		setIsFormOpen(true);
	};

	const openAssignDialog = (row: CreditApplicationAssignmentRow) => {
		setFormError(null);
		setFormState({
			assignmentId: row.assignmentId ?? undefined,
			applyId: row.applyId,
			officerIds: [],
			notes: ""
		});
		setIsFormOpen(true);
	};

	const submitForm = () => {
		setPageError(null);
		setFormError(null);
		assignmentMutation.mutate(formState);
	};

	const renderAssignmentActions = (row: CreditApplicationAssignmentRow) => {
		return (
			<>
				<Button type="button" size="sm" variant="outline" onClick={() => setPreviewRow(row)} disabled={isMutating}>
					<EyeIcon />
					Preview
				</Button>
				<Button type="button" size="sm" variant="outline" onClick={() => openAssignDialog(row)} disabled={isMutating}>
					<PencilIcon />
					{row.assignmentId == null ? "Assign" : "Reassign"}
				</Button>
				{row.assignmentStatus == "pending_approval" ? (
					<Button type="button" size="sm" variant="secondary" onClick={() => setCancelTarget(row)} disabled={isMutating}>
						Cancel Request
					</Button>
				) : null}
				{row.assignmentId != null ? (
					<Button type="button" size="sm" variant="destructive" onClick={() => setDeleteTarget(row)} disabled={isMutating}>
						Delete
					</Button>
				) : null}
			</>
		);
	};

	return (
		<>
			<DashboardManagementPageFrame
				title="Credit Application Assignment"
				description="Manage assignment requests with editor workflows for assigning and reassigning officers."
			>
				<DashboardManagementToolbar
					keyword={queryState.keyword}
					onKeywordChange={queryState.setKeyword}
					searchPlaceholder="Search by apply ID or account name"
					filterCount={filters.appliedFilters.length}
					onToggleFilter={filters.toggleFilterPanel}
					onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
					isLoading={isLoading}
					isMutating={isMutating}
					rightSlot={(
						<Button type="button" onClick={openCreateDialog} disabled={isLoading || isMutating}>
							<PlusIcon />
							Add
						</Button>
					)}
				/>

				<CreditApplicationAssignmentFilterCard
					isOpen={filters.isFilterOpen}
					onOpenChange={filters.setIsFilterOpen}
					filters={filters.filters}
					getResolvedFilterColumnConfig={filterColumnConfig.getResolvedFilterColumnConfig}
					onUpdateFilter={filters.updateFilter}
					onAddFilter={filters.addFilter}
					onRemoveFilter={filters.removeFilter}
					onClearFilters={filters.clearFilter}
					isLoading={isLoading}
					isMutating={isMutating}
				/>

				<CreditApplicationColumnConfigCard
					isOpen={columnPreferences.isColumnOpen}
					onOpenChange={columnPreferences.setIsColumnOpen}
					orderedColumns={columnPreferences.orderedColumns}
					hiddenColumnIds={columnPreferences.hiddenColumnIds}
					onToggleColumnVisibility={columnPreferences.toggleColumnVisibility}
					onReset={columnPreferences.resetColumnPreferences}
					onColumnDragStart={columnPreferences.handleColumnDragStart}
					onColumnDragOver={columnPreferences.handleColumnDragOver}
					onColumnDragEnd={columnPreferences.handleColumnDragEnd}
				/>

				<CreditApplicationActiveFiltersSummary items={filters.filterSummaryItems} />

				{displayErrorMessage != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>Error</AlertTitle>
						<AlertDescription>{displayErrorMessage}</AlertDescription>
					</Alert>
				) : null}

				<CreditApplicationAssignmentTable
					rows={tableRows}
					visibleColumns={columnPreferences.visibleColumns}
					isLoading={isLoading}
					isMutating={isMutating}
					getSortDirection={queryState.getSortDirection}
					onToggleSortField={queryState.toggleSortField}
					onOpenDetails={setDetailRow}
					renderCell={cellRenderer.renderCell}
					renderActions={renderAssignmentActions}
				/>

				<DashboardManagementPagination
					pageIndex={pageIndex}
					totalRequests={queryData.totalDocs}
					hasPreviousPage={queryData.hasPreviousPage}
					hasNextPage={queryData.hasNextPage}
					isLoading={isLoading}
					isMutating={isMutating}
					onPrevious={() => setPageIndex(previous => Math.max(previous - 1, 1))}
					onNext={() => setPageIndex(previous => previous + 1)}
				/>
			</DashboardManagementPageFrame>

			<CreditApplicationAssignmentDetailsDrawer
				open={detailRow != null}
				onOpenChange={open => {
					if(!open)
						setDetailRow(null);
				}}
				row={detailRow}
				relationValues={detailRow == null ? null : relationQuery.relationValuesByRowId[getCreditApplicationAssignmentRowKey(detailRow)] ?? null}
				renderActions={renderAssignmentActions}
				hasAuditorAccess={false}
			/>

			<CreditApplicationAssignmentPreviewDrawer
				open={previewRow != null}
				onOpenChange={open => {
					if(!open)
						setPreviewRow(null);
				}}
				row={previewRow}
			/>

			<CreditApplicationAssignmentFormDrawer
				open={isFormOpen}
				onOpenChange={open => {
					setIsFormOpen(open);
					if(!open)
						setFormError(null);
				}}
				formState={formState}
				officerOptions={officerOptionsResult.data ?? []}
				isMutating={isMutating}
				formError={formError}
				onApplyIdChange={value => setFormState(previous => ({ ...previous, applyId: value }))}
				onOfficerIdsChange={value => setFormState(previous => ({ ...previous, officerIds: value }))}
				onNotesChange={value => setFormState(previous => ({ ...previous, notes: value }))}
				onSubmit={submitForm}
			/>

			<CreditApplicationAssignmentDeleteDialog
				open={deleteTarget != null}
				onOpenChange={open => {
					if(!open)
						setDeleteTarget(null);
				}}
				onConfirm={() => {
					setDeleteTarget(null);
					setPageError("Delete request action is not available yet.");
				}}
				isMutating={isMutating}
			/>

			<CreditApplicationAssignmentCancelDialog
				open={cancelTarget != null}
				onOpenChange={open => {
					if(!open)
						setCancelTarget(null);
				}}
				onConfirm={() => {
					setCancelTarget(null);
					setPageError("Cancel request action is not available yet.");
				}}
				isMutating={isMutating}
			/>

			<EntrySummaryDrawer {...relationNavigation.summaryDrawerProps} />
		</>
	);
}
