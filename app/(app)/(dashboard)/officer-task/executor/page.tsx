"use client";

import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { XIcon, PlusIcon, PencilIcon, HistoryIcon, CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Switch } from "@/components/radix/Switch";

import { MenuPage, MenuToolbar, MenuPagination, MenuFilterState, useConfigStorage, MenuFilterSummary, DashboardMenuTable, useDashboardContext, MenuColumnConfigCard, MenuFilterConfigCard, useMenuRowValueRenderer } from "../../layout.components";
import { RelationNavigationProvider } from "../../relation-navigation.components";
import { cancelAction, upsertAction, restoreAction, queryExecutorAction } from "../executor.actions";
import { type FormState } from "../executor.actions";
import { ColumnData, FormDrawer, toFormState, CancelDialog, DetailsDrawer, RestoreDialog, defaultColumnOrder, defaultColumnsSort, tableConfigColumns, columnConfigColumns, defaultColumnsShown, filterConfigColumns, eligibleDetailsTriggerColumns, rowValueRendererConfigColumns } from "../executor.components";

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
	{ key: "#actions", type: "null", render: (_, row, { isMutating, setEditFormDrawerState, setEditFormDrawerOpen, setCancelTargetRow, setRestoreTargetRow }) => (
		<>
			{row.deletedAt == null && row.evaluatedAt == null ? (
				<Button
					type="button"
					size="sm"
					variant="outline"
					onClick={() => { setEditFormDrawerState!(toFormState(row)); setEditFormDrawerOpen!(true); }}
					disabled={isMutating}
				>
					<PencilIcon />
					Edit
				</Button>
			) : null}
			{row.deletedAt == null && row.evaluatedAt == null && row.cancelledAt == null ? (
				<Button type="button" size="sm" variant="destructive" onClick={() => setCancelTargetRow!(row)} disabled={isMutating}>
					<XIcon />
					Cancel
				</Button>
			) : null}
			{row.deletedAt == null && row.evaluatedAt == null && row.cancelledAt != null ? (
				<Button type="button" size="sm" variant="secondary" onClick={() => setRestoreTargetRow!(row)} disabled={isMutating}>
					<HistoryIcon />
					Restore
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
	const { user } = useDashboardContext();
	const [keyword, setKeyword] = useState("");
	const [columnOrder, setColumnOrder] = useConfigStorage({ localStorageKey: "officer-task.column-order", updateIfThisSearhParamExists: "columnOrder", defaultValue: defaultColumnOrderWithActions });
	const [columnsShown, setColumnsShown] = useConfigStorage({ localStorageKey: "officer-task.columns-shown", updateIfThisSearhParamExists: "columnsShown", defaultValue: defaultColumnsShownWithActions });
	const [columnConfigCardOpen, setColumnConfigCardOpen] = useState(false);
	const [filters, setFilters] = useConfigStorage({ localStorageKey: "officer-task.filters", updateIfThisSearhParamExists: "filters", defaultValue: [] as MenuFilterState[] });
	const [filterConfigCardOpen, setFilterConfigCardOpen] = useState(filters.length > 0);
	const [includeDeleted, setIncludeDeleted] = useConfigStorage({ localStorageKey: "officer-task.include-deleted", updateIfThisSearhParamExists: "includeDeleted", defaultValue: false });
	const [columnsSort, setColumnsSort] = useConfigStorage<[string, boolean][]>({ localStorageKey: "officer-task.columns-sort", updateIfThisSearhParamExists: "columnsSort", defaultValue: defaultColumnsSort });
	const [pageIndex, setPageIndex] = useState(1);
	const query = useQuery({
		queryKey: ["officer-task", "executor", {
			keyword,
			filters,
			columnsSort,
			includeDeleted,
			pageIndex
		}],
		queryFn: async () => await queryExecutorAction({
			keyword: keyword,
			filters: filters,
			columnsSort: columnsSort,
			includeDeleted: includeDeleted,
			pageIndex: pageIndex
		})
	});
	const [detailsDrawerRow, setDetailsDrawerRow] = useState(null as ColumnData | null);
	const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
	const [editFormDrawerState, setEditFormDrawerState] = useState({} as FormState);
	const [editFormDrawerOpen, setEditFormDrawerOpen] = useState(false);
	const [addFormDrawerState, setAddFormDrawerState] = useState({} as FormState);
	const [addFormDrawerOpen, setAddFormDrawerOpen] = useState(false);
	const [isMutating, startMutationTransition] = useTransition();
	const [genericMutationError, setGenericMutationError] = useState(null as any);
	const [editFormMutationError, setEditFormMutationError] = useState(null as any);
	const [addFormMutationError, setAddFormMutationError] = useState(null as any);
	const [cancelTargetRow, setCancelTargetRow] = useState(null as ColumnData | null);
	const [restoreTargetRow, setRestoreTargetRow] = useState(null as ColumnData | null);
	const rowValueRendererContext = {
		relationValues: query.data?.relations,
		isMutating: isMutating,
		setEditFormDrawerState: setEditFormDrawerState,
		setEditFormDrawerOpen: setEditFormDrawerOpen,
		setCancelTargetRow: setCancelTargetRow,
		setRestoreTargetRow: setRestoreTargetRow
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
			title="Officer Task"
			description="Manage officer tasks with executor workflows, including cancellation and restoration."
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
					rightSlot={(
						<>
							{user.roleMenus.includes("officer-task#monitoring") ? (
								<div className="flex items-center gap-2">
									<label htmlFor="officer-task-executor-show-deleted" className="text-sm">
										Show Deleted
									</label>
									<Switch
										id="officer-task-executor-show-deleted"
										checked={includeDeleted}
										onCheckedChange={setIncludeDeleted}
										disabled={query.isLoading || isMutating}
									/>
								</div>
							) : null}
							<Button
								type="button"
								onClick={() => setAddFormDrawerOpen(true)}
								disabled={query.isLoading || isMutating}
							>
								<PlusIcon />
								Add
							</Button>
						</>
					)}
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
				/>
				<FormDrawer
					open={editFormDrawerOpen}
					onOpenChange={setEditFormDrawerOpen}
					title="Edit Officer Task"
					formState={editFormDrawerState}
					onFormStateChange={setEditFormDrawerState}
					isMutating={isMutating}
					mutationError={editFormMutationError}
					onSubmit={() => startMutationTransition(async () => {
						if(editFormDrawerState.creditApplicationAssignment == null || editFormDrawerState.creditApplicationAssignment.trim().length == 0)
							return setEditFormMutationError({ name: "ValidationError", message: "Credit application assignment is required." });
						setEditFormMutationError(null);
						try {
							await upsertAction({
								id: editFormDrawerState.id,
								creditApplicationAssignment: editFormDrawerState.creditApplicationAssignment,
								next: editFormDrawerState.next
							});
							setEditFormDrawerOpen(false);
							setEditFormDrawerState({});
						} catch(error) {
							setEditFormMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["officer-task"] });
						}
					})}
				/>
				<FormDrawer
					open={addFormDrawerOpen}
					onOpenChange={setAddFormDrawerOpen}
					title="Add Officer Task"
					formState={addFormDrawerState}
					onFormStateChange={setAddFormDrawerState}
					isMutating={isMutating}
					mutationError={addFormMutationError}
					onSubmit={() => startMutationTransition(async () => {
						if(addFormDrawerState.creditApplicationAssignment == null || addFormDrawerState.creditApplicationAssignment.trim().length == 0)
							return setAddFormMutationError({ name: "ValidationError", message: "Credit application assignment is required." });
						setAddFormMutationError(null);
						try {
							await upsertAction({
								creditApplicationAssignment: addFormDrawerState.creditApplicationAssignment,
								next: addFormDrawerState.next
							});
							setAddFormDrawerOpen(false);
							setAddFormDrawerState({});
						} catch(error) {
							setAddFormMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["officer-task"] });
						}
					})}
				/>
				<CancelDialog
					open={cancelTargetRow != null}
					onOpenChange={v => { if(v) return; setCancelTargetRow(null); }}
					isMutating={isMutating}
					onConfirm={() => startMutationTransition(async () => {
						setGenericMutationError(null);
						try {
							await cancelAction({
								id: cancelTargetRow!.id
							});
						} catch(error) {
							setGenericMutationError(error);
						} finally {
							setCancelTargetRow(null);
							await queryClient.invalidateQueries({ queryKey: ["officer-task"] });
						}
					})}
				/>
				<RestoreDialog
					open={restoreTargetRow != null}
					onOpenChange={v => { if(v) return; setRestoreTargetRow(null); }}
					isMutating={isMutating}
					onConfirm={() => startMutationTransition(async () => {
						setGenericMutationError(null);
						try {
							await restoreAction({
								id: restoreTargetRow!.id
							});
						} catch(error) {
							setGenericMutationError(error);
						} finally {
							setRestoreTargetRow(null);
							await queryClient.invalidateQueries({ queryKey: ["officer-task"] });
						}
					})}
				/>
			</RelationNavigationProvider>
		</MenuPage>
	);
}
