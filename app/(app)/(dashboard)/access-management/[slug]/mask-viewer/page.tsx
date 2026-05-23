"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Switch } from "@/components/radix/Switch";

import { MenuPage, MenuToolbar, MenuPagination, MenuFilterState, useConfigStorage, MenuFilterSummary, DashboardMenuTable, useDashboardContext, MenuColumnConfigCard, MenuFilterConfigCard, useMenuRowValueRenderer } from "../../../layout.components";
import { RelationNavigationProvider } from "../../../relation-navigation.components";
import { queryMaskViewerAction } from "../mask.actions";
import { MaskColumnData, MaskDetailsDrawer, MaskHistoryDrawer, MaskChangeRequestDrawer, buildFilterConfigColumns, buildColumnConfigColumns, buildTableConfigColumns, buildRowValueRendererConfigColumns, buildEligibleDetailsTriggerColumns, buildDefaultColumnOrder, buildDefaultColumnsShown, buildDefaultColumnsSort } from "../mask.components";
import { menuMaskFields, tabMenuKeys } from "../../layout.shared";

export default function Page() {
	const { slug } = useParams<{ slug: string }>();
	const { user } = useDashboardContext();
	const maskFields = menuMaskFields[slug as typeof tabMenuKeys[number]];
	const filterConfigColumns = useMemo(() => buildFilterConfigColumns(maskFields), [maskFields]);
	const columnConfigColumns = useMemo(() => buildColumnConfigColumns(maskFields), [maskFields]);
	const tableConfigColumns = useMemo(() => buildTableConfigColumns(maskFields), [maskFields]);
	const rowValueRendererConfigColumns = useMemo(() => buildRowValueRendererConfigColumns(maskFields), [maskFields]);
	const eligibleDetailsTriggerColumns = useMemo(() => buildEligibleDetailsTriggerColumns(maskFields), [maskFields]);
	const defaultColumnOrder = useMemo(() => buildDefaultColumnOrder(maskFields), [maskFields]);
	const defaultColumnsShown = useMemo(() => buildDefaultColumnsShown(maskFields), [maskFields]);
	const defaultColumnsSort = useMemo(() => buildDefaultColumnsSort(maskFields), [maskFields]);
	const [keyword, setKeyword] = useState("");
	const [columnOrder, setColumnOrder] = useConfigStorage({ localStorageKey: `access-management.${slug}.mask.column-order`, updateIfThisSearhParamExists: "columnOrder", defaultValue: defaultColumnOrder });
	const [columnsShown, setColumnsShown] = useConfigStorage({ localStorageKey: `access-management.${slug}.mask.columns-shown`, updateIfThisSearhParamExists: "columnsShown", defaultValue: defaultColumnsShown });
	const [columnConfigCardOpen, setColumnConfigCardOpen] = useState(false);
	const [filters, setFilters] = useConfigStorage({ localStorageKey: `access-management.${slug}.mask.filters`, updateIfThisSearhParamExists: "filters", defaultValue: [] as MenuFilterState[] });
	const [filterConfigCardOpen, setFilterConfigCardOpen] = useState(filters.length > 0);
	const [includeDeleted, setIncludeDeleted] = useConfigStorage({ localStorageKey: `access-management.${slug}.mask.include-deleted`, updateIfThisSearhParamExists: "includeDeleted", defaultValue: false });
	const [columnsSort, setColumnsSort] = useConfigStorage<[string, boolean][]>({ localStorageKey: `access-management.${slug}.mask.columns-sort`, updateIfThisSearhParamExists: "columnsSort", defaultValue: defaultColumnsSort });
	const [pageIndex, setPageIndex] = useState(1);
	const query = useQuery({
		queryKey: ["access-management", slug, "mask-viewer", {
			keyword,
			filters,
			columnsSort,
			includeDeleted,
			pageIndex
		}],
		queryFn: async () => await queryMaskViewerAction({
			slug: slug,
			keyword: keyword,
			filters: filters,
			columnsSort: columnsSort,
			includeDeleted: includeDeleted,
			pageIndex: pageIndex
		})
	});
	const [detailsDrawerRow, setDetailsDrawerRow] = useState(null as MaskColumnData | null);
	const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
	const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
	const [changeRequestDrawerRow, setChangeRequestDrawerRow] = useState(null as MaskColumnData | null);
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
			richTextClamp: false
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
			title="Access Management — Masks"
			description="View approved and draft mask requests without edit or review actions."
		>
			<RelationNavigationProvider>
				<MenuToolbar
					keyword={keyword}
					onKeywordChange={setKeyword}
					searchPlaceholder="Search masks by name"
					filterCount={filters.length}
					onToggleFilter={() => setFilterConfigCardOpen(!filterConfigCardOpen)}
					onToggleColumns={() => setColumnConfigCardOpen(!columnConfigCardOpen)}
					isLoading={query.isLoading}
					rightSlot={user.roleMenus.includes("access-management#mask-auditor") ? (
						<div className="flex items-center gap-2">
							<label htmlFor="access-management-mask-viewer-show-deleted" className="text-sm">
								Show Deleted
							</label>
							<Switch
								id="access-management-mask-viewer-show-deleted"
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
				<MaskDetailsDrawer
					slug={slug}
					maskFields={maskFields}
					open={detailsDrawerOpen}
					onOpenChange={setDetailsDrawerOpen}
					row={detailsDrawerRow}
					rowValueRendererContext={rowValueRendererContext}
					onOpenHistory={() => setHistoryDrawerOpen(true)}
				/>
				<MaskHistoryDrawer
					slug={slug}
					maskFields={maskFields}
					open={historyDrawerOpen}
					onOpenChange={setHistoryDrawerOpen}
					row={detailsDrawerRow}
					rowValueRendererContext={rowValueRendererContext}
				/>
				<MaskChangeRequestDrawer
					slug={slug}
					maskFields={maskFields}
					open={changeRequestDrawerOpen}
					onOpenChange={setChangeRequestDrawerOpen}
					row={changeRequestDrawerRow}
					rowValueRendererContext={rowValueRendererContext}
				/>
			</RelationNavigationProvider>
		</MenuPage>
	);
}
