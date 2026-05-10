"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PlusIcon, PencilIcon, Trash2Icon, CircleAlertIcon } from "lucide-react";

import { createEmptyReviewComment } from "@/utils/reviewCommentRichText";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Switch } from "@/components/radix/Switch";

import { DashboardManagementToolbar, DashboardManagementPageFrame, DashboardManagementPagination } from "../../layout.components";
import { EntrySummaryDrawer, useDashboardRelationNavigation } from "../../relation-navigation.components";
import * as importActions from "../import.actions";
import {
	resolveActionError,
	CreditApplicationImportRequestsTable,
	useCreditApplicationImportCellRenderer,
	CreditApplicationImportColumnConfigCard,
	defaultCreditApplicationImportFormState,
	useCreditApplicationImportRequestsQuery,
	CreditApplicationImportRequestFilterCard,
	CreditApplicationImportRequestFormDrawer,
	useCreditApplicationImportRequestFilters,
	CreditApplicationImportActiveFiltersSummary,
	CreditApplicationImportRequestDetailsDrawer,
	useCreditApplicationImportColumnPreferences,
	useCreditApplicationImportFilterColumnConfig,
	useCreditApplicationImportManagementQueryState,
	getEligibleDetailTriggerCreditApplicationImportColumnId,
	type ActionError,
	type CreditApplicationImportTableRow
} from "../import.components";

export default function CreditApplicationImportEditorPage() {
	const [showSoftDeleted, setShowSoftDeleted] = useState(false);
	const [formError, setFormError] = useState<ActionError | null>(null);
	const [pageError, setPageError] = useState<ActionError | null>(null);
	const [formOpen, setFormOpen] = useState(false);
	const [detailRow, setDetailRow] = useState<CreditApplicationImportTableRow | null>(null);
	const [formState, setFormState] = useState(defaultCreditApplicationImportFormState);
	const [isMutating, startMutationTransition] = useTransition();

	const queryClient = useQueryClient();
	const relationNavigation = useDashboardRelationNavigation();
	const columnPreferences = useCreditApplicationImportColumnPreferences();
	const queryState = useCreditApplicationImportManagementQueryState();
	const { getResolvedFilterColumnConfig } = useCreditApplicationImportFilterColumnConfig();
	const filters = useCreditApplicationImportRequestFilters({ getResolvedFilterColumnConfig });
	const includeSoftDeleted = showSoftDeleted;

	const {
		pageIndex,
		setPageIndex,
		queryResult,
		isLoading,
		queryErrorMessage
	} = useCreditApplicationImportRequestsQuery({
		queryScope: "import-editor",
		queryAction: importActions.queryCreditApplicationImportEditorAction,
		debouncedKeyword: queryState.debouncedKeyword,
		sortTokens: queryState.sortTokens,
		appliedFilters: filters.appliedFilters,
		isFilterStateReady: filters.isFilterStateReady,
		includeSoftDeleted
	});

	const renderCreditApplicationImportCell = useCreditApplicationImportCellRenderer({
		relations: queryResult.relations,
		relationNavigation: {
			getHrefBase: relationNavigation.getTargetHrefBase,
			onRelationLinkClick: relationNavigation.onRelationLinkClick,
			onOpenSummary: relationNavigation.openSummary
		}
	});

	const detailTriggerColumnId = getEligibleDetailTriggerCreditApplicationImportColumnId(columnPreferences.visibleColumns);
	const displayError = pageError ?? (queryErrorMessage != null ? {
		title: "Error",
		message: queryErrorMessage
	} : null);

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
					setPageError(null);
				try {
					await action();
					await queryClient.invalidateQueries({ queryKey: ["credit-application-management", "imports"] });
				} catch(error) {
					const actionError = resolveActionError(error, options?.fallbackMessage ?? "Operation failed.");
					if(options?.onError != null) {
						options.onError(actionError);
						return;
					}
					setPageError(actionError);
				}
			})();
		});
	};

	const openCreateDialog = () => {
		setFormError(null);
		setFormState(defaultCreditApplicationImportFormState);
		setFormOpen(true);
	};

	const openEditDescriptionDialog = (row: CreditApplicationImportTableRow) => {
		setFormError(null);
		setFormState({
			importId: row.id,
			file: null,
			filename: row.filename,
			filesize: row.filesize,
			fileUrl: row.fileUrl,
			description: row.description ?? createEmptyReviewComment()
		});
		setFormOpen(true);
	};

	const submitForm = () => {
		setFormError(null);

		if(formState.importId == null) {
			if(formState.file == null)
				return setFormError({ title: "ValidationError", message: "Please select an Excel file." });

			runMutation(async () => {
				const formData = new FormData();
				formData.set("file", formState.file!);
				formData.set("description", JSON.stringify(formState.description));
				await importActions.createCreditApplicationImportAction(formData);
				setFormOpen(false);
				setFormState(defaultCreditApplicationImportFormState);
			}, {
				onError: setFormError,
				fallbackMessage: "Failed to upload import.",
				clearPageError: false
			});
			return;
		}

		runMutation(async () => {
			await importActions.updateCreditApplicationImportDescriptionAction({
				importId: formState.importId!,
				description: formState.description
			});
			setFormOpen(false);
			setFormState(defaultCreditApplicationImportFormState);
		}, {
			onError: setFormError,
			fallbackMessage: "Failed to update description.",
			clearPageError: false
		});
	};

	const renderCreditApplicationImportActions = (row: CreditApplicationImportTableRow) => {
		return (
			<>
				{row.reviewedAt == null ? (
					<Button type="button" variant="outline" size="sm" onClick={() => openEditDescriptionDialog(row)} disabled={isMutating || row.deletedAt != null}>
						<PencilIcon />
						Edit
					</Button>
				) : null}
				{row.deletedAt == null && row.status != "approved" ? (
					<Button
						type="button"
						variant="destructive"
						size="sm"
						onClick={() => runMutation(async () => {
							await importActions.deleteCreditApplicationImportAction(row.id);
						})}
						disabled={isMutating}
					>
						<Trash2Icon />
						Delete
					</Button>
				) : null}
				{row.deletedAt != null ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => runMutation(async () => {
							await importActions.restoreCreditApplicationImportAction(row.id);
						})}
						disabled={isMutating}
					>
						<PlusIcon />
						Restore
					</Button>
				) : null}
			</>
		);
	};

	return (
		<>
			<DashboardManagementPageFrame
				title="Credit Application Import"
				description="Upload imports, maintain description before review, and cancel or restore pending or rejected imports."
			>
				<DashboardManagementToolbar
					keyword={queryState.keyword}
					onKeywordChange={queryState.setKeyword}
					searchPlaceholder="Search imports by filename, id, or MIME type"
					filterCount={filters.appliedFilters.length}
					onToggleFilter={filters.toggleFilterPanel}
					onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
					isLoading={isLoading}
					isMutating={isMutating}
					rightSlot={(
						<>
							<div className="flex items-center gap-2">
								<label htmlFor="credit-application-import-show-deleted" className="text-sm">Show Deleted</label>
								<Switch
									id="credit-application-import-show-deleted"
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

				<CreditApplicationImportRequestFilterCard
					isLoading={isLoading}
					isMutating={isMutating}
					filters={filters}
					getResolvedFilterColumnConfig={getResolvedFilterColumnConfig}
				/>

				<CreditApplicationImportColumnConfigCard
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

				<CreditApplicationImportActiveFiltersSummary items={filters.filterSummaryItems} />

				{displayError != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>{displayError.title}</AlertTitle>
						<AlertDescription>{displayError.message}</AlertDescription>
					</Alert>
				) : null}

				<CreditApplicationImportRequestsTable
					queryResult={queryResult}
					visibleColumns={columnPreferences.visibleColumns}
					visibleColumnCount={columnPreferences.visibleColumns.length + 1}
					detailTriggerColumnId={detailTriggerColumnId}
					isLoading={isLoading}
					isMutating={isMutating}
					getSortDirection={queryState.getSortDirection}
					onToggleSortField={queryState.toggleSortField}
					onOpenDetails={setDetailRow}
					renderCreditApplicationImportCell={renderCreditApplicationImportCell}
					renderActions={renderCreditApplicationImportActions}
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

			<CreditApplicationImportRequestDetailsDrawer
				open={detailRow != null}
				onOpenChange={open => {
					if(!open)
						setDetailRow(null);
				}}
				row={detailRow}
				renderActions={renderCreditApplicationImportActions}
				relationNavigation={{
					getHrefBase: relationNavigation.getTargetHrefBase,
					onRelationLinkClick: relationNavigation.onRelationLinkClick,
					onOpenSummary: relationNavigation.openSummary
				}}
			/>

			<CreditApplicationImportRequestFormDrawer
				open={formOpen}
				onOpenChange={open => {
					setFormOpen(open);
					if(!open) {
						setFormError(null);
						setFormState(defaultCreditApplicationImportFormState);
					}
				}}
				formState={formState}
				formError={formError}
				isMutating={isMutating}
				onFormStateChange={setFormState}
				onSubmit={submitForm}
			/>

			<EntrySummaryDrawer {...relationNavigation.summaryDrawerProps} />
		</>
	);
}
