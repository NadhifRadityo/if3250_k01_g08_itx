"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";

import { uwsa } from "@/utils/actions";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Switch } from "@/components/radix/Switch";

import { MenuPage, MenuToolbar, MenuPagination, MenuFilterState, useConfigStorage, MenuFilterSummary, DashboardMenuTable, useDashboardContext, MenuColumnConfigCard, MenuFilterConfigCard, useMenuRowValueRenderer } from "../../layout.components";
import { RelationNavigationProvider, relationNavigationFilterConfigProvider } from "../../relation-navigation.components";
import { queryViewerAction } from "../layout.actions";
import { ColumnData, DetailsDrawer, HistoryDrawer, defaultColumnOrder, defaultColumnsSort, tableConfigColumns, ChangeRequestDrawer, columnConfigColumns, defaultColumnsShown, filterConfigColumns, eligibleDetailsTriggerColumns, rowValueRendererConfigColumns } from "../layout.components";

export default function Page() {
	const { user } = useDashboardContext();
	const [keyword, setKeyword] = useState("");
	const [columnOrder, setColumnOrder] = useConfigStorage({ localStorageKey: "role-management.column-order", updateIfThisSearhParamExists: "columnOrder", defaultValue: defaultColumnOrder });
	const [columnsShown, setColumnsShown] = useConfigStorage({ localStorageKey: "role-management.columns-shown", updateIfThisSearhParamExists: "columnsShown", defaultValue: defaultColumnsShown });
	const [columnConfigCardOpen, setColumnConfigCardOpen] = useState(false);
	const [filters, setFilters] = useConfigStorage({ localStorageKey: "role-management.filters", customConfigProvider: relationNavigationFilterConfigProvider("roles"), updateIfThisSearhParamExists: "filters", defaultValue: [] as MenuFilterState[] });
	const [filterConfigCardOpen, setFilterConfigCardOpen] = useState(filters.length > 0);
	const [includeDeleted, setIncludeDeleted] = useConfigStorage({ localStorageKey: "role-management.include-deleted", updateIfThisSearhParamExists: "includeDeleted", defaultValue: false });
	const [columnsSort, setColumnsSort] = useConfigStorage<[string, boolean][]>({ localStorageKey: "role-management.columns-sort", updateIfThisSearhParamExists: "columnsSort", defaultValue: defaultColumnsSort });
	const [pageIndex, setPageIndex] = useState(1);
	const query = useQuery({
		queryKey: ["role-management", "viewer", {
			keyword,
			filters,
			columnsSort,
			includeDeleted,
			pageIndex
		}],
		queryFn: async () => await uwsa(queryViewerAction)({
			keyword: keyword,
			filters: filters,
			columnsSort: columnsSort,
			includeDeleted: includeDeleted,
			pageIndex: pageIndex
		})
	});
	const [detailsDrawerRow, setDetailsDrawerRow] = useState(null as ColumnData | null);
	const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
	const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
	const [changeRequestDrawerRow, setChangeRequestDrawerRow] = useState(null as ColumnData | null);
	const [changeRequestDrawerOpen, setChangeRequestDrawerOpen] = useState(false);
	const rowValueRendererContext = {
		relationValues: query.data?.relations,
		setChangeRequestDrawerRow: setChangeRequestDrawerRow,
		setChangeRequestDrawerOpen: setChangeRequestDrawerOpen
	};
	const renderCell = useMenuRowValueRenderer({
		columns: rowValueRendererConfigColumns,
		context: {
			...rowValueRendererContext,
			richTextCard: false,
			richTextClamp: true
		},
		detailsTriggerColumnKey: columnOrder.filter(columnKey => columnsShown.includes(columnKey))
			.find(columnKey => eligibleDetailsTriggerColumns.includes(columnKey)),
		onOpenDetails: row => {
			setDetailsDrawerOpen(true);
			setDetailsDrawerRow(row);
		}
	});

	return (
		<MenuPage
			title="Role Management"
			description="View approved and draft role requests without edit or review actions."
		>
			<RelationNavigationProvider>
				<MenuToolbar
					keyword={keyword}
					onKeywordChange={setKeyword}
					searchPlaceholder="Search roles by name, level, or menu"
					filterCount={filters.length}
					onToggleFilter={() => setFilterConfigCardOpen(!filterConfigCardOpen)}
					onToggleColumns={() => setColumnConfigCardOpen(!columnConfigCardOpen)}
					isLoading={query.isLoading}
					rightSlot={user.roleMenus.includes("role-management#auditor") ? (
						<div className="flex items-center gap-2">
							<label htmlFor="user-management-viewer-show-deleted" className="text-sm">
								Show Deleted
							</label>
							<Switch
								id="user-management-viewer-show-deleted"
								checked={includeDeleted}
								onCheckedChange={setIncludeDeleted}
								disabled={query.isLoading}
							/>
						</div>
					) : null}
				/>
				<MenuFilterConfigCard
					open={filterConfigCardOpen}
					onOpenChange={setFilterConfigCardOpen}
					columns={filterConfigColumns}
					filters={filters}
					onFiltersChange={setFilters}
					disabled={query.isLoading}
				/>
				<MenuColumnConfigCard
					open={columnConfigCardOpen}
					onOpenChange={setColumnConfigCardOpen}
					columns={columnConfigColumns}
					columnOrder={columnOrder}
					onColumnOrderChange={setColumnOrder}
					columnsShown={columnsShown}
					onColumnsShownChange={setColumnsShown}
					defaultColumnOrder={defaultColumnOrder}
					defaultColumnsShown={defaultColumnsShown}
				/>
				<MenuFilterSummary columns={filterConfigColumns} filters={filters} />
				{query.error != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>{`${query.error?.name ?? "Error"}`}</AlertTitle>
						<AlertDescription>{`${query.error?.message ?? "An error occured while querying data."}`}</AlertDescription>
					</Alert>
				) : null}
				<DashboardMenuTable
					columns={tableConfigColumns}
					columnsSort={columnsSort}
					onColumnsSortChange={setColumnsSort}
					columnOrder={columnOrder}
					columnsShown={columnsShown}
					rows={query.data?.docs ?? []}
					renderCell={renderCell}
					isLoading={query.isLoading}
				/>
				<MenuPagination
					pageIndex={pageIndex}
					totalRequests={query.data?.totalDocs ?? 0}
					hasPreviousPage={query.data?.hasPrevPage ?? false}
					hasNextPage={query.data?.hasNextPage ?? false}
					isLoading={query.isLoading}
					isMutating={false}
					onPrevious={() => setPageIndex(previous => Math.max(previous - 1, 1))}
					onNext={() => setPageIndex(previous => previous + 1)}
				/>
				<DetailsDrawer
					open={detailsDrawerOpen}
					onOpenChange={setDetailsDrawerOpen}
					row={detailsDrawerRow}
					rowValueRendererContext={rowValueRendererContext}
					onOpenHistory={() => setHistoryDrawerOpen(true)}
				/>
				<HistoryDrawer
					open={historyDrawerOpen}
					onOpenChange={setHistoryDrawerOpen}
					row={detailsDrawerRow}
					rowValueRendererContext={rowValueRendererContext}
				/>
				<ChangeRequestDrawer
					open={changeRequestDrawerOpen}
					onOpenChange={setChangeRequestDrawerOpen}
					row={changeRequestDrawerRow}
					rowValueRendererContext={rowValueRendererContext}
				/>
			</RelationNavigationProvider>
		</MenuPage>
	);
}
