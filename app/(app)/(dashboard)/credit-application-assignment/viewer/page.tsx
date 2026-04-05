"use client";

import { useEffect, useState } from "react";
import { CircleAlertIcon, EyeIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";

import { DashboardManagementPageFrame, DashboardManagementPagination, DashboardManagementToolbar } from "../../layout.components";
import { EntrySummaryDrawer, useDashboardRelationNavigation } from "../../relation-navigation.components";
import * as assignmentActions from "../layout.actions";
import {
	CREDIT_APPLICATION_ASSIGNMENT_PAGE_SIZE,
	CreditApplicationActiveFiltersSummary,
	CreditApplicationAssignmentDetailsDrawer,
	CreditApplicationAssignmentFilterCard,
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
	type CreditApplicationAssignmentRow
} from "../layout.components";

const emptyQueryResult: assignmentActions.AccountAssignmentEditorListOutput = {
	docs: [],
	totalDocs: 0,
	page: 1,
	hasNextPage: false,
	hasPreviousPage: false
};

export default function CreditApplicationAssignmentViewerPage() {
	const relationNavigation = useDashboardRelationNavigation();
	const queryState = useCreditApplicationAssignmentQueryState();
	const columnPreferences = useCreditApplicationAssignmentColumnPreferences();
	const filterColumnConfig = useCreditApplicationAssignmentFilterColumnConfig();
	const filters = useCreditApplicationAssignmentFilters({
		getResolvedFilterColumnConfig: filterColumnConfig.getResolvedFilterColumnConfig
	});

	const [pageIndex, setPageIndex] = useState(1);

	const [detailRow, setDetailRow] = useState<CreditApplicationAssignmentRow | null>(null);
	const [previewRow, setPreviewRow] = useState<CreditApplicationAssignmentRow | null>(null);

	useEffect(() => {
		setPageIndex(1);
	}, [filters.appliedFilters, queryState.debouncedKeyword, queryState.sortTokens]);

	const queryResult = useCreditApplicationAssignmentsQuery({
		mode: "viewer",
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

	const queryData = queryResult.data ?? emptyQueryResult;
	const tableRows = queryData.docs;

	const relationQuery = useCreditApplicationAssignmentRelations({
		docs: tableRows,
		visibleColumns: columnPreferences.visibleColumns
	});

	const cellRenderer = useCreditApplicationAssignmentCellRenderer({
		hasEditorAccess: false,
		hasAuditorAccess: true,
		relationValuesByRowId: relationQuery.relationValuesByRowId,
		isRelationLoading: relationQuery.isRelationLoading,
		relationNavigation: {
			getHrefBase: relationNavigation.getTargetHrefBase,
			onRelationLinkClick: relationNavigation.onRelationLinkClick,
			onOpenSummary: relationNavigation.openSummary
		}
	});

	const queryErrorMessage = queryResult.error != null ? parseErrorMessage(queryResult.error, "Failed to load credit application assignment data.") : null;
	const isLoading = queryResult.isLoading;

	const renderViewerActions = (row: CreditApplicationAssignmentRow) => (
		<Button type="button" size="sm" variant="outline" onClick={() => setPreviewRow(row)}>
			<EyeIcon />
			Preview
		</Button>
	);

	return (
		<>
			<DashboardManagementPageFrame
				title="Credit Application Assignment"
				description="View assignment requests without edit or review actions."
			>
				<DashboardManagementToolbar
					keyword={queryState.keyword}
					onKeywordChange={queryState.setKeyword}
					searchPlaceholder="Search assignments by apply ID, account name, or officer"
					filterCount={filters.appliedFilters.length}
					onToggleFilter={filters.toggleFilterPanel}
					onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
					isLoading={isLoading}
					isMutating={false}
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
					isMutating={false}
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

				{queryErrorMessage != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>Error</AlertTitle>
						<AlertDescription>{queryErrorMessage}</AlertDescription>
					</Alert>
				) : null}

				<CreditApplicationAssignmentTable
					rows={tableRows}
					visibleColumns={columnPreferences.visibleColumns}
					includeActions={false}
					isLoading={isLoading}
					isMutating={false}
					getSortDirection={queryState.getSortDirection}
					onToggleSortField={queryState.toggleSortField}
					onOpenDetails={setDetailRow}
					renderCell={cellRenderer.renderCell}
					renderActions={renderViewerActions}
				/>

				<DashboardManagementPagination
					pageIndex={pageIndex}
					totalRequests={queryData.totalDocs}
					hasPreviousPage={queryData.hasPreviousPage}
					hasNextPage={queryData.hasNextPage}
					isLoading={isLoading}
					isMutating={false}
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
				renderActions={renderViewerActions}
				hasAuditorAccess={true}
			/>

			<CreditApplicationAssignmentPreviewDrawer
				open={previewRow != null}
				onOpenChange={open => {
					if(!open)
						setPreviewRow(null);
				}}
				row={previewRow}
			/>

			<EntrySummaryDrawer {...relationNavigation.summaryDrawerProps} />
		</>
	);
}
