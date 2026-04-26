"use client";

import { useState } from "react";
import { CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";

import { DashboardManagementToolbar, DashboardManagementPageFrame, DashboardManagementPagination } from "../../layout.components";
import { EntrySummaryDrawer, useDashboardRelationNavigation } from "../../relation-navigation.components";
import * as surveyActions from "../layout.actions";
import { SurveyActiveFiltersSummary } from "../layout.components";
import { SurveyColumnConfigCard } from "../layout.components";
import { SurveyRequestDetailsDrawer } from "../layout.components";
import { SurveyRequestChangePreviewDrawer } from "../layout.components";
import { SurveyRequestFilterCard } from "../layout.components";
import { SurveyRequestsTable } from "../layout.components";
import { getEligibleDetailTriggerSurveyColumnId } from "../layout.components";
import { useSurveyCellRenderer } from "../layout.components";
import { useSurveyColumnPreferences } from "../layout.components";
import { useSurveyFilterColumnConfig } from "../layout.components";
import { useSurveyManagementQueryState } from "../layout.components";
import { useSurveyRelations } from "../layout.components";
import { useSurveyRequestFilters } from "../layout.components";
import { useSurveyRequestsQuery } from "../layout.components";
import { type SurveyTableRow } from "../layout.components";

export default function SurveyManagementViewerPage() {
	const [detailRow, setDetailRow] = useState<SurveyTableRow | null>(null);
	const [requestChangeRow, setRequestChangeRow] = useState<SurveyTableRow | null>(null);
	const relationNavigation = useDashboardRelationNavigation();
	const columnPreferences = useSurveyColumnPreferences();
	const queryState = useSurveyManagementQueryState();
	const { getResolvedFilterColumnConfig } = useSurveyFilterColumnConfig();
	const filters = useSurveyRequestFilters({ getResolvedFilterColumnConfig });

	const {
		pageIndex,
		setPageIndex,
		queryResult,
		isLoading,
		queryErrorMessage
	} = useSurveyRequestsQuery({
		queryScope: "viewer",
		queryAction: surveyActions.querySurveysViewerAction,
		debouncedKeyword: queryState.debouncedKeyword,
		sortTokens: queryState.sortTokens,
		appliedFilters: filters.appliedFilters,
		isFilterStateReady: filters.isFilterStateReady,
		includeSoftDeleted: false
	});

	const {
		relationValuesByRowId,
		isRelationLoading
	} = useSurveyRelations({
		docs: queryResult.docs,
		visibleColumns: columnPreferences.visibleColumns
	});
	const renderSurveyCell = useSurveyCellRenderer({
		relationValuesByRowId,
		isRelationLoading,
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
	const detailTriggerColumnId = getEligibleDetailTriggerSurveyColumnId(columnPreferences.visibleColumns);
	const renderSurveyActions = () => null;

	return (
		<>
			<DashboardManagementPageFrame
				title="Satisfaction Survey Management"
				description="View approved and draft satisfaction survey requests without edit or review actions."
			>
				<DashboardManagementToolbar
					keyword={queryState.keyword}
					onKeywordChange={queryState.setKeyword}
					searchPlaceholder="Search satisfaction surveys by title or ID"
					filterCount={filters.appliedFilters.length}
					onToggleFilter={filters.toggleFilterPanel}
					onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
					isLoading={isLoading}
					isMutating={false}
				/>

				<SurveyRequestFilterCard
					isLoading={isLoading}
					isMutating={false}
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
					visibleColumnCount={columnPreferences.visibleColumns.length}
					includeActions={false}
					detailTriggerColumnId={detailTriggerColumnId}
					isLoading={isLoading}
					isMutating={false}
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
					isMutating={false}
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

			<EntrySummaryDrawer {...relationNavigation.summaryDrawerProps} />
		</>
	);
}
