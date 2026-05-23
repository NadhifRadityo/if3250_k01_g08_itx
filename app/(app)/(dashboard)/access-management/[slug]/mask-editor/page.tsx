"use client";

import { useMemo, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { XIcon, PlusIcon, PencilIcon, Trash2Icon, HistoryIcon, CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Switch } from "@/components/radix/Switch";

import { MenuPage, MenuToolbar, MenuPagination, MenuFilterState, useConfigStorage, MenuFilterSummary, DashboardMenuTable, useDashboardContext, MenuColumnConfigCard, MenuFilterConfigCard, useMenuRowValueRenderer } from "../../../layout.components";
import { RelationNavigationProvider } from "../../../relation-navigation.components";
import { queryMaskEditorAction, cancelMaskRequestAction, requestMaskDeleteAction, requestMaskUpsertAction, requestMaskRestoreAction } from "../mask.actions";
import { MaskColumnData, MaskFormDrawer, toMaskFormState, MaskDeleteDialog, MaskDetailsDrawer, MaskHistoryDrawer, MaskChangeRequestDrawer, MaskCancelPendingRequestDialog, MaskRevertApprovedDialog, MaskRestoreDeletionDialog, buildFilterConfigColumns, buildColumnConfigColumns, buildTableConfigColumns, buildRowValueRendererConfigColumns, buildEligibleDetailsTriggerColumns, buildDefaultColumnOrder, buildDefaultColumnsShown, buildDefaultColumnsSort, type MaskFormState } from "../mask.components";
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
		{ key: "#actions", type: "null", render: (_, row, { isMutating, setEditFormDrawerState, setEditFormDrawerOpen, setDeleteTargetRow, setCancelPendingRequestTargetRow, setRevertApprovedTargetRow, setRestoreDeletionTargetRow }) => (
			<>
				{row.deletedAt == null ? (
					<>
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() => { setEditFormDrawerState!(toMaskFormState(row, maskFields)); setEditFormDrawerOpen!(true); }}
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
		) } satisfies (typeof rowValueRendererConfigColumnsBase)[number]
	]), [rowValueRendererConfigColumnsBase, maskFields]);
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
		queryKey: ["access-management", slug, "mask-editor", {
			keyword,
			filters,
			columnsSort,
			includeDeleted,
			pageIndex
		}],
		queryFn: async () => await queryMaskEditorAction({
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
	const [editFormDrawerState, setEditFormDrawerState] = useState({} as MaskFormState);
	const [editFormDrawerOpen, setEditFormDrawerOpen] = useState(false);
	const [addFormDrawerState, setAddFormDrawerState] = useState({} as MaskFormState);
	const [addFormDrawerOpen, setAddFormDrawerOpen] = useState(false);
	const [isMutating, startMutationTransition] = useTransition();
	const [genericMutationError, setGenericMutationError] = useState(null as any);
	const [editFormMutationError, setEditFormMutationError] = useState(null as any);
	const [addFormMutationError, setAddFormMutationError] = useState(null as any);
	const [deleteTargetRow, setDeleteTargetRow] = useState(null as MaskColumnData | null);
	const [cancelPendingRequestTargetRow, setCancelPendingRequestTargetRow] = useState(null as MaskColumnData | null);
	const [revertApprovedTargetRow, setRevertApprovedTargetRow] = useState(null as MaskColumnData | null);
	const [restoreDeletionTargetRow, setRestoreDeletionTargetRow] = useState(null as MaskColumnData | null);
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
			description="Manage mask requests with editor workflows, including mask field changes."
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
					rightSlot={(
						<>
							{user.roleMenus.includes("access-management#mask-auditor") ? (
								<div className="flex items-center gap-2">
									<label htmlFor="access-management-mask-editor-show-deleted" className="text-sm">
										Show Deleted
									</label>
									<Switch
										id="access-management-mask-editor-show-deleted"
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
				<MaskFormDrawer
					maskFields={maskFields}
					open={editFormDrawerOpen}
					onOpenChange={setEditFormDrawerOpen}
					title="Edit Mask"
					formState={editFormDrawerState}
					onFormStateChange={setEditFormDrawerState}
					isMutating={isMutating}
					mutationError={editFormMutationError}
					onSubmit={() => startMutationTransition(async () => {
						if(editFormDrawerState.name == null || editFormDrawerState.name.trim().length == 0)
							return setEditFormMutationError({ name: "ValidationError", message: "Mask name is required." });
						setEditFormMutationError(null);
						try {
							await requestMaskUpsertAction(slug, editFormDrawerState);
							setEditFormDrawerOpen(false);
							setEditFormDrawerState({});
						} catch(error) {
							setEditFormMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["access-management"] });
						}
					})}
				/>
				<MaskFormDrawer
					maskFields={maskFields}
					open={addFormDrawerOpen}
					onOpenChange={setAddFormDrawerOpen}
					title="Add Mask"
					formState={addFormDrawerState}
					onFormStateChange={setAddFormDrawerState}
					isMutating={isMutating}
					mutationError={addFormMutationError}
					onSubmit={() => startMutationTransition(async () => {
						if(addFormDrawerState.name == null || addFormDrawerState.name.trim().length == 0)
							return setAddFormMutationError({ name: "ValidationError", message: "Mask name is required." });
						setAddFormMutationError(null);
						try {
							await requestMaskUpsertAction(slug, addFormDrawerState);
							setAddFormDrawerOpen(false);
							setAddFormDrawerState({});
						} catch(error) {
							setAddFormMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["access-management"] });
						}
					})}
				/>
				<MaskDeleteDialog
					open={deleteTargetRow != null}
					onOpenChange={open => { if(!open) setDeleteTargetRow(null); }}
					isMutating={isMutating}
					onConfirm={() => startMutationTransition(async () => {
						setGenericMutationError(null);
						try {
							await requestMaskDeleteAction(slug, deleteTargetRow!.id);
							setDeleteTargetRow(null);
						} catch(error) {
							setGenericMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["access-management"] });
						}
					})}
				/>
				<MaskCancelPendingRequestDialog
					open={cancelPendingRequestTargetRow != null}
					onOpenChange={open => { if(!open) setCancelPendingRequestTargetRow(null); }}
					isMutating={isMutating}
					onConfirm={() => startMutationTransition(async () => {
						setGenericMutationError(null);
						try {
							await cancelMaskRequestAction(slug, cancelPendingRequestTargetRow!.id);
							setCancelPendingRequestTargetRow(null);
						} catch(error) {
							setGenericMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["access-management"] });
						}
					})}
				/>
				<MaskRevertApprovedDialog
					open={revertApprovedTargetRow != null}
					onOpenChange={open => { if(!open) setRevertApprovedTargetRow(null); }}
					isMutating={isMutating}
					onConfirm={() => startMutationTransition(async () => {
						setGenericMutationError(null);
						try {
							await cancelMaskRequestAction(slug, revertApprovedTargetRow!.id);
							setRevertApprovedTargetRow(null);
						} catch(error) {
							setGenericMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["access-management"] });
						}
					})}
				/>
				<MaskRestoreDeletionDialog
					open={restoreDeletionTargetRow != null}
					onOpenChange={open => { if(!open) setRestoreDeletionTargetRow(null); }}
					isMutating={isMutating}
					onConfirm={() => startMutationTransition(async () => {
						setGenericMutationError(null);
						try {
							await requestMaskRestoreAction(slug, restoreDeletionTargetRow!.id);
							setRestoreDeletionTargetRow(null);
						} catch(error) {
							setGenericMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["access-management"] });
						}
					})}
				/>
			</RelationNavigationProvider>
		</MenuPage>
	);
}
