"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { XIcon, PlusIcon, PencilIcon, Trash2Icon, HistoryIcon, CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Switch } from "@/components/radix/Switch";

import { DashboardManagementToolbar, DashboardManagementPageFrame, DashboardManagementPagination } from "../../layout.components";
import { EntrySummaryDrawer, useDashboardRelationNavigation } from "../../relation-navigation.components";
import * as teamActions from "../layout.actions";
import { TeamActiveFiltersSummary } from "../layout.components";
import { TeamColumnConfigCard } from "../layout.components";
import { TeamRequestCancelDialog } from "../layout.components";
import { TeamRequestDeleteDialog } from "../layout.components";
import { TeamRequestFilterCard } from "../layout.components";
import { TeamRequestFormDrawer } from "../layout.components";
import { TeamRequestsTable } from "../layout.components";
import { resolveActionError } from "../layout.components";
import { useTeamCellRenderer } from "../layout.components";
import { useTeamColumnPreferences } from "../layout.components";
import { useTeamFilterColumnConfig } from "../layout.components";
import { useTeamManagementQueryState } from "../layout.components";
import { useTeamRelations } from "../layout.components";
import { useTeamRequestFilters } from "../layout.components";
import { useTeamRequestsQuery } from "../layout.components";
import {
	defaultFormState,
	type FormState,
	type ActionError,
	type TeamTableRow
} from "../layout.components";

export default function TeamManagementEditorPage() {
	const [showSoftDeleted, setShowSoftDeleted] = useState(false);
	const [errorMessage, setErrorMessage] = useState<ActionError | null>(null);
	const queryClient = useQueryClient();

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [formState, setFormState] = useState<FormState>(defaultFormState);
	const [formError, setFormError] = useState<ActionError | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<TeamTableRow | null>(null);
	const [cancelTarget, setCancelTarget] = useState<TeamTableRow | null>(null);
	const [isMutating, startMutationTransition] = useTransition();
	const relationNavigation = useDashboardRelationNavigation();
	const columnPreferences = useTeamColumnPreferences();
	const queryState = useTeamManagementQueryState();
	const {
		searchSupervisorUserOptions,
		searchOfficerUserOptions,
		getResolvedFilterColumnConfig
	} = useTeamFilterColumnConfig();
	const filters = useTeamRequestFilters({ getResolvedFilterColumnConfig });

	const includeSoftDeleted = showSoftDeleted;

	const {
		pageIndex,
		setPageIndex,
		queryResult,
		isLoading,
		queryErrorMessage
	} = useTeamRequestsQuery({
		queryScope: "editor",
		queryAction: teamActions.queryTeamsEditorAction,
		debouncedKeyword: queryState.debouncedKeyword,
		sortTokens: queryState.sortTokens,
		appliedFilters: filters.appliedFilters,
		isFilterStateReady: filters.isFilterStateReady,
		includeSoftDeleted
	});
	const {
		relationValuesByRowId,
		isRelationLoading
	} = useTeamRelations({
		docs: queryResult.docs,
		visibleColumns: columnPreferences.visibleColumns
	});
	const renderTeamCell = useTeamCellRenderer({
		relationValuesByRowId,
		isRelationLoading,
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
					await queryClient.invalidateQueries({ queryKey: ["team-management"] });
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

	const openEditDialog = (row: TeamTableRow) => {
		setFormError(null);
		setFormState({
			teamId: row.id,
			name: row.name,
			supervisorId: row.supervisorId ?? "",
			officerIds: row.officerIds
		});
		setIsFormOpen(true);
	};

	const submitForm = () => {
		setFormError(null);
		if(formState.name.trim().length == 0)
			return setFormError({ title: "ValidationError", message: "Team name is required." });
		if(formState.supervisorId.trim().length == 0)
			return setFormError({ title: "ValidationError", message: "Supervisor is required." });
		if(formState.officerIds.length == 0)
			return setFormError({ title: "ValidationError", message: "At least one officer is required." });
		runMutation(async () => {
			await teamActions.upsertTeamRequestAction({
				teamId: formState.teamId,
				name: formState.name,
				supervisorId: formState.supervisorId,
				officerIds: formState.officerIds
			});
			setIsFormOpen(false);
		}, {
			onError: setFormError,
			fallbackMessage: "Failed to save request.",
			clearPageError: false
		});
	};

	const requestDelete = (row: TeamTableRow) => {
		runMutation(async () => {
			await teamActions.requestDeleteTeamAction(row.id);
			setDeleteTarget(null);
		});
	};

	const cancelRequest = (row: TeamTableRow) => {
		runMutation(async () => {
			await teamActions.cancelTeamRequestAction(row.id);
		});
	};

	const requestRestore = (row: TeamTableRow) => {
		runMutation(async () => {
			await teamActions.requestRestoreTeamAction(row.id);
		});
	};

	return (
		<>
			<DashboardManagementPageFrame
				title="Team Management"
				description="Manage team structure requests in editor mode for supervisor and officer assignments."
			>
				<DashboardManagementToolbar
					keyword={queryState.keyword}
					onKeywordChange={queryState.setKeyword}
					searchPlaceholder="Search teams by team name, supervisor, or officer"
					filterCount={filters.appliedFilters.length}
					onToggleFilter={filters.toggleFilterPanel}
					onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
					isLoading={isLoading}
					isMutating={isMutating}
					rightSlot={(
						<>
							<div className="flex items-center gap-2">
								<label htmlFor="team-show-deleted" className="text-sm">Show Deleted</label>
								<Switch
									id="team-show-deleted"
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

				<TeamRequestFilterCard
					isLoading={isLoading}
					isMutating={isMutating}
					filters={filters}
					getResolvedFilterColumnConfig={getResolvedFilterColumnConfig}
				/>

				<TeamColumnConfigCard
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

				<TeamActiveFiltersSummary items={filters.filterSummaryItems} />

				{displayError != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>{displayError.title}</AlertTitle>
						<AlertDescription>{displayError.message}</AlertDescription>
					</Alert>
				) : null}

				<TeamRequestsTable
					queryResult={queryResult}
					visibleColumns={columnPreferences.visibleColumns}
					visibleColumnCount={columnPreferences.visibleColumns.length + 1}
					isLoading={isLoading}
					isMutating={isMutating}
					getSortDirection={queryState.getSortDirection}
					onToggleSortField={queryState.toggleSortField}
					renderTeamCell={renderTeamCell}
					renderActions={row => {
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
					}}
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

			<TeamRequestFormDrawer
				open={isFormOpen}
				onOpenChange={open => {
					setIsFormOpen(open);
					if(!open)
						setFormError(null);
				}}
				formState={formState}
				formError={formError}
				onSearchSupervisors={searchSupervisorUserOptions}
				onSearchOfficers={searchOfficerUserOptions}
				isMutating={isMutating}
				onNameChange={value => setFormState(previous => ({ ...previous, name: value }))}
				onSupervisorChange={value => setFormState(previous => ({ ...previous, supervisorId: value }))}
				onOfficerIdsChange={values => setFormState(previous => ({ ...previous, officerIds: values }))}
				onSubmit={submitForm}
			/>

			<TeamRequestDeleteDialog
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

			<TeamRequestCancelDialog
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

			{renderTeamCell.relationSummaryPickerDrawer}

			<EntrySummaryDrawer {...relationNavigation.summaryDrawerProps} />
		</>
	);
}
