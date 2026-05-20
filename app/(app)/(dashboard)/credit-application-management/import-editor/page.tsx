"use client";

import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, PencilIcon, Trash2Icon, CircleAlertIcon } from "lucide-react";

import { lexicalPlainText } from "@/utils/payload";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Switch } from "@/components/radix/Switch";

import { MenuPage, MenuToolbar, MenuPagination, MenuFilterState, useConfigStorage, MenuFilterSummary, DashboardMenuTable, MenuColumnConfigCard, MenuFilterConfigCard, useMenuRowValueRenderer, useDashboardShellContext } from "../../layout.components";
import { RelationNavigationProvider } from "../../relation-navigation.components";
import { queryEditorAction, requestCreateAction, requestDeleteAction, requestRestoreAction, requestUpdateDescriptionAction } from "../import.actions";
import { ColumnData, FormDrawer, toFormState, DeleteDialog, DetailsDrawer, defaultColumnOrder, defaultColumnsSort, tableConfigColumns, columnConfigColumns, defaultColumnsShown, filterConfigColumns, RestoreDeletionDialog, eligibleDetailsTriggerColumns, rowValueRendererConfigColumns, type FormState } from "../import.components";

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
	{ key: "#actions", type: "null", render: (_, row, { isMutating, setEditFormDrawerState, setEditFormDrawerOpen, setDeleteTargetRow, setRestoreDeletionTargetRow }) => (
		<>
			{row.deletedAt == null && row.reviewedAt == null ? (
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
			{row.deletedAt == null && row.reviewApproved != true ? (
				<Button type="button" size="sm" variant="destructive" onClick={() => setDeleteTargetRow!(row)} disabled={isMutating}>
					<Trash2Icon />
					Delete
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
	const { roles } = useDashboardShellContext();
	const [keyword, setKeyword] = useState("");
	const [columnOrder, setColumnOrder] = useConfigStorage({ localStorageKey: "credit-application-manaagement-import.column-order", updateIfThisSearhParamExists: "columnOrder", defaultValue: defaultColumnOrderWithActions });
	const [columnsShown, setColumnsShown] = useConfigStorage({ localStorageKey: "credit-application-manaagement-import.columns-shown", updateIfThisSearhParamExists: "columnsShown", defaultValue: defaultColumnsShownWithActions });
	const [columnConfigCardOpen, setColumnConfigCardOpen] = useState(false);
	const [filters, setFilters] = useConfigStorage({ localStorageKey: "credit-application-manaagement-import.filters", updateIfThisSearhParamExists: "filters", defaultValue: [] as MenuFilterState[] });
	const [filterConfigCardOpen, setFilterConfigCardOpen] = useState(filters.length > 0);
	const [includeDeleted, setIncludeDeleted] = useConfigStorage({ localStorageKey: "credit-application-manaagement-import.include-deleted", updateIfThisSearhParamExists: "includeDeleted", defaultValue: false });
	const [columnsSort, setColumnsSort] = useConfigStorage<[string, boolean][]>({ localStorageKey: "credit-application-manaagement-import.columns-sort", updateIfThisSearhParamExists: "columnsSort", defaultValue: defaultColumnsSort });
	const [pageIndex, setPageIndex] = useState(1);
	const query = useQuery({
		queryKey: ["credit-application-manaagement-import", "editor", {
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
	const [editFormDrawerState, setEditFormDrawerState] = useState({} as FormState);
	const [editFormDrawerOpen, setEditFormDrawerOpen] = useState(false);
	const [addFormDrawerState, setAddFormDrawerState] = useState({ description: lexicalPlainText("") } as FormState);
	const [addFormDrawerOpen, setAddFormDrawerOpen] = useState(false);
	const [isMutating, startMutationTransition] = useTransition();
	const [genericMutationError, setGenericMutationError] = useState(null as any);
	const [editFormMutationError, setEditFormMutationError] = useState(null as any);
	const [addFormMutationError, setAddFormMutationError] = useState(null as any);
	const [deleteTargetRow, setDeleteTargetRow] = useState(null as ColumnData | null);
	const [restoreDeletionTargetRow, setRestoreDeletionTargetRow] = useState(null as ColumnData | null);
	const rowValueRendererContext = {
		relationValues: query.data?.relations,
		isMutating: isMutating,
		setEditFormDrawerState: setEditFormDrawerState,
		setEditFormDrawerOpen: setEditFormDrawerOpen,
		setDeleteTargetRow: setDeleteTargetRow,
		setRestoreDeletionTargetRow: setRestoreDeletionTargetRow
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
			title="Credit Application Import"
			description="Manage spreadsheet import requests before they reach approver review."
		>
			<RelationNavigationProvider>
				<MenuToolbar
					keyword={keyword}
					onKeywordChange={setKeyword}
					searchPlaceholder="Search imports by id, filename, or MIME type"
					filterCount={filters.length}
					onToggleFilter={() => setFilterConfigCardOpen(!filterConfigCardOpen)}
					onToggleColumns={() => setColumnConfigCardOpen(!columnConfigCardOpen)}
					isLoading={query.isLoading}
					rightSlot={(
						<>
							{roles.includes("credit-application-management-auditor") ? (
								<div className="flex items-center gap-2">
									<label htmlFor="credit-application-manaagement-import-editor-show-deleted" className="text-sm">
										Show Deleted
									</label>
									<Switch
										id="credit-application-manaagement-import-editor-show-deleted"
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
				/>
				<FormDrawer
					open={editFormDrawerOpen}
					onOpenChange={setEditFormDrawerOpen}
					title="Edit Credit Application Import"
					formState={editFormDrawerState}
					onFormStateChange={setEditFormDrawerState}
					isMutating={isMutating}
					mutationError={editFormMutationError}
					onSubmit={() => startMutationTransition(async () => {
						if(editFormDrawerState.id == null)
							return setEditFormMutationError({ name: "ValidationError", message: "Import id is required." });
						setEditFormMutationError(null);
						try {
							await requestUpdateDescriptionAction({
								id: editFormDrawerState.id,
								description: editFormDrawerState.description ?? lexicalPlainText("")
							});
							setEditFormDrawerOpen(false);
						} catch(error) {
							setEditFormMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["credit-application-manaagement-import"] });
						}
					})}
				/>
				<FormDrawer
					open={addFormDrawerOpen}
					onOpenChange={setAddFormDrawerOpen}
					title="Add Credit Application Import"
					formState={addFormDrawerState}
					onFormStateChange={setAddFormDrawerState}
					isMutating={isMutating}
					mutationError={addFormMutationError}
					onSubmit={() => startMutationTransition(async () => {
						if(addFormDrawerState.file == null)
							return setAddFormMutationError({ name: "ValidationError", message: "Spreadsheet file is required." });
						setAddFormMutationError(null);
						try {
							const formData = new FormData();
							formData.set("file", addFormDrawerState.file as File);
							formData.set("description", JSON.stringify(addFormDrawerState.description));
							await requestCreateAction(formData);
							setAddFormDrawerOpen(false);
							setAddFormDrawerState({});
						} catch(error) {
							setAddFormMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["credit-application-manaagement-import"] });
						}
					})}
				/>
				<DeleteDialog
					open={deleteTargetRow != null}
					onOpenChange={open => !open ? setDeleteTargetRow(null) : undefined}
					isMutating={isMutating}
					onConfirm={() => startMutationTransition(async () => {
						setGenericMutationError(null);
						try {
							await requestDeleteAction(deleteTargetRow!.id);
							setDeleteTargetRow(null);
						} catch(error) {
							setGenericMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["credit-application-manaagement-import"] });
						}
					})}
				/>
				<RestoreDeletionDialog
					open={restoreDeletionTargetRow != null}
					onOpenChange={open => !open ? setRestoreDeletionTargetRow(null) : undefined}
					isMutating={isMutating}
					onConfirm={() => startMutationTransition(async () => {
						setGenericMutationError(null);
						try {
							await requestRestoreAction(restoreDeletionTargetRow!.id);
							setRestoreDeletionTargetRow(null);
						} catch(error) {
							setGenericMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["credit-application-manaagement-import"] });
						}
					})}
				/>
			</RelationNavigationProvider>
		</MenuPage>
	);
}
