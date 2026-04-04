"use client";

import { useState } from "react";
import { CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";

import { DashboardManagementToolbar, DashboardManagementPageFrame, DashboardManagementPagination } from "../../layout.components";
import { EntrySummaryDrawer, useDashboardRelationNavigation } from "../../relation-navigation.components";
import * as roleActions from "../layout.actions";
import { RoleActiveFiltersSummary } from "../layout.components";
import { RoleColumnConfigCard } from "../layout.components";
import { RoleRequestDetailsDrawer } from "../layout.components";
import { RoleRequestChangePreviewDrawer } from "../layout.components";
import { RoleRequestFilterCard } from "../layout.components";
import { RoleRequestsTable } from "../layout.components";
import { getEligibleDetailTriggerRoleColumnId } from "../layout.components";
import { useRoleCellRenderer } from "../layout.components";
import { useRoleColumnPreferences } from "../layout.components";
import { useRoleFilterColumnConfig } from "../layout.components";
import { useRoleManagementQueryState } from "../layout.components";
import { useRoleRelations } from "../layout.components";
import { useRoleRequestFilters } from "../layout.components";
import { useRoleRequestsQuery } from "../layout.components";
import { type RoleTableRow } from "../layout.components";

export default function RoleManagementViewerPage() {
	const [detailRow, setDetailRow] = useState<RoleTableRow | null>(null);
	const [requestChangeRow, setRequestChangeRow] = useState<RoleTableRow | null>(null);
	const relationNavigation = useDashboardRelationNavigation();
	const columnPreferences = useRoleColumnPreferences();
	const queryState = useRoleManagementQueryState();
	const { getResolvedFilterColumnConfig } = useRoleFilterColumnConfig();
	const filters = useRoleRequestFilters({ getResolvedFilterColumnConfig });

	const {
		pageIndex,
		setPageIndex,
		queryResult,
		isLoading,
		queryErrorMessage
	} = useRoleRequestsQuery({
		queryScope: "viewer",
		queryAction: roleActions.queryRolesViewerAction,
		debouncedKeyword: queryState.debouncedKeyword,
		sortTokens: queryState.sortTokens,
		appliedFilters: filters.appliedFilters,
		isFilterStateReady: filters.isFilterStateReady,
		includeSoftDeleted: false
	});

	const {
		relationValuesByRowId,
		isRelationLoading
	} = useRoleRelations({
		docs: queryResult.docs,
		visibleColumns: columnPreferences.visibleColumns
	});
	const renderRoleCell = useRoleCellRenderer({
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
	const detailTriggerColumnId = getEligibleDetailTriggerRoleColumnId(columnPreferences.visibleColumns);
	const renderRoleActions = () => null;

	return (
		<>
			<DashboardManagementPageFrame
				title="Role Management"
				description="View approved and draft role requests without edit or review actions."
			>
				<DashboardManagementToolbar
					keyword={queryState.keyword}
					onKeywordChange={queryState.setKeyword}
					searchPlaceholder="Search roles by name, level, or menu"
					filterCount={filters.appliedFilters.length}
					onToggleFilter={filters.toggleFilterPanel}
					onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
					isLoading={isLoading}
					isMutating={false}
				/>

				<RoleRequestFilterCard
					isLoading={isLoading}
					isMutating={false}
					filters={filters}
					getResolvedFilterColumnConfig={getResolvedFilterColumnConfig}
				/>

				<RoleColumnConfigCard
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

				<RoleActiveFiltersSummary items={filters.filterSummaryItems} />

				{displayError != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>{displayError.title}</AlertTitle>
						<AlertDescription>{displayError.message}</AlertDescription>
					</Alert>
				) : null}

				<RoleRequestsTable
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
					renderRoleCell={renderRoleCell}
					renderActions={renderRoleActions}
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

			<RoleRequestDetailsDrawer
				open={detailRow != null}
				onOpenChange={open => {
					if(!open)
						setDetailRow(null);
				}}
				row={detailRow}
				renderActions={renderRoleActions}
				onOpenRequestChanges={setRequestChangeRow}
				relationNavigation={{
					getHrefBase: relationNavigation.getTargetHrefBase,
					onRelationLinkClick: relationNavigation.onRelationLinkClick,
					onOpenSummary: relationNavigation.openSummary
				}}
			/>

			<RoleRequestChangePreviewDrawer
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
