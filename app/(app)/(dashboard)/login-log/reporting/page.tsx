"use client";

import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOutIcon, CircleAlertIcon } from "lucide-react";

import { uwsa } from "@/utils/actions";
import { getRelationshipId } from "@/utils/payload";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";

import { MenuPage, MenuToolbar, MenuPagination, MenuFilterState, useConfigStorage, MenuFilterSummary, DashboardMenuTable, MenuColumnConfigCard, MenuFilterConfigCard, useMenuRowValueRenderer } from "../../layout.components";
import { RelationNavigationProvider, relationNavigationFilterConfigProvider } from "../../relation-navigation.components";
import { forceLogoutAction, queryReportingAction } from "../layout.actions";
import { ColumnData, DetailsDrawer, ForceLogoutDialog, defaultColumnOrder, defaultColumnsSort, tableConfigColumns, columnConfigColumns, defaultColumnsShown, filterConfigColumns, eligibleDetailsTriggerColumns, rowValueRendererConfigColumns } from "../layout.components";

const columnConfigColumnsWithActions = Object.freeze([
	...columnConfigColumns,
	{ key: "#actions", label: "Actions" }
]);
const tableConfigColumnsWithActions = Object.freeze([
	...tableConfigColumns,
	{ key: "#actions", label: "Actions", sortable: false, className: "flex flex-wrap gap-2" }
]);
const rowValueRendererConfigColumnsWithActions = Object.freeze([
	...rowValueRendererConfigColumns,
	{ key: "#actions", type: "null", render: (_, row, { isMutating, setForceLogoutTargetRow }) => (
		<>
			{row._sessionActive == true ? (
				<Button type="button" size="sm" variant="destructive" onClick={() => setForceLogoutTargetRow!(row)} disabled={isMutating}>
					<LogOutIcon />
					Force Logout
				</Button>
			) : null}
		</>
	) } satisfies (typeof rowValueRendererConfigColumns)[number]
]);
const defaultColumnOrderWithActions = Object.freeze([
	...defaultColumnOrder,
	"#actions"
]) as string[];
const defaultColumnsShownWithActions = Object.freeze([
	...defaultColumnsShown,
	"#actions"
]) as string[];

export default function Page() {
	const queryClient = useQueryClient();
	const [keyword, setKeyword] = useState("");
	const [columnOrder, setColumnOrder] = useConfigStorage({ localStorageKey: "login-log.column-order", updateIfThisSearhParamExists: "columnOrder", defaultValue: defaultColumnOrderWithActions });
	const [columnsShown, setColumnsShown] = useConfigStorage({ localStorageKey: "login-log.columns-shown", updateIfThisSearhParamExists: "columnsShown", defaultValue: defaultColumnsShownWithActions });
	const [columnConfigCardOpen, setColumnConfigCardOpen] = useState(false);
	const [filters, setFilters] = useConfigStorage({ localStorageKey: "login-log.filters", customConfigProvider: relationNavigationFilterConfigProvider("login-logs"), updateIfThisSearhParamExists: "filters", defaultValue: [] as MenuFilterState[] });
	const [filterConfigCardOpen, setFilterConfigCardOpen] = useState(filters.length > 0);
	const [columnsSort, setColumnsSort] = useConfigStorage<[string, boolean][]>({ localStorageKey: "login-log.columns-sort", updateIfThisSearhParamExists: "columnsSort", defaultValue: defaultColumnsSort });
	const [pageIndex, setPageIndex] = useState(1);
	const query = useQuery({
		queryKey: ["login-log", "reporting", {
			keyword,
			filters,
			columnsSort,
			pageIndex
		}],
		queryFn: async () => await uwsa(queryReportingAction)({
			keyword: keyword,
			filters: filters,
			columnsSort: columnsSort,
			pageIndex: pageIndex
		})
	});
	const [detailsDrawerRow, setDetailsDrawerRow] = useState(null as ColumnData | null);
	const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
	const [forceLogoutTargetRow, setForceLogoutTargetRow] = useState(null as ColumnData | null);
	const [isMutating, startMutationTransition] = useTransition();
	const [genericMutationError, setGenericMutationError] = useState(null as any);
	const rowValueRendererContext = {
		relationValues: query.data?.relations,
		isMutating: isMutating,
		setForceLogoutTargetRow: setForceLogoutTargetRow
	};
	const renderCell = useMenuRowValueRenderer({
		columns: rowValueRendererConfigColumnsWithActions,
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
			title="Login Log Reporting"
			description="View login log entries through the reporting mode."
		>
			<RelationNavigationProvider>
				<MenuToolbar
					keyword={keyword}
					onKeywordChange={setKeyword}
					searchPlaceholder="Search logs by user, IP address, event, or outcome"
					filterCount={filters.length}
					onToggleFilter={() => setFilterConfigCardOpen(!filterConfigCardOpen)}
					onToggleColumns={() => setColumnConfigCardOpen(!columnConfigCardOpen)}
					isLoading={query.isLoading}
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
					columns={columnConfigColumnsWithActions}
					columnOrder={columnOrder}
					onColumnOrderChange={setColumnOrder}
					columnsShown={columnsShown}
					onColumnsShownChange={setColumnsShown}
					defaultColumnOrder={defaultColumnOrderWithActions}
					defaultColumnsShown={defaultColumnsShownWithActions}
				/>
				<MenuFilterSummary columns={filterConfigColumns} filters={filters} />
				{query.error != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>{`${query.error?.name ?? "Error"}`}</AlertTitle>
						<AlertDescription>{`${query.error?.message ?? "An error occured while querying data."}`}</AlertDescription>
					</Alert>
				) : null}
				{genericMutationError != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>{`${genericMutationError?.name ?? "Error"}`}</AlertTitle>
						<AlertDescription>{`${genericMutationError?.message ?? "An error occured while querying data."}`}</AlertDescription>
					</Alert>
				) : null}
				<DashboardMenuTable
					columns={tableConfigColumnsWithActions}
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
					renderActions={r => renderCell(r, "#actions")}
				/>
				<ForceLogoutDialog
					open={forceLogoutTargetRow != null}
					onOpenChange={v => { if(v) return; setForceLogoutTargetRow(null); }}
					isMutating={isMutating}
					onConfirm={() => startMutationTransition(async () => {
						setGenericMutationError(null);
						try {
							await uwsa(forceLogoutAction)({
								userId: getRelationshipId(forceLogoutTargetRow!.user)!,
								sessionId: forceLogoutTargetRow!.sessionId!
							});
						} catch(error) {
							setGenericMutationError(error);
						} finally {
							setForceLogoutTargetRow(null);
							await queryClient.invalidateQueries({ queryKey: ["login-log"] });
						}
					})}
				/>
			</RelationNavigationProvider>
		</MenuPage>
	);
}
