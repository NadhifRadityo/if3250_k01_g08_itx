"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";

import { DatetimeInput } from "@/components/DatetimeInput";
import { OfficerTrackingMap, OfficerTrackingUser } from "@/components/OfficerTrackingMap";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Label } from "@/components/radix/Label";

import { MenuPage, MenuToolbar, MenuPagination, MenuFilterState, useConfigStorage, MenuFilterSummary, DashboardMenuTable, MenuColumnConfigCard, MenuFilterConfigCard, useMenuRowValueRenderer } from "../../layout.components";
import { RelationNavigationProvider } from "../../relation-navigation.components";
import { queryReportingAction } from "../layout.actions";
import { ColumnData, DetailsDrawer, defaultColumnOrder, defaultColumnsSort, tableConfigColumns, columnConfigColumns, defaultColumnsShown, filterConfigColumns, eligibleDetailsTriggerColumns, rowValueRendererConfigColumns } from "../layout.components";

function getDefaultPeriodStart() {
	const start = new Date();
	start.setHours(0, 0, 0, 0);
	return start.toISOString();
}

export default function Page() {
	const [keyword, setKeyword] = useState("");
	const [columnOrder, setColumnOrder] = useConfigStorage({ localStorageKey: "officer-tracking.column-order", updateIfThisSearhParamExists: "columnOrder", defaultValue: defaultColumnOrder });
	const [columnsShown, setColumnsShown] = useConfigStorage({ localStorageKey: "officer-tracking.columns-shown", updateIfThisSearhParamExists: "columnsShown", defaultValue: defaultColumnsShown });
	const [columnConfigCardOpen, setColumnConfigCardOpen] = useState(false);
	const [filters, setFilters] = useConfigStorage({ localStorageKey: "officer-tracking.filters", updateIfThisSearhParamExists: "filters", defaultValue: [] as MenuFilterState[] });
	const [filterConfigCardOpen, setFilterConfigCardOpen] = useState(filters.length > 0);
	const [columnsSort, setColumnsSort] = useConfigStorage<[string, boolean][]>({ localStorageKey: "officer-tracking.columns-sort", updateIfThisSearhParamExists: "columnsSort", defaultValue: defaultColumnsSort });
	const [pageIndex, setPageIndex] = useState(1);
	const [periodStart, setPeriodStart] = useConfigStorage<string>({ localStorageKey: "officer-tracking.period-start", updateIfThisSearhParamExists: "periodStart", defaultValue: getDefaultPeriodStart() });
	const [periodEnd, setPeriodEnd] = useConfigStorage<string | null>({ localStorageKey: "officer-tracking.period-end", updateIfThisSearhParamExists: "periodEnd", defaultValue: null });
	const query = useQuery({
		queryKey: ["officer-tracking", "reporting", {
			periodStart,
			periodEnd,
			keyword,
			filters,
			columnsSort,
			pageIndex
		}],
		queryFn: async () => await queryReportingAction({
			periodStart: periodStart,
			periodEnd: periodEnd,
			keyword: keyword,
			filters: filters,
			columnsSort: columnsSort,
			pageIndex: pageIndex
		}),
		refetchInterval: periodEnd == null ? 10000 : false,
		refetchOnWindowFocus: true
	});
	const [detailsDrawerRow, setDetailsDrawerRow] = useState(null as ColumnData | null);
	const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
	const rowValueRendererContext = {
		relationValues: query.data?.relations
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
	const mapUsers = useMemo<OfficerTrackingUser[]>(() => (query.data?.mapUsers ?? []).map(mapUser => {
		const relation = query.data?.relations?.[`users:${mapUser.user}`];
		return {
			id: mapUser.id,
			name: relation?.name ?? mapUser.user,
			points: mapUser.points
		};
	}), [query.data?.mapUsers, query.data?.relations]);

	return (
		<MenuPage
			title="Officer Tracking Reporting"
			description="View officer locations from GPS log entries within a custom period."
		>
			<RelationNavigationProvider>
				<div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-end">
					<div className="flex-1 space-y-1">
						<Label className="text-xs font-medium">Period Start</Label>
						<DatetimeInput
							mode="datetime"
							precision="second"
							value={periodStart}
							onChange={value => {
								setPeriodStart(value.length > 0 ? new Date(value).toISOString() : getDefaultPeriodStart());
								setPageIndex(1);
							}}
							placeholder="Select start date and time"
						/>
					</div>
					<div className="flex-1 space-y-1">
						<Label className="text-xs font-medium">Period End</Label>
						<div className="flex items-center gap-2">
							<DatetimeInput
								className="flex-1"
								mode="datetime"
								precision="second"
								value={periodEnd ?? ""}
								onChange={value => {
									setPeriodEnd(value.length > 0 ? new Date(value).toISOString() : null);
									setPageIndex(1);
								}}
								placeholder="Live"
							/>
							<Button
								type="button"
								variant={periodEnd == null ? "default" : "outline"}
								size="sm"
								onClick={() => {
									setPeriodEnd(null);
									setPageIndex(1);
								}}
							>
								Live
							</Button>
						</div>
					</div>
				</div>
				<MenuToolbar
					keyword={keyword}
					onKeywordChange={setKeyword}
					searchPlaceholder="Search officer by name, session id, or credit application"
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
				<div className="h-[60vh] min-h-120">
					<OfficerTrackingMap
						users={mapUsers}
						periodStart={periodStart}
						periodEnd={periodEnd}
						isLoading={query.isLoading}
					/>
				</div>
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
					summaryItemLabel="officer(s)"
				/>
				<DetailsDrawer
					open={detailsDrawerOpen}
					onOpenChange={setDetailsDrawerOpen}
					row={detailsDrawerRow}
					periodStart={periodStart}
					periodEnd={periodEnd}
					rowValueRendererContext={rowValueRendererContext}
				/>
			</RelationNavigationProvider>
		</MenuPage>
	);
}
