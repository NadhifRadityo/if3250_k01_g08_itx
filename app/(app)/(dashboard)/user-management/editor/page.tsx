"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { XIcon, PlusIcon, PencilIcon, Trash2Icon, HistoryIcon, CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Switch } from "@/components/radix/Switch";

import { DashboardManagementToolbar, DashboardManagementPageFrame, DashboardManagementPagination } from "../../layout.components";
import * as userActions from "../layout.actions";
import { UserActiveFiltersSummary } from "../layout.components";
import { UserColumnConfigCard } from "../layout.components";
import { UserRequestDeleteDialog } from "../layout.components";
import { UserRequestFilterCard } from "../layout.components";
import { UserRequestFormDrawer } from "../layout.components";
import { UserRequestsTable } from "../layout.components";
import { resolveActionError } from "../layout.components";
import { useUserCellRenderer } from "../layout.components";
import { useUserColumnPreferences } from "../layout.components";
import { useUserFilterColumnConfig } from "../layout.components";
import { useUserManagementQueryState } from "../layout.components";
import { useUserRelations } from "../layout.components";
import { useUserRequestFilters } from "../layout.components";
import { useUserRequestsQuery } from "../layout.components";
import {
	defaultFormState,
	type FormState,
	type ActionError,
	type StagedUserTableRow
} from "../layout.components";

export default function UserManagementEditorPage() {
	const [showSoftDeleted, setShowSoftDeleted] = useState(false);
	const [errorMessage, setErrorMessage] = useState<ActionError | null>(null);
	const queryClient = useQueryClient();

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [formState, setFormState] = useState<FormState>(defaultFormState);
	const [formError, setFormError] = useState<ActionError | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<StagedUserTableRow | null>(null);
	const [isMutating, startMutationTransition] = useTransition();
	const columnPreferences = useUserColumnPreferences();
	const queryState = useUserManagementQueryState();
	const {
		searchRoleOptions,
		searchSupervisorOptions,
		getResolvedFilterColumnConfig
	} = useUserFilterColumnConfig();
	const filters = useUserRequestFilters({ getResolvedFilterColumnConfig });

	const includeSoftDeleted = showSoftDeleted;

	const {
		pageIndex,
		setPageIndex,
		queryResult,
		isLoading,
		queryErrorMessage
	} = useUserRequestsQuery({
		queryScope: "editor",
		queryAction: userActions.queryStagedUsersEditorAction,
		debouncedKeyword: queryState.debouncedKeyword,
		sortTokens: queryState.sortTokens,
		appliedFilters: filters.appliedFilters,
		includeSoftDeleted
	});
	const {
		relationValuesByRowId,
		isRelationLoading
	} = useUserRelations({
		docs: queryResult.docs,
		visibleColumns: columnPreferences.visibleColumns
	});
	const renderUserCell = useUserCellRenderer({ relationValuesByRowId, isRelationLoading });
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
					await queryClient.invalidateQueries({ queryKey: ["user-management"] });
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

	const openEditDialog = (row: StagedUserTableRow) => {
		setFormError(null);
		setFormState({
			stagedUserId: row.id,
			email: row.email,
			name: row.name,
			employeeId: row.employeeId,
			roleId: row.roleId ?? "",
			supervisorId: row.supervisorId ?? "",
			initialPassword: row.initialPassword
		});
		setIsFormOpen(true);
	};

	const submitForm = () => {
		setFormError(null);
		if(formState.email.trim().length == 0)
			return setFormError({ title: "ValidationError", message: "Email is required." });
		if(formState.name.trim().length == 0)
			return setFormError({ title: "ValidationError", message: "Name is required." });
		if(formState.employeeId.trim().length == 0)
			return setFormError({ title: "ValidationError", message: "Employee ID is required." });
		if(formState.roleId.trim().length == 0)
			return setFormError({ title: "ValidationError", message: "Role is required." });
		if(formState.stagedUserId == null && formState.initialPassword.trim().length < 8)
			return setFormError({ title: "ValidationError", message: "Initial password is required for new requests and must be at least 8 characters." });
		runMutation(async () => {
			await userActions.upsertStagedUserRequestAction({
				stagedUserId: formState.stagedUserId,
				email: formState.email,
				name: formState.name,
				employeeId: formState.employeeId,
				roleId: formState.roleId,
				supervisorId: formState.supervisorId.length > 0 ? formState.supervisorId : null,
				initialPassword: formState.initialPassword
			});
			setIsFormOpen(false);
		}, {
			onError: setFormError,
			fallbackMessage: "Failed to save request.",
			clearPageError: false
		});
	};

	const requestDelete = (row: StagedUserTableRow) => {
		runMutation(async () => {
			await userActions.requestDeleteStagedUserAction(row.id);
			setDeleteTarget(null);
		});
	};

	const cancelRequest = (row: StagedUserTableRow) => {
		runMutation(async () => {
			await userActions.cancelStagedUserRequestAction(row.id);
		});
	};

	const requestRestore = (row: StagedUserTableRow) => {
		runMutation(async () => {
			await userActions.requestRestoreStagedUserAction(row.id);
		});
	};

	return (
		<>
			<DashboardManagementPageFrame
				title="User Management"
				description="Manage staged user requests in editor mode before approver review."
			>
				<DashboardManagementToolbar
					keyword={queryState.keyword}
					onKeywordChange={queryState.setKeyword}
					searchPlaceholder="Search staged users by name, email, or employee ID"
					filterCount={filters.appliedFilters.length}
					onToggleFilter={filters.toggleFilterPanel}
					onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
					isLoading={isLoading}
					isMutating={isMutating}
					rightSlot={(
						<>
							<div className="flex items-center gap-2">
								<label htmlFor="user-show-deleted" className="text-sm">Show Deleted</label>
								<Switch
									id="user-show-deleted"
									checked={showSoftDeleted}
									onCheckedChange={checked => setShowSoftDeleted(checked)}
									disabled={isLoading || isMutating}
								/>
							</div>
							<Button type="button" onClick={openCreateDialog} disabled={isLoading || isMutating}>
								<PlusIcon />
								Add Request
							</Button>
						</>
					)}
				/>

				<UserRequestFilterCard
					isLoading={isLoading}
					isMutating={isMutating}
					filters={filters}
					getResolvedFilterColumnConfig={getResolvedFilterColumnConfig}
				/>

				<UserColumnConfigCard
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

				<UserActiveFiltersSummary items={filters.filterSummaryItems} />

				{displayError != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>{displayError.title}</AlertTitle>
						<AlertDescription>{displayError.message}</AlertDescription>
					</Alert>
				) : null}

				<UserRequestsTable
					queryResult={queryResult}
					visibleColumns={columnPreferences.visibleColumns}
					visibleColumnCount={columnPreferences.visibleColumns.length + 1}
					isLoading={isLoading}
					isMutating={isMutating}
					getSortDirection={queryState.getSortDirection}
					onToggleSortField={queryState.toggleSortField}
					renderUserCell={renderUserCell}
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
										Request Restore
									</Button>
								) : row.deletedAt == null ? (
									<Button type="button" size="sm" variant="destructive" onClick={() => setDeleteTarget(row)} disabled={isMutating}>
										<Trash2Icon />
										Request Delete
									</Button>
								) : null}
								{isPending && !row.isSoftDeleted ? (
									<Button type="button" size="sm" variant="secondary" onClick={() => cancelRequest(row)} disabled={isMutating}>
										<XIcon />
										Cancel Request
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

			<UserRequestFormDrawer
				open={isFormOpen}
				onOpenChange={open => {
					setIsFormOpen(open);
					if(!open)
						setFormError(null);
				}}
				formState={formState}
				formError={formError}
				onSearchRoles={searchRoleOptions}
				onSearchSupervisors={searchSupervisorOptions}
				isMutating={isMutating}
				onEmailChange={value => setFormState(previous => ({ ...previous, email: value }))}
				onNameChange={value => setFormState(previous => ({ ...previous, name: value }))}
				onEmployeeIdChange={value => setFormState(previous => ({ ...previous, employeeId: value }))}
				onRoleChange={value => setFormState(previous => ({ ...previous, roleId: value }))}
				onSupervisorChange={value => setFormState(previous => ({ ...previous, supervisorId: value }))}
				onInitialPasswordChange={value => setFormState(previous => ({ ...previous, initialPassword: value }))}
				onSubmit={submitForm}
			/>

			<UserRequestDeleteDialog
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
		</>
	);
}
