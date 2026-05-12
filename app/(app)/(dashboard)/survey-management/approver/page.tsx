"use client";

import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CircleAlertIcon } from "lucide-react";

import { lexicalPlainText } from "@/utils/payload";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Switch } from "@/components/radix/Switch";

import { MenuPage, MenuToolbar, MenuPagination, MenuFilterState, useConfigStorage, MenuFilterSummary, DashboardMenuTable, MenuColumnConfigCard, MenuFilterConfigCard, useMenuRowValueRenderer, useDashboardShellContext } from "../../layout.components";
import { RelationNavigationProvider } from "../../relation-navigation.components";
import { reviewAction, queryApproverAction } from "../layout.actions";
import { ColumnData, ReviewDrawer, DetailsDrawer, HistoryDrawer, defaultColumnOrder, defaultColumnsSort, tableConfigColumns, ChangeRequestDrawer, columnConfigColumns, defaultColumnsShown, filterConfigColumns, eligibleDetailsTriggerColumns, rowValueRendererConfigColumns } from "../layout.components";

const columnConfigColumnsWithActions = Object.freeze([
	...columnConfigColumns,
	{ key: "#actions", label: "Actions" }
]);
const tableConfigColumnsWithActions = Object.freeze([
	...tableConfigColumns,
	{ key: "#actions", label: "Actions", sortable: false }
]);
const rowValueRendererConfigColumnsWithActions = Object.freeze([
	...rowValueRendererConfigColumns,
	{ key: "#actions", type: "null", render: (_, row, { isMutating, setReviewDrawerRow, setReviewDrawerOpen }) => (
		<Button
			type="button"
			size="sm"
			variant="default"
			onClick={() => { setReviewDrawerRow!(row); setReviewDrawerOpen!(true); }}
			disabled={row.reviewedAt != null || isMutating}
		>
			<CheckIcon />
			Review
		</Button>
	) } satisfies (typeof rowValueRendererConfigColumns)[number]
]);

export default function Page() {
	const queryClient = useQueryClient();
	const { roles } = useDashboardShellContext();
	const [keyword, setKeyword] = useState("");
	const [columnOrder, setColumnOrder] = useConfigStorage({ localStorageKey: "survey-management.column-order", updateIfThisSearhParamExists: "columnOrder", defaultValue: defaultColumnOrder });
	const [columnsShown, setColumnsShown] = useConfigStorage({ localStorageKey: "survey-management.columns-shown", updateIfThisSearhParamExists: "columnsShown", defaultValue: defaultColumnsShown });
	const [columnConfigCardOpen, setColumnConfigCardOpen] = useState(false);
	const [filters, setFilters] = useConfigStorage({ localStorageKey: "survey-management.filters", updateIfThisSearhParamExists: "filters", defaultValue: [] as MenuFilterState[] });
	const [filterConfigCardOpen, setFilterConfigCardOpen] = useState(filters.length > 0);
	const [includeDeleted, setIncludeDeleted] = useConfigStorage({ localStorageKey: "survey-management.include-deleted", updateIfThisSearhParamExists: "includeDeleted", defaultValue: false });
	const [columnsSort, setColumnsSort] = useConfigStorage<[string, boolean][]>({ localStorageKey: "survey-management.columns-sort", updateIfThisSearhParamExists: "columnsSort", defaultValue: defaultColumnsSort });
	const [pageIndex, setPageIndex] = useState(1);
	const query = useQuery({
		queryKey: ["survey-management", "approver", {
			keyword,
			filters,
			columnsSort,
			includeDeleted,
			pageIndex
		}],
		queryFn: async () => await queryApproverAction({
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
	const [reviewDrawerRow, setReviewDrawerRow] = useState(null as ColumnData | null);
	const [reviewDrawerOpen, setReviewDrawerOpen] = useState(false);
	const [reviewComment, setReviewComment] = useState(lexicalPlainText(""));
	const [isMutating, startMutationTransition] = useTransition();
	const [reviewMutationError, setReviewMutationError] = useState(null as any);
	const renderCell = useMenuRowValueRenderer({
		columns: rowValueRendererConfigColumnsWithActions,
		context: {
			relationValues: query.data?.relations,
			isMutating: isMutating,
			setChangeRequestDrawerRow: setChangeRequestDrawerRow,
			setChangeRequestDrawerOpen: setChangeRequestDrawerOpen,
			setReviewDrawerRow: setReviewDrawerRow,
			setReviewDrawerOpen: setReviewDrawerOpen
		},
		detailsTriggerColumnKey: eligibleDetailsTriggerColumns.find(columnKey => columnsShown.includes(columnKey)),
		onOpenDetails: row => {
			setDetailsDrawerOpen(true);
			setDetailsDrawerRow(row);
		}
	});

	return (
		<MenuPage
			title="Survey Management"
			description="Review pending survey requests before publication."
		>
			<RelationNavigationProvider>
				<MenuToolbar
					keyword={keyword}
					onKeywordChange={setKeyword}
					searchPlaceholder="Search surveys by title or ID"
					filterCount={filters.length}
					onToggleFilter={() => setFilterConfigCardOpen(!filterConfigCardOpen)}
					onToggleColumns={() => setColumnConfigCardOpen(!columnConfigCardOpen)}
					isLoading={query.isLoading}
					rightSlot={roles.includes("survey-management-auditor") ? (
						<div className="flex items-center gap-2">
							<label htmlFor="survey-management-approver-show-deleted" className="text-sm">
								Show Deleted
							</label>
							<Switch
								id="survey-management-approver-show-deleted"
								checked={includeDeleted}
								onCheckedChange={setIncludeDeleted}
								disabled={query.isLoading || isMutating}
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
					columns={columnConfigColumnsWithActions}
					columnOrder={columnOrder}
					onColumnOrderChange={setColumnOrder}
					columnsShown={columnsShown}
					onColumnsShownChange={setColumnsShown}
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
					onOpenHistory={() => setHistoryDrawerOpen(true)}
				/>
				<HistoryDrawer
					open={historyDrawerOpen}
					onOpenChange={setHistoryDrawerOpen}
					row={detailsDrawerRow}
				/>
				<ChangeRequestDrawer
					open={changeRequestDrawerOpen}
					onOpenChange={setChangeRequestDrawerOpen}
					row={changeRequestDrawerRow}
				/>
				<ReviewDrawer
					open={reviewDrawerOpen}
					onOpenChange={setReviewDrawerOpen}
					row={reviewDrawerRow}
					reviewComment={reviewComment}
					onReviewCommentChange={setReviewComment}
					mutationError={reviewMutationError}
					isMutating={isMutating}
					onApprove={() => startMutationTransition(async () => {
						setReviewMutationError(null);
						try {
							await reviewAction({
								id: reviewDrawerRow!.id,
								decision: "approve",
								reviewComment: reviewComment
							});
							setReviewDrawerOpen(false);
							setReviewComment(lexicalPlainText(""));
						} catch(error) {
							setReviewMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["survey-management"] });
						}
					})}
					onReject={() => startMutationTransition(async () => {
						setReviewMutationError(null);
						try {
							await reviewAction({
								id: reviewDrawerRow!.id,
								decision: "reject",
								reviewComment: reviewComment
							});
							setReviewDrawerOpen(false);
							setReviewComment(lexicalPlainText(""));
						} catch(error) {
							setReviewMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["survey-management"] });
						}
					})}
				/>
			</RelationNavigationProvider>
		</MenuPage>
	);
}
