"use client";

import { CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";

import { DashboardManagementToolbar, DashboardManagementPageFrame, DashboardManagementPagination } from "../../layout.components";
import * as userActions from "../layout.actions";
import { UserActiveFiltersSummary } from "../layout.components";
import { UserColumnConfigCard } from "../layout.components";
import { UserRequestFilterCard } from "../layout.components";
import { UserRequestsTable } from "../layout.components";
import { useUserCellRenderer } from "../layout.components";
import { useUserColumnPreferences } from "../layout.components";
import { useUserFilterColumnConfig } from "../layout.components";
import { useUserManagementQueryState } from "../layout.components";
import { useUserRelations } from "../layout.components";
import { useUserRequestFilters } from "../layout.components";
import { useUserRequestsQuery } from "../layout.components";

export default function UserManagementViewerPage() {
	const columnPreferences = useUserColumnPreferences();
	const queryState = useUserManagementQueryState();
	const { getResolvedFilterColumnConfig } = useUserFilterColumnConfig();
	const filters = useUserRequestFilters({ getResolvedFilterColumnConfig });

	const {
		pageIndex,
		setPageIndex,
		queryResult,
		isLoading,
		queryErrorMessage
	} = useUserRequestsQuery({
		queryScope: "viewer",
		queryAction: userActions.queryStagedUsersViewerAction,
		debouncedKeyword: queryState.debouncedKeyword,
		sortTokens: queryState.sortTokens,
		appliedFilters: filters.appliedFilters,
		includeSoftDeleted: false
	});
	const {
		relationValuesByRowId,
		isRelationLoading
	} = useUserRelations({
		docs: queryResult.docs,
		visibleColumns: columnPreferences.visibleColumns
	});
	const renderUserCell = useUserCellRenderer({ relationValuesByRowId, isRelationLoading });
	const displayError = queryErrorMessage != null ? {
		title: "Error",
		message: queryErrorMessage
	} : null;

	return (
		<DashboardManagementPageFrame
			title="User Management"
			description="View staged user requests without edit or review actions."
		>
			<DashboardManagementToolbar
				keyword={queryState.keyword}
				onKeywordChange={queryState.setKeyword}
				searchPlaceholder="Search staged users by name, email, or employee ID"
				filterCount={filters.appliedFilters.length}
				onToggleFilter={filters.toggleFilterPanel}
				onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
				isLoading={isLoading}
				isMutating={false}
			/>

			<UserRequestFilterCard
				isLoading={isLoading}
				isMutating={false}
				filters={filters}
				getResolvedFilterColumnConfig={getResolvedFilterColumnConfig}
			/>

			<UserColumnConfigCard
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

			<UserActiveFiltersSummary items={filters.filterSummaryItems} />

			{displayError != null ? (
				<Alert variant="destructive">
					<CircleAlertIcon />
					<AlertTitle>{displayError.title}</AlertTitle>
					<AlertDescription>{displayError.message}</AlertDescription>
				</Alert>
			) : null}

			<UserRequestsTable
				queryResult={queryResult}
				visibleColumns={columnPreferences.visibleColumns}
				visibleColumnCount={columnPreferences.visibleColumns.length + 1}
				isLoading={isLoading}
				isMutating={false}
				getSortDirection={queryState.getSortDirection}
				onToggleSortField={queryState.toggleSortField}
				renderUserCell={renderUserCell}
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
	);
}
