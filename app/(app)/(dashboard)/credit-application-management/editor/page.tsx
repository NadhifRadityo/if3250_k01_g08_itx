"use client";

import { useMemo, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { XIcon, PlusIcon, PencilIcon, Trash2Icon, HistoryIcon, CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Switch } from "@/components/radix/Switch";

import { DashboardManagementToolbar, DashboardManagementPageFrame, DashboardManagementPagination } from "../../layout.components";
import { EntrySummaryDrawer, useDashboardRelationNavigation } from "../../relation-navigation.components";
import * as creditApplicationActions from "../layout.actions";
import { CreditApplicationActiveFiltersSummary } from "../layout.components";
import { CreditApplicationColumnConfigCard } from "../layout.components";
import { CreditApplicationRequestCancelDialog } from "../layout.components";
import { CreditApplicationRequestDeleteDialog } from "../layout.components";
import { CreditApplicationRequestDetailsDrawer } from "../layout.components";
import { CreditApplicationRequestChangePreviewDrawer } from "../layout.components";
import { CreditApplicationRequestFilterCard } from "../layout.components";
import { CreditApplicationRequestFormDrawer } from "../layout.components";
import { CreditApplicationRequestsTable } from "../layout.components";
import { getEligibleDetailTriggerCreditApplicationColumnId } from "../layout.components";
import { resolveActionError } from "../layout.components";
import { useCreditApplicationCellRenderer } from "../layout.components";
import { useCreditApplicationColumnPreferences } from "../layout.components";
import { useCreditApplicationFilterColumnConfig } from "../layout.components";
import { useCreditApplicationManagementQueryState } from "../layout.components";
import { useCreditApplicationRelations } from "../layout.components";
import { useCreditApplicationRequestFilters } from "../layout.components";
import { useCreditApplicationRequestsQuery } from "../layout.components";
import {
	defaultFormState,
	type FormState,
	type ActionError,
	type CreditApplicationTableRow
} from "../layout.components";

export default function CreditApplicationManagementEditorPage() {
	const parseOptionalNumber = (value: string, label: string): number | null => {
		const trimmed = value.trim();
		if(trimmed.length == 0)
			return null;
		const parsed = Number(trimmed);
		if(Number.isNaN(parsed))
			throw new Error(`${label} must be a valid number.`);
		return parsed;
	};

	const toDateInputValue = (value: string | null): string => {
		if(value == null)
			return "";
		const date = new Date(value);
		if(Number.isNaN(date.getTime()))
			return "";
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
	};

	const [showSoftDeleted, setShowSoftDeleted] = useState(false);
	const [errorMessage, setErrorMessage] = useState<ActionError | null>(null);
	const queryClient = useQueryClient();

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [formState, setFormState] = useState<FormState>(defaultFormState);
	const [formError, setFormError] = useState<ActionError | null>(null);
	const [detailRow, setDetailRow] = useState<CreditApplicationTableRow | null>(null);
	const [requestChangeRow, setRequestChangeRow] = useState<CreditApplicationTableRow | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<CreditApplicationTableRow | null>(null);
	const [cancelTarget, setCancelTarget] = useState<CreditApplicationTableRow | null>(null);
	const [isMutating, startMutationTransition] = useTransition();
	const relationNavigation = useDashboardRelationNavigation();
	const columnPreferences = useCreditApplicationColumnPreferences();
	const queryState = useCreditApplicationManagementQueryState();
	const { getResolvedFilterColumnConfig } = useCreditApplicationFilterColumnConfig();
	const filters = useCreditApplicationRequestFilters({ getResolvedFilterColumnConfig });

	const includeSoftDeleted = showSoftDeleted;

	const {
		pageIndex,
		setPageIndex,
		queryResult,
		isLoading,
		queryErrorMessage
	} = useCreditApplicationRequestsQuery({
		queryScope: "editor",
		queryAction: creditApplicationActions.queryCreditApplicationsEditorAction,
		debouncedKeyword: queryState.debouncedKeyword,
		sortTokens: queryState.sortTokens,
		appliedFilters: filters.appliedFilters,
		isFilterStateReady: filters.isFilterStateReady,
		includeSoftDeleted
	});
	const {
		relationValuesByRowId,
		isRelationLoading
	} = useCreditApplicationRelations({
		docs: queryResult.docs,
		visibleColumns: columnPreferences.visibleColumns
	});
	const renderCreditApplicationCell = useCreditApplicationCellRenderer({
		relationValuesByRowId,
		isRelationLoading,
		onOpenRequestChanges: setRequestChangeRow,
		relationNavigation: {
			getHrefBase: relationNavigation.getTargetHrefBase,
			onRelationLinkClick: relationNavigation.onRelationLinkClick,
			onOpenSummary: relationNavigation.openSummary
		}
	});
	const displayError = errorMessage ?? (queryErrorMessage != null ? {
		title: "Error",
		message: queryErrorMessage
	} : null);
	const detailTriggerColumnId = useMemo(() => getEligibleDetailTriggerCreditApplicationColumnId(columnPreferences.visibleColumns), [columnPreferences.visibleColumns]);

	const runMutation = (
		action: () => Promise<void>,
		options?: {
			onError?: (error: ActionError) => void;
			fallbackMessage?: string;
			clearPageError?: boolean;
		}
	) => {
		startMutationTransition(() => {
			void (async () => {
				if(options?.clearPageError ?? true)
					setErrorMessage(null);
				try {
					await action();
					await queryClient.invalidateQueries({ queryKey: ["credit-application-management"] });
				} catch(error) {
					const actionError = resolveActionError(error, options?.fallbackMessage ?? "Operation failed.");
					if(options?.onError != null) {
						options.onError(actionError);
						return;
					}
					setErrorMessage(actionError);
				}
			})();
		});
	};

	const openCreateDialog = () => {
		setFormError(null);
		setFormState(defaultFormState);
		setIsFormOpen(true);
	};

	const openEditDialog = (row: CreditApplicationTableRow) => {
		setFormError(null);
		setFormState({
			creditApplicationId: row.id,
			name: row.name,
			email: row.email,
			addresses: row.addresses,
			phoneNumbers: row.phoneNumbers,
			whatsappNumber: row.whatsappNumber,
			smsNumber: row.smsNumber,
			collateralRegistryName: row.collateralRegistryName,
			collateralName: row.collateralName,
			collateralDescription: row.collateralDescription,
			assetId: row.assetId,
			assetName: row.assetName,
			assetDescription: row.assetDescription,
			period: row.period == null ? "" : String(row.period),
			installment: row.installment == null ? "" : String(row.installment),
			downPayment: row.downPayment == null ? "" : String(row.downPayment),
			plafond: row.plafond == null ? "" : String(row.plafond),
			vendor: row.vendor,
			remarks: row.remarks,
			otherText1: row.otherText1,
			otherText2: row.otherText2,
			otherNumber1: row.otherNumber1 == null ? "" : String(row.otherNumber1),
			otherNumber2: row.otherNumber2 == null ? "" : String(row.otherNumber2),
			otherDate1: toDateInputValue(row.otherDate1),
			otherDate2: toDateInputValue(row.otherDate2),
			others: row.others
		});
		setIsFormOpen(true);
	};

	const submitForm = () => {
		setFormError(null);
		const addresses = formState.addresses
			.map(address => address.trim())
			.filter(address => address.length > 0);
		const phoneNumbers = formState.phoneNumbers
			.map(phoneNumber => phoneNumber.trim())
			.filter(phoneNumber => phoneNumber.length > 0);
		if(formState.name.trim().length == 0)
			return setFormError({ title: "ValidationError", message: "Applicant name is required." });
		if(addresses.length == 0)
			return setFormError({ title: "ValidationError", message: "At least one address is required." });
		if(phoneNumbers.length == 0)
			return setFormError({ title: "ValidationError", message: "At least one phone number is required." });
		if(formState.whatsappNumber.trim().length == 0)
			return setFormError({ title: "ValidationError", message: "Whatsapp number is required." });

		let period: number | null;
		let installment: number | null;
		let downPayment: number | null;
		let plafond: number | null;
		let otherNumber1: number | null;
		let otherNumber2: number | null;
		try {
			period = parseOptionalNumber(formState.period, "Period");
			installment = parseOptionalNumber(formState.installment, "Installment");
			downPayment = parseOptionalNumber(formState.downPayment, "Down Payment");
			plafond = parseOptionalNumber(formState.plafond, "Plafond");
			otherNumber1 = parseOptionalNumber(formState.otherNumber1, "Other Number 1");
			otherNumber2 = parseOptionalNumber(formState.otherNumber2, "Other Number 2");
		} catch(error) {
			const message = error instanceof Error ? error.message : "Invalid numeric value.";
			return setFormError({ title: "ValidationError", message });
		}

		runMutation(async () => {
			await creditApplicationActions.upsertCreditApplicationRequestAction({
				creditApplicationId: formState.creditApplicationId,
				name: formState.name,
				email: formState.email,
				addresses,
				phoneNumbers,
				whatsappNumber: formState.whatsappNumber,
				smsNumber: formState.smsNumber,
				collateralRegistryName: formState.collateralRegistryName,
				collateralName: formState.collateralName,
				collateralDescription: formState.collateralDescription,
				assetId: formState.assetId,
				assetName: formState.assetName,
				assetDescription: formState.assetDescription,
				period,
				installment,
				downPayment,
				plafond,
				vendor: formState.vendor,
				remarks: formState.remarks,
				otherText1: formState.otherText1,
				otherText2: formState.otherText2,
				otherNumber1,
				otherNumber2,
				otherDate1: formState.otherDate1.trim().length > 0 ? formState.otherDate1 : null,
				otherDate2: formState.otherDate2.trim().length > 0 ? formState.otherDate2 : null,
				others: formState.others
			});
			setIsFormOpen(false);
		}, {
			onError: setFormError,
			fallbackMessage: "Failed to save request.",
			clearPageError: false
		});
	};

	const requestDelete = (row: CreditApplicationTableRow) => {
		runMutation(async () => {
			await creditApplicationActions.requestDeleteCreditApplicationAction(row.id);
			setDeleteTarget(null);
		});
	};

	const cancelRequest = (row: CreditApplicationTableRow) => {
		runMutation(async () => {
			await creditApplicationActions.cancelCreditApplicationRequestAction(row.id);
		});
	};

	const requestRestore = (row: CreditApplicationTableRow) => {
		runMutation(async () => {
			await creditApplicationActions.requestRestoreCreditApplicationAction(row.id);
		});
	};

	const rendercreditApplicationActions = (row: CreditApplicationTableRow) => {
		const isPending = row.reviewedAt == null;
		const isRejected = row.reviewedAt != null && row.reviewApproved == false;

		return (
			<>
				<Button type="button" size="sm" variant="outline" onClick={() => openEditDialog(row)} disabled={isMutating || row.isSoftDeleted}>
					<PencilIcon />
					Edit
				</Button>
				{row.isSoftDeleted ? (
					<Button type="button" size="sm" variant="outline" onClick={() => requestRestore(row)} disabled={isMutating}>
						<PlusIcon />
						Restore
					</Button>
				) : row.deletedAt == null ? (
					<Button type="button" size="sm" variant="destructive" onClick={() => setDeleteTarget(row)} disabled={isMutating}>
						<Trash2Icon />
						Delete
					</Button>
				) : null}
				{isPending && !row.isSoftDeleted ? (
					<Button type="button" size="sm" variant="secondary" onClick={() => setCancelTarget(row)} disabled={isMutating}>
						<XIcon />
						Cancel
					</Button>
				) : null}
				{isRejected && !row.isSoftDeleted ? (
					<Button type="button" size="sm" variant="secondary" onClick={() => cancelRequest(row)} disabled={isMutating}>
						<HistoryIcon />
						Restore Approved
					</Button>
				) : null}
			</>
		);
	};

	return (
		<>
			<DashboardManagementPageFrame
				title="Credit Application Management"
				description="Manage credit application requests with full applicant, collateral, asset, and financial data updates."
			>
				<DashboardManagementToolbar
					keyword={queryState.keyword}
					onKeywordChange={queryState.setKeyword}
					searchPlaceholder="Search credit applications by applicant, contact, collateral, asset, or vendor"
					filterCount={filters.appliedFilters.length}
					onToggleFilter={filters.toggleFilterPanel}
					onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
					isLoading={isLoading}
					isMutating={isMutating}
					rightSlot={(
						<>
							<div className="flex items-center gap-2">
								<label htmlFor="credit-application-show-deleted" className="text-sm">Show Deleted</label>
								<Switch
									id="credit-application-show-deleted"
									checked={showSoftDeleted}
									onCheckedChange={checked => setShowSoftDeleted(checked)}
									disabled={isLoading || isMutating}
								/>
							</div>
							<Button type="button" onClick={openCreateDialog} disabled={isLoading || isMutating}>
								<PlusIcon />
								Add
							</Button>
						</>
					)}
				/>

				<CreditApplicationRequestFilterCard
					isLoading={isLoading}
					isMutating={isMutating}
					filters={filters}
					getResolvedFilterColumnConfig={getResolvedFilterColumnConfig}
				/>

				<CreditApplicationColumnConfigCard
					isOpen={columnPreferences.isColumnOpen}
					onOpenChange={columnPreferences.setIsColumnOpen}
					orderedColumns={columnPreferences.orderedColumns}
					hiddenColumnIds={columnPreferences.hiddenColumnIds}
					visibleColumnCount={columnPreferences.visibleColumns.length}
					onToggleColumnVisibility={columnPreferences.toggleColumnVisibility}
					onReset={columnPreferences.resetColumnPreferences}
					onColumnDragStart={columnPreferences.handleColumnDragStart}
					onColumnDragOver={columnPreferences.handleColumnDragOver}
					onColumnDragEnd={columnPreferences.handleColumnDragEnd}
				/>

				<CreditApplicationActiveFiltersSummary items={filters.filterSummaryItems} />

				{displayError != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>{displayError.title}</AlertTitle>
						<AlertDescription>{displayError.message}</AlertDescription>
					</Alert>
				) : null}

				<CreditApplicationRequestsTable
					queryResult={queryResult}
					visibleColumns={columnPreferences.visibleColumns}
					visibleColumnCount={columnPreferences.visibleColumns.length + 1}
					detailTriggerColumnId={detailTriggerColumnId}
					isLoading={isLoading}
					isMutating={isMutating}
					getSortDirection={queryState.getSortDirection}
					onToggleSortField={queryState.toggleSortField}
					onOpenDetails={setDetailRow}
					renderCreditApplicationCell={renderCreditApplicationCell}
					renderActions={rendercreditApplicationActions}
				/>

				<DashboardManagementPagination
					pageIndex={pageIndex}
					totalRequests={queryResult.totalDocs}
					hasPreviousPage={queryResult.hasPreviousPage}
					hasNextPage={queryResult.hasNextPage}
					isLoading={isLoading}
					isMutating={isMutating}
					onPrevious={() => setPageIndex(previous => Math.max(previous - 1, 1))}
					onNext={() => setPageIndex(previous => previous + 1)}
				/>
			</DashboardManagementPageFrame>

			<CreditApplicationRequestDetailsDrawer
				open={detailRow != null}
				onOpenChange={open => {
					if(!open)
						setDetailRow(null);
				}}
				row={detailRow}
				renderActions={rendercreditApplicationActions}
				onOpenRequestChanges={setRequestChangeRow}
				relationNavigation={{
					getHrefBase: relationNavigation.getTargetHrefBase,
					onRelationLinkClick: relationNavigation.onRelationLinkClick,
					onOpenSummary: relationNavigation.openSummary
				}}
			/>

			<CreditApplicationRequestChangePreviewDrawer
				open={requestChangeRow != null}
				onOpenChange={open => {
					if(!open)
						setRequestChangeRow(null);
				}}
				row={requestChangeRow}
			/>

			<CreditApplicationRequestFormDrawer
				open={isFormOpen}
				onOpenChange={open => {
					setIsFormOpen(open);
					if(!open)
						setFormError(null);
				}}
				formState={formState}
				formError={formError}
				isMutating={isMutating}
				onFormStateChange={setFormState}
				onSubmit={submitForm}
			/>

			<CreditApplicationRequestDeleteDialog
				open={deleteTarget != null}
				onOpenChange={open => {
					if(!open)
						setDeleteTarget(null);
				}}
				onConfirm={() => {
					if(deleteTarget != null)
						requestDelete(deleteTarget);
				}}
				isMutating={isMutating}
			/>

			<CreditApplicationRequestCancelDialog
				open={cancelTarget != null}
				onOpenChange={open => {
					if(!open)
						setCancelTarget(null);
				}}
				onConfirm={() => {
					if(cancelTarget != null) {
						cancelRequest(cancelTarget);
						setCancelTarget(null);
					}
				}}
				isMutating={isMutating}
			/>

			<EntrySummaryDrawer {...relationNavigation.summaryDrawerProps} />
		</>
	);
}
