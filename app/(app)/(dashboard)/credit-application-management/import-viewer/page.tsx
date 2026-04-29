"use client";

import { useState } from "react";
import { CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";

import { DashboardManagementToolbar, DashboardManagementPageFrame, DashboardManagementPagination } from "../../layout.components";
import { EntrySummaryDrawer, useDashboardRelationNavigation } from "../../relation-navigation.components";
import * as importActions from "../import.actions";
import {
	CreditApplicationImportRequestsTable,
	useCreditApplicationImportCellRenderer,
	CreditApplicationImportColumnConfigCard,
	useCreditApplicationImportRequestsQuery,
	CreditApplicationImportRequestFilterCard,
	useCreditApplicationImportRequestFilters,
	CreditApplicationImportActiveFiltersSummary,
	CreditApplicationImportRequestDetailsDrawer,
	useCreditApplicationImportColumnPreferences,
	useCreditApplicationImportFilterColumnConfig,
	useCreditApplicationImportManagementQueryState,
	getEligibleDetailTriggerCreditApplicationImportColumnId,
	type CreditApplicationImportTableRow
} from "../import.components";

export default function CreditApplicationImportViewerPage() {
	const [detailRow, setDetailRow] = useState<CreditApplicationImportTableRow | null>(null);
	const relationNavigation = useDashboardRelationNavigation();
	const columnPreferences = useCreditApplicationImportColumnPreferences();
	const queryState = useCreditApplicationImportManagementQueryState();
	const { getResolvedFilterColumnConfig } = useCreditApplicationImportFilterColumnConfig();
	const filters = useCreditApplicationImportRequestFilters({ getResolvedFilterColumnConfig });

	const {
		pageIndex,
		setPageIndex,
		queryResult,
		isLoading,
		queryErrorMessage
	} = useCreditApplicationImportRequestsQuery({
		queryScope: "import-viewer",
		queryAction: importActions.queryCreditApplicationImportViewerAction,
		debouncedKeyword: queryState.debouncedKeyword,
		sortTokens: queryState.sortTokens,
		appliedFilters: filters.appliedFilters,
		isFilterStateReady: filters.isFilterStateReady,
		includeSoftDeleted: false
	});

	const renderCreditApplicationImportCell = useCreditApplicationImportCellRenderer({
		relations: queryResult.relations,
		relationNavigation: {
			getHrefBase: relationNavigation.getTargetHrefBase,
			onRelationLinkClick: relationNavigation.onRelationLinkClick,
			onOpenSummary: relationNavigation.openSummary
		}
	});

	const detailTriggerColumnId = getEligibleDetailTriggerCreditApplicationImportColumnId(columnPreferences.visibleColumns);
	const displayError = queryErrorMessage != null ? {
		title: "Error",
		message: queryErrorMessage
	} : null;
	const renderCreditApplicationImportActions = () => null;

	return (
		<>
			<DashboardManagementPageFrame
				title="Credit Application Import"
				description="Read-only access for uploaded import files and review outcomes."
			>
				<DashboardManagementToolbar
					keyword={queryState.keyword}
					onKeywordChange={queryState.setKeyword}
					searchPlaceholder="Search imports by filename, id, or MIME type"
					filterCount={filters.appliedFilters.length}
					onToggleFilter={filters.toggleFilterPanel}
					onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
					isLoading={isLoading}
					isMutating={false}
				/>

				<CreditApplicationImportRequestFilterCard
					isLoading={isLoading}
					isMutating={false}
					filters={filters}
					getResolvedFilterColumnConfig={getResolvedFilterColumnConfig}
				/>

				<CreditApplicationImportColumnConfigCard
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

				<CreditApplicationImportActiveFiltersSummary items={filters.filterSummaryItems} />

				{displayError != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>{displayError.title}</AlertTitle>
						<AlertDescription>{displayError.message}</AlertDescription>
					</Alert>
				) : null}

				<CreditApplicationImportRequestsTable
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
					renderCreditApplicationImportCell={renderCreditApplicationImportCell}
					renderActions={renderCreditApplicationImportActions}
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

			<CreditApplicationImportRequestDetailsDrawer
				open={detailRow != null}
				onOpenChange={open => {
					if(!open)
						setDetailRow(null);
				}}
				row={detailRow}
				renderActions={renderCreditApplicationImportActions}
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
