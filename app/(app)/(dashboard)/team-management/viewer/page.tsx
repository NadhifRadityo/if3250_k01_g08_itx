"use client";

import { CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";

import { DashboardManagementToolbar, DashboardManagementPageFrame, DashboardManagementPagination } from "../../layout.components";
import { EntrySummaryDrawer, useDashboardRelationNavigation } from "../../relation-navigation.components";
import * as teamActions from "../layout.actions";
import { TeamActiveFiltersSummary } from "../layout.components";
import { TeamColumnConfigCard } from "../layout.components";
import { TeamRequestFilterCard } from "../layout.components";
import { TeamRequestsTable } from "../layout.components";
import { useTeamCellRenderer } from "../layout.components";
import { useTeamColumnPreferences } from "../layout.components";
import { useTeamFilterColumnConfig } from "../layout.components";
import { useTeamManagementQueryState } from "../layout.components";
import { useTeamRelations } from "../layout.components";
import { useTeamRequestFilters } from "../layout.components";
import { useTeamRequestsQuery } from "../layout.components";

export default function TeamManagementViewerPage() {
	const relationNavigation = useDashboardRelationNavigation();
	const columnPreferences = useTeamColumnPreferences();
	const queryState = useTeamManagementQueryState();
	const { getResolvedFilterColumnConfig } = useTeamFilterColumnConfig();
	const filters = useTeamRequestFilters({ getResolvedFilterColumnConfig });

	const {
		pageIndex,
		setPageIndex,
		queryResult,
		isLoading,
		queryErrorMessage
	} = useTeamRequestsQuery({
		queryScope: "viewer",
		queryAction: teamActions.queryTeamsViewerAction,
		debouncedKeyword: queryState.debouncedKeyword,
		sortTokens: queryState.sortTokens,
		appliedFilters: filters.appliedFilters,
		isFilterStateReady: filters.isFilterStateReady,
		includeSoftDeleted: false
	});
	const {
		relationValuesByRowId,
		isRelationLoading
	} = useTeamRelations({
		docs: queryResult.docs,
		visibleColumns: columnPreferences.visibleColumns
	});
	const renderTeamCell = useTeamCellRenderer({
		relationValuesByRowId,
		isRelationLoading,
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

	return (
		<>
			<DashboardManagementPageFrame
				title="Team Management"
				description="View team structure requests without edit or review actions."
			>
				<DashboardManagementToolbar
					keyword={queryState.keyword}
					onKeywordChange={queryState.setKeyword}
					searchPlaceholder="Search teams by team name, supervisor, or officer"
					filterCount={filters.appliedFilters.length}
					onToggleFilter={filters.toggleFilterPanel}
					onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
					isLoading={isLoading}
					isMutating={false}
				/>

				<TeamRequestFilterCard
					isLoading={isLoading}
					isMutating={false}
					filters={filters}
					getResolvedFilterColumnConfig={getResolvedFilterColumnConfig}
				/>

				<TeamColumnConfigCard
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

				<TeamActiveFiltersSummary items={filters.filterSummaryItems} />

				{displayError != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>{displayError.title}</AlertTitle>
						<AlertDescription>{displayError.message}</AlertDescription>
					</Alert>
				) : null}

				<TeamRequestsTable
					queryResult={queryResult}
					visibleColumns={columnPreferences.visibleColumns}
					visibleColumnCount={columnPreferences.visibleColumns.length + 1}
					isLoading={isLoading}
					isMutating={false}
					getSortDirection={queryState.getSortDirection}
					onToggleSortField={queryState.toggleSortField}
					renderTeamCell={renderTeamCell}
					renderActions={() => <span className="text-muted-foreground text-sm">-</span>}
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

			{renderTeamCell.relationSummaryPickerDrawer}

			<EntrySummaryDrawer {...relationNavigation.summaryDrawerProps} />
		</>
	);
}
