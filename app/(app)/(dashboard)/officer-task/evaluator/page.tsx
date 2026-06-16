"use client";

import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, RefreshCwIcon, CircleAlertIcon } from "lucide-react";

import { uwsa } from "@/utils/actions";
import { lexicalPlainText } from "@/utils/payload";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";

import { MenuPage, MenuToolbar, MenuPagination, MenuFilterState, useConfigStorage, MenuFilterSummary, DashboardMenuTable, MenuColumnConfigCard, MenuFilterConfigCard, useMenuRowValueRenderer } from "../../layout.components";
import { RelationNavigationProvider, relationNavigationFilterConfigProvider } from "../../relation-navigation.components";
import { queryAction, evaluateAction, getDetailsAction } from "../evaluator.actions";
import { ColumnData, DetailsDrawer, EvaluateDrawer, defaultColumnOrder, defaultColumnsSort, tableConfigColumns, columnConfigColumns, defaultColumnsShown, filterConfigColumns, eligibleDetailsTriggerColumns, rowValueRendererConfigColumns } from "../evaluator.components";

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
	{ key: "#actions", type: "null", render: (_, row, { isMutating, setEvaluateDrawerRow, setEvaluateDrawerOpen }) => (
		<>
			{row.settledAt != null && row.settlementStatus == "finished" && (row.evaluationApproved == null || (row.evaluationApproved &&
				(row.creditApplicationAssignmentDueDate == null || Date.now() < Date.parse(row.creditApplicationAssignmentDueDate)))) ? (
					<Button
						type="button"
						size="sm"
						variant="default"
						onClick={() => { setEvaluateDrawerRow!(row); setEvaluateDrawerOpen!(true); }}
						disabled={isMutating}
					>
						{row.evaluatedAt != null ? (
							<>
								<RefreshCwIcon />
								Reevaluate
							</>
						) : (
							<>
								<CheckIcon />
								Evaluate
							</>
						)}
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
	const [columnOrder, setColumnOrder] = useConfigStorage({ localStorageKey: "officer-task.column-order", updateIfThisSearhParamExists: "columnOrder", defaultValue: defaultColumnOrderWithActions });
	const [columnsShown, setColumnsShown] = useConfigStorage({ localStorageKey: "officer-task.columns-shown", updateIfThisSearhParamExists: "columnsShown", defaultValue: defaultColumnsShownWithActions });
	const [columnConfigCardOpen, setColumnConfigCardOpen] = useState(false);
	const [filters, setFilters] = useConfigStorage({ localStorageKey: "officer-task.filters", customConfigProvider: relationNavigationFilterConfigProvider("officer-tasks"), updateIfThisSearhParamExists: "filters", defaultValue: [] as MenuFilterState[] });
	const [filterConfigCardOpen, setFilterConfigCardOpen] = useState(filters.length > 0);
	const [columnsSort, setColumnsSort] = useConfigStorage<[string, boolean][]>({ localStorageKey: "officer-task.columns-sort", updateIfThisSearhParamExists: "columnsSort", defaultValue: defaultColumnsSort });
	const [pageIndex, setPageIndex] = useState(1);
	const query = useQuery({
		queryKey: ["officer-task", "evaluator", {
			keyword,
			filters,
			columnsSort,
			pageIndex
		}],
		queryFn: async () => await uwsa(queryAction)({
			keyword: keyword,
			filters: filters,
			columnsSort: columnsSort,
			pageIndex: pageIndex
		})
	});
	const [detailsDrawerRow, setDetailsDrawerRow] = useState(null as ColumnData | null);
	const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
	const [evaluateDrawerRow, setEvaluateDrawerRow] = useState(null as ColumnData | null);
	const [evaluateDrawerOpen, setEvaluateDrawerOpen] = useState(false);
	const [evaluationComment, setEvaluationComment] = useState(lexicalPlainText(""));
	const [isMutating, startMutationTransition] = useTransition();
	const [evaluateMutationError, setEvaluateMutationError] = useState(null as any);
	const rowValueRendererContext = {
		relationValues: query.data?.relations,
		activeIds: query.data?.activeIds,
		isMutating: isMutating,
		setEvaluateDrawerRow: setEvaluateDrawerRow,
		setEvaluateDrawerOpen: setEvaluateDrawerOpen
	};
	const renderCell = useMenuRowValueRenderer({
		columns: rowValueRendererConfigColumnsWithActions,
		context: { ...rowValueRendererContext, richTextCard: false, richTextClamp: true },
		detailsTriggerColumnKey: columnOrder.filter(columnKey => columnsShown.includes(columnKey))
			.find(columnKey => eligibleDetailsTriggerColumns.includes(columnKey)),
		onOpenDetails: row => { setDetailsDrawerOpen(true); setDetailsDrawerRow(row); }
	});

	return (
		<MenuPage
			title="Officer Task"
			description="Evaluate officer tasks before they are settled."
		>
			<RelationNavigationProvider>
				<MenuToolbar
					keyword={keyword}
					onKeywordChange={setKeyword}
					searchPlaceholder="Search officer tasks by credit application or officer"
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
					onChainNavigate={async id => {
						const result = await uwsa(getDetailsAction)(id);
						setDetailsDrawerRow(result.row);
					}}
				/>
				<EvaluateDrawer
					open={evaluateDrawerOpen}
					onOpenChange={setEvaluateDrawerOpen}
					row={evaluateDrawerRow}
					rowValueRendererContext={rowValueRendererContext}
					evaluationComment={evaluationComment}
					onEvaluationCommentChange={setEvaluationComment}
					mutationError={evaluateMutationError}
					isMutating={isMutating}
					onApprove={() => startMutationTransition(async () => {
						setEvaluateMutationError(null);
						try {
							await uwsa(evaluateAction)({
								id: evaluateDrawerRow!.id,
								decision: "approve",
								evaluationComment: evaluationComment
							});
							setEvaluateDrawerOpen(false);
							setEvaluationComment(lexicalPlainText(""));
						} catch(error) {
							setEvaluateMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["officer-task"] });
						}
					})}
					onReject={() => startMutationTransition(async () => {
						setEvaluateMutationError(null);
						try {
							await uwsa(evaluateAction)({
								id: evaluateDrawerRow!.id,
								decision: "reject",
								evaluationComment: evaluationComment
							});
							setEvaluateDrawerOpen(false);
							setEvaluationComment(lexicalPlainText(""));
						} catch(error) {
							setEvaluateMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["officer-task"] });
						}
					})}
				/>
			</RelationNavigationProvider>
		</MenuPage>
	);
}
