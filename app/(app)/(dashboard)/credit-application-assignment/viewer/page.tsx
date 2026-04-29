"use client";

import { useState } from "react";
import { CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";

import { DashboardManagementToolbar, DashboardManagementPageFrame, DashboardManagementPagination } from "../../layout.components";
import { EntrySummaryDrawer, useDashboardRelationNavigation } from "../../relation-navigation.components";
import * as creditApplicationAssignmentActions from "../layout.actions";
import { CreditApplicationAssignmentActiveFiltersSummary } from "../layout.components";
import { CreditApplicationAssignmentColumnConfigCard } from "../layout.components";
import { CreditApplicationAssignmentRequestChangePreviewDrawer } from "../layout.components";
import { CreditApplicationAssignmentRequestDetailsDrawer } from "../layout.components";
import { CreditApplicationAssignmentRequestFilterCard } from "../layout.components";
import { CreditApplicationAssignmentRequestsTable } from "../layout.components";
import { getEligibleDetailTriggerCreditApplicationAssignmentColumnId } from "../layout.components";
import { useCreditApplicationAssignmentCellRenderer } from "../layout.components";
import { useCreditApplicationAssignmentColumnPreferences } from "../layout.components";
import { useCreditApplicationAssignmentFilterColumnConfig } from "../layout.components";
import { useCreditApplicationAssignmentManagementQueryState } from "../layout.components";
import { useCreditApplicationAssignmentRequestFilters } from "../layout.components";
import { useCreditApplicationAssignmentRequestsQuery } from "../layout.components";
import { type CreditApplicationAssignmentTableRow } from "../layout.components";

export default function CreditApplicationAssignmentViewerPage() {
	const [detailRow, setDetailRow] = useState<CreditApplicationAssignmentTableRow | null>(null);
	const [requestChangeRow, setRequestChangeRow] = useState<CreditApplicationAssignmentTableRow | null>(null);
	const relationNavigation = useDashboardRelationNavigation();
	const columnPreferences = useCreditApplicationAssignmentColumnPreferences();
	const queryState = useCreditApplicationAssignmentManagementQueryState();
	const { getResolvedFilterColumnConfig } = useCreditApplicationAssignmentFilterColumnConfig();
	const filters = useCreditApplicationAssignmentRequestFilters({ getResolvedFilterColumnConfig });

	const {
		pageIndex,
		setPageIndex,
		queryResult,
		isLoading,
		queryErrorMessage
	} = useCreditApplicationAssignmentRequestsQuery({
		queryScope: "viewer",
		queryAction: creditApplicationAssignmentActions.queryCreditApplicationAssignmentsViewerAction,
		debouncedKeyword: queryState.debouncedKeyword,
		sortTokens: queryState.sortTokens,
		appliedFilters: filters.appliedFilters,
		isFilterStateReady: filters.isFilterStateReady,
		includeSoftDeleted: false
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
	const displayError = queryErrorMessage != null ? {
		title: "Error",
		message: queryErrorMessage
	} : null;
	const detailTriggerColumnId = getEligibleDetailTriggerCreditApplicationAssignmentColumnId(columnPreferences.visibleColumns);
	const renderAssignmentActions = () => null;

	return (
		<>
			<DashboardManagementPageFrame
				title="Credit Application Assignment"
				description="View credit application assignment requests without edit or review actions."
			>
				<DashboardManagementToolbar
					keyword={queryState.keyword}
					onKeywordChange={queryState.setKeyword}
					searchPlaceholder="Search assignments by application or officer"
					filterCount={filters.appliedFilters.length}
					onToggleFilter={filters.toggleFilterPanel}
					onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
					isLoading={isLoading}
					isMutating={false}
				/>

				<CreditApplicationAssignmentRequestFilterCard
					isLoading={isLoading}
					isMutating={false}
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
					visibleColumnCount={columnPreferences.visibleColumns.length}
					includeActions={false}
					detailTriggerColumnId={detailTriggerColumnId}
					isLoading={isLoading}
					isMutating={false}
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
					isMutating={false}
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

			<EntrySummaryDrawer {...relationNavigation.summaryDrawerProps} />
		</>
	);
}
