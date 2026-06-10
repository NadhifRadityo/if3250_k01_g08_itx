"use client";

import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { XIcon, FlagIcon, PlayIcon, SendIcon, UndoIcon, PhoneIcon, KeyRoundIcon, NavigationIcon, StopCircleIcon, CircleAlertIcon, ExternalLinkIcon } from "lucide-react";

import { uwsa } from "@/utils/actions";
import { lexicalPlainText } from "@/utils/payload";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";

import { MenuPage, MenuToolbar, MenuPagination, MenuFilterState, useConfigStorage, MenuFilterSummary, DashboardMenuTable, MenuColumnConfigCard, MenuFilterConfigCard, useMenuRowValueRenderer } from "../../layout.components";
import { RelationNavigationProvider } from "../../relation-navigation.components";
import { queryAction, cancelAction, finishAction, activateAction, inputOtpAction, getActiveAction, getDetailsAction, undoFinishAction, clearActiveAction, sendOtpMessageAction, sendSatisfactionSurveyMessageAction } from "../executor.actions";
import { ColumnData, CancelDialog, FinishDialog, DetailsDrawer, SendOtpDialog, ActivateDialog, InputOtpDialog, UndoFinishDialog, ClearActiveDialog, defaultColumnOrder, defaultColumnsSort, tableConfigColumns, columnConfigColumns, defaultColumnsShown, filterConfigColumns, GeofenceWarningDialog, ActivateLocationButton, SendSatisfactionSurveyDialog, eligibleDetailsTriggerColumns, rowValueRendererConfigColumns } from "../executor.components";
import { computeOfficerTaskStatus } from "../layout.shared";

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
	{ key: "#actions", type: "null", render: (_, row, { activeOfficerTask, isMutating, onActivate, onClearActive, onSendOtp, onInputOtp, onFillSurvey, onFinish, onUndoFinish, onCancel, onSendSatisfactionSurvey, onCall, onDirection }) => {
		const isActive = activeOfficerTask?.id == row.id;
		const otpEntered = isActive && (activeOfficerTask?.otpEntered ?? false);
		const status = computeOfficerTaskStatus({ row: row, isActive: isActive, dueDate: row.creditApplicationAssignmentDueDate });
		const isSettledFinished = row.settlementStatus == "finished" && row.evaluatedAt == null;
		const isBeforeDueDate = row.creditApplicationAssignmentDueDate == null || Date.now() < Date.parse(row.creditApplicationAssignmentDueDate);
		return (
			<>
				{status == "pending" && !isActive ? (
					<Button type="button" size="sm" variant="default" onClick={() => onActivate!(row)} disabled={isMutating}>
						<PlayIcon />Activate
					</Button>
				) : null}
				{isActive ? (
					<Button type="button" size="sm" variant="outline" onClick={() => onClearActive!(row)} disabled={isMutating}>
						<StopCircleIcon />Clear Active
					</Button>
				) : null}
				{isActive && !otpEntered ? (
					<>
						<Button type="button" size="sm" variant="outline" onClick={() => onSendOtp!(row)} disabled={isMutating}>
							<SendIcon />Send OTP
						</Button>
						<Button type="button" size="sm" variant="outline" onClick={() => onInputOtp!(row)} disabled={isMutating}>
							<KeyRoundIcon />Input OTP
						</Button>
					</>
				) : null}
				{isActive && otpEntered && !row.hasSurveyResult ? (
					<Button type="button" size="sm" variant="outline" onClick={() => onFillSurvey!(row)} disabled={isMutating}>
						<ExternalLinkIcon />Fill Survey
					</Button>
				) : null}
				{row.hasSurveyResult && row.settledAt == null ? (
					<Button type="button" size="sm" variant="default" onClick={() => onFinish!(row)} disabled={isMutating}>
						<FlagIcon />Finish
					</Button>
				) : null}
				{isSettledFinished ? (
					<Button type="button" size="sm" variant="outline" onClick={() => onUndoFinish!(row)} disabled={isMutating}>
						<UndoIcon />Undo Finish
					</Button>
				) : null}
				{status == "pending" || isActive ? (
					<Button type="button" size="sm" variant="destructive" onClick={() => onCancel!(row)} disabled={isMutating}>
						<XIcon />Cancel
					</Button>
				) : null}
				{row.settlementStatus == "finished" && !row.hasSatisfactionSurveyResult ? (
					<Button type="button" size="sm" variant="outline" onClick={() => onSendSatisfactionSurvey!(row)} disabled={isMutating}>
						<SendIcon />Send Satisfaction Survey
					</Button>
				) : null}
				{isActive || isBeforeDueDate ? (
					<Button type="button" size="sm" variant="outline" onClick={() => onCall!(row)} disabled={isMutating}>
						<PhoneIcon />Call
					</Button>
				) : null}
				{isActive || isBeforeDueDate ? (
					<Button type="button" size="sm" variant="outline" onClick={() => onDirection!(row)} disabled={(isMutating ?? false) || (row.creditApplicationAddresses?.length ?? 0) == 0}>
						<NavigationIcon />Direction
					</Button>
				) : null}
			</>
		);
	} } satisfies (typeof rowValueRendererConfigColumns)[number]
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
	const [filters, setFilters] = useConfigStorage({ localStorageKey: "officer-task.filters", updateIfThisSearhParamExists: "filters", defaultValue: [] as MenuFilterState[] });
	const [filterConfigCardOpen, setFilterConfigCardOpen] = useState(filters.length > 0);
	const [columnsSort, setColumnsSort] = useConfigStorage<[string, boolean][]>({ localStorageKey: "officer-task.columns-sort", updateIfThisSearhParamExists: "columnsSort", defaultValue: defaultColumnsSort });
	const [pageIndex, setPageIndex] = useState(1);
	const query = useQuery({
		queryKey: ["officer-task", "executor", {
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
	const activeQuery = useQuery({
		queryKey: ["officer-task", "active"],
		queryFn: async () => await uwsa(getActiveAction)(),
		refetchInterval: 30000,
		refetchOnWindowFocus: true
	});
	const [detailsDrawerRow, setDetailsDrawerRow] = useState(null as ColumnData | null);
	const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
	const [activateTargetRow, setActivateTargetRow] = useState(null as ColumnData | null);
	const [clearActiveTargetRow, setClearActiveTargetRow] = useState(null as ColumnData | null);
	const [sendOtpTargetRow, setSendOtpTargetRow] = useState(null as ColumnData | null);
	const [inputOtpTargetRow, setInputOtpTargetRow] = useState(null as ColumnData | null);
	const [inputOtpValue, setInputOtpValue] = useState("");
	const [finishTargetRow, setFinishTargetRow] = useState(null as ColumnData | null);
	const [finishSettlementComment, setFinishSettlementComment] = useState(lexicalPlainText(""));
	const [undoFinishTargetRow, setUndoFinishTargetRow] = useState(null as ColumnData | null);
	const [cancelTargetRow, setCancelTargetRow] = useState(null as ColumnData | null);
	const [cancelSettlementComment, setCancelSettlementComment] = useState(lexicalPlainText(""));
	const [sendSatisfactionSurveyTargetRow, setSendSatisfactionSurveyTargetRow] = useState(null as ColumnData | null);
	const [geofenceWarningOpen, setGeofenceWarningOpen] = useState(false);
	const [genericMutationError, setGenericMutationError] = useState(null as any);
	const [inputOtpMutationError, setInputOtpMutationError] = useState(null as any);
	const [finishMutationError, setFinishMutationError] = useState(null as any);
	const [cancelMutationError, setCancelMutationError] = useState(null as any);
	const [isMutating, startMutationTransition] = useTransition();
	const rowValueRendererContext = {
		relationValues: query.data?.relations,
		activeOfficerTask: activeQuery.data,
		isMutating: isMutating,
		onActivate: setActivateTargetRow,
		onClearActive: setClearActiveTargetRow,
		onSendOtp: setSendOtpTargetRow,
		onInputOtp: (row: ColumnData) => { setInputOtpTargetRow(row); setInputOtpValue(""); setInputOtpMutationError(null); },
		onFillSurvey: (row: ColumnData) => { window.open(`/fill-survey/${row.id}`, "_blank"); },
		onFinish: (row: ColumnData) => { setFinishTargetRow(row); setFinishSettlementComment(lexicalPlainText("")); setFinishMutationError(null); },
		onUndoFinish: setUndoFinishTargetRow,
		onCancel: (row: ColumnData) => { setCancelTargetRow(row); setCancelSettlementComment(lexicalPlainText("")); setCancelMutationError(null); },
		onSendSatisfactionSurvey: setSendSatisfactionSurveyTargetRow,
		onCall: (row: ColumnData) => { window.open(`/call/${row.id}`, "_blank"); },
		onDirection: (row: ColumnData) => {
			const addresses = row.creditApplicationAddresses ?? [];
			if(addresses.length == 0) return;
			window.open(`https://www.google.com/maps/dir/?api=1&origin=&destination=${encodeURIComponent(addresses[addresses.length - 1])}${addresses.length > 1 ? `&waypoints=${addresses.slice(0, -1).map(a => encodeURIComponent(a)).join("|")}` : ""}&travelmode=driving`, "_blank");
		}
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
			description="Execute your assigned officer tasks: activate, send OTP, fill surveys, and finish or cancel as needed."
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
					rightSlot={(<ActivateLocationButton disabled={query.isLoading || isMutating} />)}
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
						<AlertDescription>{`${genericMutationError?.message ?? "An error occured while mutating data."}`}</AlertDescription>
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
					onChainNavigate={async id => {
						const result = await uwsa(getDetailsAction)(id);
						setDetailsDrawerRow(result.row);
					}}
				/>
				<ActivateDialog
					open={activateTargetRow != null}
					onOpenChange={v => { if(!v) setActivateTargetRow(null); }}
					isMutating={isMutating}
					onConfirm={() => startMutationTransition(async () => {
						setGenericMutationError(null);
						try {
							if(activateTargetRow != null)
								await uwsa(activateAction)({ id: activateTargetRow.id });
							setActivateTargetRow(null);
						} catch(error) {
							setGenericMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["officer-task"] });
						}
					})}
				/>
				<ClearActiveDialog
					open={clearActiveTargetRow != null}
					onOpenChange={v => { if(!v) setClearActiveTargetRow(null); }}
					isMutating={isMutating}
					onConfirm={() => startMutationTransition(async () => {
						setGenericMutationError(null);
						try {
							await uwsa(clearActiveAction)();
							setClearActiveTargetRow(null);
						} catch(error) {
							setGenericMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["officer-task"] });
						}
					})}
				/>
				<SendOtpDialog
					open={sendOtpTargetRow != null}
					onOpenChange={v => { if(!v) setSendOtpTargetRow(null); }}
					isMutating={isMutating}
					onConfirm={() => startMutationTransition(async () => {
						setGenericMutationError(null);
						try {
							if(sendOtpTargetRow != null)
								await uwsa(sendOtpMessageAction)({ id: sendOtpTargetRow.id });
							setSendOtpTargetRow(null);
						} catch(error) {
							setGenericMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["officer-task"] });
						}
					})}
				/>
				<InputOtpDialog
					open={inputOtpTargetRow != null}
					onOpenChange={v => { if(!v) setInputOtpTargetRow(null); }}
					otp={inputOtpValue}
					onOtpChange={setInputOtpValue}
					mutationError={inputOtpMutationError}
					isMutating={isMutating}
					onConfirm={() => startMutationTransition(async () => {
						setInputOtpMutationError(null);
						try {
							if(inputOtpTargetRow != null)
								await uwsa(inputOtpAction)({ id: inputOtpTargetRow.id, otp: inputOtpValue });
							setInputOtpTargetRow(null);
							setInputOtpValue("");
						} catch(error) {
							if(`${error?.message}`.includes("geofence"))
								setGeofenceWarningOpen(true);
							setInputOtpMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["officer-task"] });
						}
					})}
				/>
				<FinishDialog
					open={finishTargetRow != null}
					onOpenChange={v => { if(!v) setFinishTargetRow(null); }}
					settlementComment={finishSettlementComment}
					onSettlementCommentChange={setFinishSettlementComment}
					mutationError={finishMutationError}
					isMutating={isMutating}
					onConfirm={() => startMutationTransition(async () => {
						setFinishMutationError(null);
						try {
							if(finishTargetRow != null)
								await uwsa(finishAction)({ id: finishTargetRow.id, settlementComment: finishSettlementComment });
							setFinishTargetRow(null);
							setFinishSettlementComment(lexicalPlainText(""));
						} catch(error) {
							setFinishMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["officer-task"] });
						}
					})}
				/>
				<UndoFinishDialog
					open={undoFinishTargetRow != null}
					onOpenChange={v => { if(!v) setUndoFinishTargetRow(null); }}
					isMutating={isMutating}
					onConfirm={() => startMutationTransition(async () => {
						setGenericMutationError(null);
						try {
							if(undoFinishTargetRow != null)
								await uwsa(undoFinishAction)({ id: undoFinishTargetRow.id });
							setUndoFinishTargetRow(null);
						} catch(error) {
							setGenericMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["officer-task"] });
						}
					})}
				/>
				<CancelDialog
					open={cancelTargetRow != null}
					onOpenChange={v => { if(!v) setCancelTargetRow(null); }}
					settlementComment={cancelSettlementComment}
					onSettlementCommentChange={setCancelSettlementComment}
					mutationError={cancelMutationError}
					isMutating={isMutating}
					onConfirm={() => startMutationTransition(async () => {
						setCancelMutationError(null);
						try {
							if(cancelTargetRow != null)
								await uwsa(cancelAction)({ id: cancelTargetRow.id, settlementComment: cancelSettlementComment });
							setCancelTargetRow(null);
							setCancelSettlementComment(lexicalPlainText(""));
						} catch(error) {
							setCancelMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["officer-task"] });
						}
					})}
				/>
				<SendSatisfactionSurveyDialog
					open={sendSatisfactionSurveyTargetRow != null}
					onOpenChange={v => { if(!v) setSendSatisfactionSurveyTargetRow(null); }}
					isMutating={isMutating}
					onConfirm={() => startMutationTransition(async () => {
						setGenericMutationError(null);
						try {
							if(sendSatisfactionSurveyTargetRow != null)
								await uwsa(sendSatisfactionSurveyMessageAction)({ id: sendSatisfactionSurveyTargetRow.id });
							setSendSatisfactionSurveyTargetRow(null);
						} catch(error) {
							setGenericMutationError(error);
						} finally {
							await queryClient.invalidateQueries({ queryKey: ["officer-task"] });
						}
					})}
				/>
				<GeofenceWarningDialog open={geofenceWarningOpen} onOpenChange={setGeofenceWarningOpen} />
			</RelationNavigationProvider>
		</MenuPage>
	);
}
