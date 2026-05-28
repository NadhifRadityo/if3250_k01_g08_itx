"use client";

import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { XIcon, PlusIcon, PencilIcon, Trash2Icon, HistoryIcon, CircleAlertIcon } from "lucide-react";

import { lexicalPlainText } from "@/utils/payload";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Switch } from "@/components/radix/Switch";

import { MenuPage, MenuToolbar, MenuPagination, MenuFilterState, useConfigStorage, MenuFilterSummary, DashboardMenuTable, useDashboardContext, MenuColumnConfigCard, MenuFilterConfigCard, useMenuRowValueRenderer } from "../../layout.components";
import { RelationNavigationProvider } from "../../relation-navigation.components";
import { queryEditorAction, cancelRequestAction, requestDeleteAction, requestUpsertAction, requestRestoreAction } from "../layout.actions";
import { ColumnData, FormDrawer, toFormState, DeleteDialog, DetailsDrawer, HistoryDrawer, defaultColumnOrder, defaultColumnsSort, tableConfigColumns, ChangeRequestDrawer, columnConfigColumns, defaultColumnsShown, filterConfigColumns, RevertApprovedDialog, RestoreDeletionDialog, CancelPendingRequestDialog, eligibleDetailsTriggerColumns, rowValueRendererConfigColumns, type FormState } from "../layout.components";

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
	{ key: "#actions", type: "null", render: (_, row, { isMutating, setEditFormDrawerState, setEditFormDrawerOpen, setDeleteTargetRow, setCancelPendingRequestTargetRow, setRevertApprovedTargetRow, setRestoreDeletionTargetRow }) => (
		<>
			{row.deletedAt == null ? (
				<>
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
					<Button type="button" size="sm" variant="destructive" onClick={() => setDeleteTargetRow!(row)} disabled={isMutating}>
						<Trash2Icon />
						Delete
					</Button>
				</>
			) : null}
			{row.deletedAt == null && row.reviewedAt == null ? (
				<Button type="button" size="sm" variant="secondary" onClick={() => setCancelPendingRequestTargetRow!(row)} disabled={isMutating}>
					<XIcon />
					Cancel
				</Button>
			) : null}
			{row.deletedAt == null && row.reviewedAt != null && row.reviewApproved == false ? (
				<Button type="button" size="sm" variant="secondary" onClick={() => setRevertApprovedTargetRow!(row)} disabled={isMutating}>
					<HistoryIcon />
					Revert Approved
				</Button>
			) : null}
			{row.deletedAt != null ? (
				<Button type="button" size="sm" variant="outline" onClick={() => setRestoreDeletionTargetRow!(row)} disabled={isMutating}>
					<PlusIcon />
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
	const [columnOrder, setColumnOrder] = useConfigStorage({ localStorageKey: "credit-application-assignment.column-order", updateIfThisSearhParamExists: "columnOrder", defaultValue: defaultColumnOrderWithActions });
	const [columnsShown, setColumnsShown] = useConfigStorage({ localStorageKey: "credit-application-assignment.columns-shown", updateIfThisSearhParamExists: "columnsShown", defaultValue: defaultColumnsShownWithActions });
	const [columnConfigCardOpen, setColumnConfigCardOpen] = useState(false);
	const [filters, setFilters] = useConfigStorage({ localStorageKey: "credit-application-assignment.filters", updateIfThisSearhParamExists: "filters", defaultValue: [] as MenuFilterState[] });
	const [filterConfigCardOpen, setFilterConfigCardOpen] = useState(filters.length > 0);
	const [includeDeleted, setIncludeDeleted] = useConfigStorage({ localStorageKey: "credit-application-assignment.include-deleted", updateIfThisSearhParamExists: "includeDeleted", defaultValue: false });
	const [columnsSort, setColumnsSort] = useConfigStorage<[string, boolean][]>({ localStorageKey: "credit-application-assignment.columns-sort", updateIfThisSearhParamExists: "columnsSort", defaultValue: defaultColumnsSort });
	const [pageIndex, setPageIndex] = useState(1);
	const query = useQuery({
		queryKey: ["credit-application-assignment", "editor", {
			keyword,
			filters,
			columnsSort,
			includeDeleted,
			pageIndex
		}],
		queryFn: async () => await queryEditorAction({
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
	const [editFormDrawerState, setEditFormDrawerState] = useState({} as FormState);
	const [editFormDrawerOpen, setEditFormDrawerOpen] = useState(false);
	const [addFormDrawerState, setAddFormDrawerState] = useState({} as FormState);
	const [addFormDrawerOpen, setAddFormDrawerOpen] = useState(false);
	const [isMutating, startMutationTransition] = useTransition();
	const [genericMutationError, setGenericMutationError] = useState(null as any);
	const [editFormMutationError, setEditFormMutationError] = useState(null as any);
	const [addFormMutationError, setAddFormMutationError] = useState(null as any);
	const [deleteTargetRow, setDeleteTargetRow] = useState(null as ColumnData | null);
	const [cancelPendingRequestTargetRow, setCancelPendingRequestTargetRow] = useState(null as ColumnData | null);
	const [revertApprovedTargetRow, setRevertApprovedTargetRow] = useState(null as ColumnData | null);
	const [restoreDeletionTargetRow, setRestoreDeletionTargetRow] = useState(null as ColumnData | null);
	const [deleteChangeRequestComment, setDeleteChangeRequestComment] = useState(lexicalPlainText(""));
	const [restoreDeletionChangeRequestComment, setRestoreDeletionChangeRequestComment] = useState(lexicalPlainText(""));
	const rowValueRendererContext = {
		relationValues: query.data?.relations,
		isMutating: isMutating,
		setChangeRequestDrawerRow: setChangeRequestDrawerRow,
		setChangeRequestDrawerOpen: setChangeRequestDrawerOpen,
		setEditFormDrawerState: setEditFormDrawerState,
		setEditFormDrawerOpen: setEditFormDrawerOpen,
		setDeleteTargetRow: setDeleteTargetRow,
		setCancelPendingRequestTargetRow: setCancelPendingRequestTargetRow,
		setRevertApprovedTargetRow: setRevertApprovedTargetRow,
		setRestoreDeletionTargetRow: setRestoreDeletionTargetRow
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
			title="Credit Application Assignment"
			description="Manage credit application assignment requests with editor workflows, including officer assignment changes."
		>
			<RelationNavigationProvider>
				<MenuToolbar
					keyword={keyword}
					onKeywordChange={setKeyword}
					searchPlaceholder="Search assignments by credit application or officer"
					filterCount={filters.length}
					onToggleFilter={() => setFilterConfigCardOpen(!filterConfigCardOpen)}
					onToggleColumns={() => setColumnConfigCardOpen(!columnConfigCardOpen)}
					isLoading={query.isLoading}
					rightSlot={(
						<>
							{user.roleMenus.includes("credit-application-assignment#auditor") ? (
								<div className="flex items-center gap-2">
									<label htmlFor="credit-application-assignment-editor-show-deleted" className="text-sm">
										Show Deleted
									</label>
									<Switch
										id="credit-application-assignment-editor-show-deleted"
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
					renderActions={r => renderCell(r, "#actions")}
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
				<FormDrawer
					open={editFormDrawerOpen}
					onOpenChange={setEditFormDrawerOpen}
					title="Edit Credit Application Assignment"
					formState={editFormDrawerState}
					onFormStateChange={setEditFormDrawerState}
					isMutating={isMutating}
					mutationError={editFormMutationError}
					onSubmit={() => startMutationTransition(async () => {
						editFormDrawerState.creditApplications ??= [];
						if(editFormDrawerState.creditApplications.length == 0)
							return setEditFormMutationError({ name: "ValidationError", message: "Credit application is required." });
						if(editFormDrawerState.officer == null || editFormDrawerState.officer.trim().length == 0)
							return setEditFormMutationError({ name: "ValidationError", message: "Officer is required." });
						setEditFormMutationError(null);
						try {
							await requestUpsertAction({
								id: editFormDrawerState.id,
								creditApplications: editFormDrawerState.creditApplications,
								officer: editFormDrawerState.officer,
								changeRequestComment: editFormDrawerState.changeRequestComment
							});
							setEditFormDrawerOpen(false);
							setEditFormDrawerState({});
						} catch(error) {
							setEditFormMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["credit-application-assignment"] });
						}
					})}
				/>
				<FormDrawer
					open={addFormDrawerOpen}
					onOpenChange={setAddFormDrawerOpen}
					title="Add Credit Application Assignment"
					formState={addFormDrawerState}
					onFormStateChange={setAddFormDrawerState}
					isMutating={isMutating}
					mutationError={addFormMutationError}
					onSubmit={() => startMutationTransition(async () => {
						addFormDrawerState.creditApplications ??= [];
						if(addFormDrawerState.creditApplications.length == 0)
							return setAddFormMutationError({ name: "ValidationError", message: "Credit application is required." });
						if(addFormDrawerState.officer == null || addFormDrawerState.officer.trim().length == 0)
							return setAddFormMutationError({ name: "ValidationError", message: "Officer is required." });
						setAddFormMutationError(null);
						try {
							await requestUpsertAction({
								creditApplications: addFormDrawerState.creditApplications,
								officer: addFormDrawerState.officer,
								changeRequestComment: addFormDrawerState.changeRequestComment
							});
							setAddFormDrawerOpen(false);
							setAddFormDrawerState({});
						} catch(error) {
							setAddFormMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["credit-application-assignment"] });
						}
					})}
				/>
				<DeleteDialog
					open={deleteTargetRow != null}
					onOpenChange={v => { if(v) return; setDeleteTargetRow(null); }}
					changeRequestComment={deleteChangeRequestComment}
					onChangeRequestCommentChange={setDeleteChangeRequestComment}
					isMutating={isMutating}
					onConfirm={() => startMutationTransition(async () => {
						setGenericMutationError(null);
						try {
							await requestDeleteAction({
								id: deleteTargetRow!.id,
								changeRequestComment: deleteChangeRequestComment
							});
						} catch(error) {
							setGenericMutationError(error);
						} finally {
							setDeleteTargetRow(null);
							setDeleteChangeRequestComment(lexicalPlainText(""));
							await queryClient.invalidateQueries({ queryKey: ["credit-application-assignment"] });
						}
					})}
				/>
				<CancelPendingRequestDialog
					open={cancelPendingRequestTargetRow != null}
					onOpenChange={v => { if(v) return; setCancelPendingRequestTargetRow(null); }}
					isMutating={isMutating}
					onConfirm={() => startMutationTransition(async () => {
						setGenericMutationError(null);
						try {
							await cancelRequestAction({
								id: cancelPendingRequestTargetRow!.id
							});
						} catch(error) {
							setGenericMutationError(error);
						} finally {
							setCancelPendingRequestTargetRow(null);
							await queryClient.invalidateQueries({ queryKey: ["credit-application-assignment"] });
						}
					})}
				/>
				<RevertApprovedDialog
					open={revertApprovedTargetRow != null}
					onOpenChange={v => { if(v) return; setRevertApprovedTargetRow(null); }}
					isMutating={isMutating}
					onConfirm={() => startMutationTransition(async () => {
						setGenericMutationError(null);
						try {
							await cancelRequestAction({
								id: revertApprovedTargetRow!.id
							});
						} catch(error) {
							setGenericMutationError(error);
						} finally {
							setRevertApprovedTargetRow(null);
							await queryClient.invalidateQueries({ queryKey: ["credit-application-assignment"] });
						}
					})}
				/>
				<RestoreDeletionDialog
					open={restoreDeletionTargetRow != null}
					onOpenChange={v => { if(v) return; setRestoreDeletionTargetRow(null); }}
					changeRequestComment={restoreDeletionChangeRequestComment}
					onChangeRequestCommentChange={setRestoreDeletionChangeRequestComment}
					isMutating={isMutating}
					onConfirm={() => startMutationTransition(async () => {
						setGenericMutationError(null);
						try {
							await requestRestoreAction({
								id: restoreDeletionTargetRow!.id,
								changeRequestComment: restoreDeletionChangeRequestComment
							});
						} catch(error) {
							setGenericMutationError(error);
						} finally {
							setRestoreDeletionTargetRow(null);
							setRestoreDeletionChangeRequestComment(lexicalPlainText(""));
							await queryClient.invalidateQueries({ queryKey: ["credit-application-assignment"] });
						}
					})}
				/>
			</RelationNavigationProvider>
		</MenuPage>
	);
}
