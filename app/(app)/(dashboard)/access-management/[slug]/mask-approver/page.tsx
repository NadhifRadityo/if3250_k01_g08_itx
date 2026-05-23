"use client";

import { useMemo, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CircleAlertIcon } from "lucide-react";

import { lexicalPlainText } from "@/utils/payload";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Switch } from "@/components/radix/Switch";

import { MenuPage, MenuToolbar, MenuPagination, MenuFilterState, useConfigStorage, MenuFilterSummary, DashboardMenuTable, useDashboardContext, MenuColumnConfigCard, MenuFilterConfigCard, useMenuRowValueRenderer } from "../../../layout.components";
import { RelationNavigationProvider } from "../../../relation-navigation.components";
import { reviewMaskAction, queryMaskApproverAction } from "../mask.actions";
import { MaskColumnData, MaskReviewDrawer, MaskDetailsDrawer, MaskHistoryDrawer, MaskChangeRequestDrawer, buildFilterConfigColumns, buildColumnConfigColumns, buildTableConfigColumns, buildRowValueRendererConfigColumns, buildEligibleDetailsTriggerColumns, buildDefaultColumnOrder, buildDefaultColumnsShown, buildDefaultColumnsSort } from "../mask.components";
import { menuMaskFields, tabMenuKeys } from "../../layout.shared";

export default function Page() {
	const { slug } = useParams<{ slug: string }>();
	const queryClient = useQueryClient();
	const { user } = useDashboardContext();
	const maskFields = menuMaskFields[slug as typeof tabMenuKeys[number]];
	const filterConfigColumns = useMemo(() => buildFilterConfigColumns(maskFields), [maskFields]);
	const columnConfigColumnsBase = useMemo(() => buildColumnConfigColumns(maskFields), [maskFields]);
	const tableConfigColumnsBase = useMemo(() => buildTableConfigColumns(maskFields), [maskFields]);
	const rowValueRendererConfigColumnsBase = useMemo(() => buildRowValueRendererConfigColumns(maskFields), [maskFields]);
	const eligibleDetailsTriggerColumns = useMemo(() => buildEligibleDetailsTriggerColumns(maskFields), [maskFields]);
	const defaultColumnOrderBase = useMemo(() => buildDefaultColumnOrder(maskFields), [maskFields]);
	const defaultColumnsShownBase = useMemo(() => buildDefaultColumnsShown(maskFields), [maskFields]);
	const defaultColumnsSort = useMemo(() => buildDefaultColumnsSort(maskFields), [maskFields]);
	const columnConfigColumnsWithActions = useMemo(() => Object.freeze([
		...columnConfigColumnsBase,
		{ key: "#actions", label: "Actions" }
	]), [columnConfigColumnsBase]);
	const tableConfigColumnsWithActions = useMemo(() => Object.freeze([
		...tableConfigColumnsBase,
		{ key: "#actions", label: "Actions", sortable: false, className: "flex flex-wrap gap-2" }
	]), [tableConfigColumnsBase]);
	const rowValueRendererConfigColumnsWithActions = useMemo(() => Object.freeze([
		...rowValueRendererConfigColumnsBase,
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
		) } satisfies (typeof rowValueRendererConfigColumnsBase)[number]
	]), [rowValueRendererConfigColumnsBase]);
	const defaultColumnOrderWithActions = useMemo(() => Object.freeze([
		...defaultColumnOrderBase,
		"#actions"
	]) as string[], [defaultColumnOrderBase]);
	const defaultColumnsShownWithActions = useMemo(() => Object.freeze([
		...defaultColumnsShownBase,
		"#actions"
	]) as string[], [defaultColumnsShownBase]);
	const [keyword, setKeyword] = useState("");
	const [columnOrder, setColumnOrder] = useConfigStorage({ localStorageKey: `access-management.${slug}.mask.column-order`, updateIfThisSearhParamExists: "columnOrder", defaultValue: defaultColumnOrderWithActions });
	const [columnsShown, setColumnsShown] = useConfigStorage({ localStorageKey: `access-management.${slug}.mask.columns-shown`, updateIfThisSearhParamExists: "columnsShown", defaultValue: defaultColumnsShownWithActions });
	const [columnConfigCardOpen, setColumnConfigCardOpen] = useState(false);
	const [filters, setFilters] = useConfigStorage({ localStorageKey: `access-management.${slug}.mask.filters`, updateIfThisSearhParamExists: "filters", defaultValue: [] as MenuFilterState[] });
	const [filterConfigCardOpen, setFilterConfigCardOpen] = useState(filters.length > 0);
	const [includeDeleted, setIncludeDeleted] = useConfigStorage({ localStorageKey: `access-management.${slug}.mask.include-deleted`, updateIfThisSearhParamExists: "includeDeleted", defaultValue: false });
	const [columnsSort, setColumnsSort] = useConfigStorage<[string, boolean][]>({ localStorageKey: `access-management.${slug}.mask.columns-sort`, updateIfThisSearhParamExists: "columnsSort", defaultValue: defaultColumnsSort });
	const [pageIndex, setPageIndex] = useState(1);
	const query = useQuery({
		queryKey: ["access-management", slug, "mask-approver", {
			keyword,
			filters,
			columnsSort,
			includeDeleted,
			pageIndex
		}],
		queryFn: async () => await queryMaskApproverAction({
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
	const [reviewDrawerRow, setReviewDrawerRow] = useState(null as MaskColumnData | null);
	const [reviewDrawerOpen, setReviewDrawerOpen] = useState(false);
	const [reviewComment, setReviewComment] = useState(lexicalPlainText(""));
	const [isMutating, startMutationTransition] = useTransition();
	const [reviewMutationError, setReviewMutationError] = useState(null as any);
	const rowValueRendererContext = {
		relationValues: query.data?.relations,
		isMutating: isMutating,
		setChangeRequestDrawerRow: setChangeRequestDrawerRow,
		setChangeRequestDrawerOpen: setChangeRequestDrawerOpen,
		setReviewDrawerRow: setReviewDrawerRow,
		setReviewDrawerOpen: setReviewDrawerOpen
	};
	const renderCell = useMenuRowValueRenderer({
		columns: rowValueRendererConfigColumnsWithActions,
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
			description="Review pending mask requests before publication."
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
							<label htmlFor="access-management-mask-approver-show-deleted" className="text-sm">
								Show Deleted
							</label>
							<Switch
								id="access-management-mask-approver-show-deleted"
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
				<MaskDetailsDrawer
					slug={slug}
					maskFields={maskFields}
					open={detailsDrawerOpen}
					onOpenChange={setDetailsDrawerOpen}
					row={detailsDrawerRow}
					rowValueRendererContext={rowValueRendererContext}
					renderActions={r => renderCell(r, "#actions")}
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
				<MaskReviewDrawer
					slug={slug}
					maskFields={maskFields}
					open={reviewDrawerOpen}
					onOpenChange={setReviewDrawerOpen}
					row={reviewDrawerRow}
					rowValueRendererContext={rowValueRendererContext}
					reviewComment={reviewComment}
					onReviewCommentChange={setReviewComment}
					mutationError={reviewMutationError}
					isMutating={isMutating}
					onApprove={() => startMutationTransition(async () => {
						setReviewMutationError(null);
						try {
							await reviewMaskAction({
								slug: slug,
								id: reviewDrawerRow!.id,
								decision: "approve",
								reviewComment: reviewComment
							});
							setReviewDrawerOpen(false);
							setReviewComment(lexicalPlainText(""));
						} catch(error) {
							setReviewMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["access-management"] });
						}
					})}
					onReject={() => startMutationTransition(async () => {
						setReviewMutationError(null);
						try {
							await reviewMaskAction({
								slug: slug,
								id: reviewDrawerRow!.id,
								decision: "reject",
								reviewComment: reviewComment
							});
							setReviewDrawerOpen(false);
							setReviewComment(lexicalPlainText(""));
						} catch(error) {
							setReviewMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["access-management"] });
						}
					})}
				/>
			</RelationNavigationProvider>
		</MenuPage>
	);
}
