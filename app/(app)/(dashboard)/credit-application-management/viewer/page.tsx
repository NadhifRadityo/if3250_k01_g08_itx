"use client";

import { useState } from "react";
import { CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";

import { DashboardManagementToolbar, DashboardManagementPageFrame, DashboardManagementPagination } from "../../layout.components";
import { EntrySummaryDrawer, useDashboardRelationNavigation } from "../../relation-navigation.components";
import * as creditApplicationActions from "../layout.actions";
import { CreditApplicationActiveFiltersSummary } from "../layout.components";
import { CreditApplicationColumnConfigCard } from "../layout.components";
import { CreditApplicationRequestDetailsDrawer } from "../layout.components";
import { CreditApplicationRequestChangePreviewDrawer } from "../layout.components";
import { CreditApplicationRequestFilterCard } from "../layout.components";
import { CreditApplicationRequestsTable } from "../layout.components";
import { getEligibleDetailTriggerCreditApplicationColumnId } from "../layout.components";
import { useCreditApplicationCellRenderer } from "../layout.components";
import { useCreditApplicationColumnPreferences } from "../layout.components";
import { useCreditApplicationFilterColumnConfig } from "../layout.components";
import { useCreditApplicationManagementQueryState } from "../layout.components";
import { useCreditApplicationRequestFilters } from "../layout.components";
import { useCreditApplicationRequestsQuery } from "../layout.components";
import { type CreditApplicationTableRow } from "../layout.components";

export default function CreditApplicationManagementViewerPage() {
	const [detailRow, setDetailRow] = useState<CreditApplicationTableRow | null>(null);
	const [requestChangeRow, setRequestChangeRow] = useState<CreditApplicationTableRow | null>(null);
	const relationNavigation = useDashboardRelationNavigation();
	const columnPreferences = useCreditApplicationColumnPreferences();
	const queryState = useCreditApplicationManagementQueryState();
	const { getResolvedFilterColumnConfig } = useCreditApplicationFilterColumnConfig();
	const filters = useCreditApplicationRequestFilters({ getResolvedFilterColumnConfig });

	const {
		pageIndex,
		setPageIndex,
		queryResult,
		isLoading,
		queryErrorMessage
	} = useCreditApplicationRequestsQuery({
		queryScope: "viewer",
		queryAction: creditApplicationActions.queryCreditApplicationsViewerAction,
		debouncedKeyword: queryState.debouncedKeyword,
		sortTokens: queryState.sortTokens,
		appliedFilters: filters.appliedFilters,
		isFilterStateReady: filters.isFilterStateReady,
		includeSoftDeleted: false
	});

	const renderCreditApplicationCell = useCreditApplicationCellRenderer({
		relations: queryResult.relations,
		onOpenRequestChanges: setRequestChangeRow,
		relationNavigation: {
			getHrefBase: relationNavigation.getTargetHrefBase,
			getImportHrefBase: relationNavigation.getImportTargetHrefBase,
			onRelationLinkClick: relationNavigation.onRelationLinkClick,
			onOpenSummary: relationNavigation.openSummary
		}
	});
	const displayError = queryErrorMessage != null ? {
		title: "Error",
		message: queryErrorMessage
	} : null;
	const detailTriggerColumnId = getEligibleDetailTriggerCreditApplicationColumnId(columnPreferences.visibleColumns);
	const rendercreditApplicationActions = () => null;

	return (
		<>
			<DashboardManagementPageFrame
				title="Credit Application Management"
				description="View approved and draft CreditApplication requests without edit or review actions."
			>
				<DashboardManagementToolbar
					keyword={queryState.keyword}
					onKeywordChange={queryState.setKeyword}
					searchPlaceholder="Search credit applications by name, email, or address"
					filterCount={filters.appliedFilters.length}
					onToggleFilter={filters.toggleFilterPanel}
					onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
					isLoading={isLoading}
					isMutating={false}
				/>

				<CreditApplicationRequestFilterCard
					isLoading={isLoading}
					isMutating={false}
					filters={filters}
					getResolvedFilterColumnConfig={getResolvedFilterColumnConfig}
				/>

				<CreditApplicationColumnConfigCard
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

				<CreditApplicationActiveFiltersSummary items={filters.filterSummaryItems} />

				{displayError != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>{displayError.title}</AlertTitle>
						<AlertDescription>{displayError.message}</AlertDescription>
					</Alert>
				) : null}

				<CreditApplicationRequestsTable
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
					renderCreditApplicationCell={renderCreditApplicationCell}
					renderActions={rendercreditApplicationActions}
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

			<CreditApplicationRequestDetailsDrawer
				open={detailRow != null}
				onOpenChange={open => {
					if(!open)
						setDetailRow(null);
				}}
				row={detailRow}
				renderActions={rendercreditApplicationActions}
				onOpenRequestChanges={setRequestChangeRow}
				relationNavigation={{
					getHrefBase: relationNavigation.getTargetHrefBase,
					getImportHrefBase: relationNavigation.getImportTargetHrefBase,
					onRelationLinkClick: relationNavigation.onRelationLinkClick,
					onOpenSummary: relationNavigation.openSummary
				}}
			/>

			<CreditApplicationRequestChangePreviewDrawer
				open={requestChangeRow != null}
				onOpenChange={open => {
					if(!open)
						setRequestChangeRow(null);
				}}
				row={requestChangeRow}
				relationNavigation={{
					getHrefBase: relationNavigation.getTargetHrefBase,
					getImportHrefBase: relationNavigation.getImportTargetHrefBase,
					onRelationLinkClick: relationNavigation.onRelationLinkClick,
					onOpenSummary: relationNavigation.openSummary
				}}
			/>

			<EntrySummaryDrawer {...relationNavigation.summaryDrawerProps} />
		</>
	);
}
