"use client";

import { useMemo, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { XIcon, PlusIcon, PencilIcon, Trash2Icon, HistoryIcon, CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Switch } from "@/components/radix/Switch";

import { DashboardManagementToolbar, DashboardManagementPageFrame, DashboardManagementPagination } from "../../layout.components";
import { EntrySummaryDrawer, useDashboardRelationNavigation } from "../../relation-navigation.components";
import * as roleActions from "../layout.actions";
import { RoleActiveFiltersSummary } from "../layout.components";
import { RoleColumnConfigCard } from "../layout.components";
import { RoleRequestCancelDialog } from "../layout.components";
import { RoleRequestDeleteDialog } from "../layout.components";
import { RoleRequestDetailsDrawer } from "../layout.components";
import { RoleRequestChangePreviewDrawer } from "../layout.components";
import { RoleRequestFilterCard } from "../layout.components";
import { RoleRequestFormDrawer } from "../layout.components";
import { RoleRequestsTable } from "../layout.components";
import { getEligibleDetailTriggerRoleColumnId } from "../layout.components";
import { resolveActionError } from "../layout.components";
import { useRoleCellRenderer } from "../layout.components";
import { useRoleColumnPreferences } from "../layout.components";
import { useRoleFilterColumnConfig } from "../layout.components";
import { useRoleManagementQueryState } from "../layout.components";
import { useRoleRelations } from "../layout.components";
import { useRoleRequestFilters } from "../layout.components";
import { useRoleRequestsQuery } from "../layout.components";
import {
	roleMenuOptions,
	defaultFormState,
	type RoleMenu,
	type FormState,
	type ActionError,
	type RoleTableRow
} from "../layout.components";

export default function RoleManagementEditorPage() {
	const [showSoftDeleted, setShowSoftDeleted] = useState(false);
	const [errorMessage, setErrorMessage] = useState<ActionError | null>(null);
	const queryClient = useQueryClient();

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [formState, setFormState] = useState<FormState>(defaultFormState);
	const [formError, setFormError] = useState<ActionError | null>(null);
	const [detailRow, setDetailRow] = useState<RoleTableRow | null>(null);
	const [requestChangeRow, setRequestChangeRow] = useState<RoleTableRow | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<RoleTableRow | null>(null);
	const [cancelTarget, setCancelTarget] = useState<RoleTableRow | null>(null);
	const [isMutating, startMutationTransition] = useTransition();
	const relationNavigation = useDashboardRelationNavigation();
	const columnPreferences = useRoleColumnPreferences();
	const queryState = useRoleManagementQueryState();
	const { getResolvedFilterColumnConfig } = useRoleFilterColumnConfig();
	const filters = useRoleRequestFilters({ getResolvedFilterColumnConfig });

	const includeSoftDeleted = showSoftDeleted;

	const {
		pageIndex,
		setPageIndex,
		queryResult,
		isLoading,
		queryErrorMessage
	} = useRoleRequestsQuery({
		queryScope: "editor",
		queryAction: roleActions.queryRolesEditorAction,
		debouncedKeyword: queryState.debouncedKeyword,
		sortTokens: queryState.sortTokens,
		appliedFilters: filters.appliedFilters,
		isFilterStateReady: filters.isFilterStateReady,
		includeSoftDeleted
	});
	const {
		relationValuesByRowId,
		isRelationLoading
	} = useRoleRelations({
		docs: queryResult.docs,
		visibleColumns: columnPreferences.visibleColumns
	});
	const renderRoleCell = useRoleCellRenderer({
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
	const detailTriggerColumnId = useMemo(() => getEligibleDetailTriggerRoleColumnId(columnPreferences.visibleColumns), [columnPreferences.visibleColumns]);

	const selectedMenuLabelByValue = useMemo(() => Object.fromEntries(
		roleMenuOptions.map(option => [option.value, option.label])
	) as Record<RoleMenu, string>, []);

	const selectedMenuLabels = useMemo(() => (
		formState.menus.map(menu => selectedMenuLabelByValue[menu]).filter((value): value is string => value != null)
	), [formState.menus, selectedMenuLabelByValue]);

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
					await queryClient.invalidateQueries({ queryKey: ["role-management"] });
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

	const openEditDialog = (row: RoleTableRow) => {
		setFormError(null);
		setFormState({
			roleId: row.id,
			name: row.name,
			level: row.level,
			menus: row.menus
		});
		setIsFormOpen(true);
	};

	const toggleMenu = (menu: RoleMenu) => {
		setFormState(previous => ({
			...previous,
			menus: previous.menus.includes(menu) ?
				previous.menus.filter(value => value != menu) :
				[...previous.menus, menu]
		}));
	};

	const submitForm = () => {
		setFormError(null);
		if(formState.name.trim().length == 0)
			return setFormError({ title: "ValidationError", message: "Role name is required." });
		if(formState.menus.length == 0)
			return setFormError({ title: "ValidationError", message: "At least one menu is required." });
		runMutation(async () => {
			await roleActions.upsertRoleRequestAction({
				roleId: formState.roleId,
				name: formState.name,
				level: formState.level,
				menus: formState.menus
			});
			setIsFormOpen(false);
		}, {
			onError: setFormError,
			fallbackMessage: "Failed to save request.",
			clearPageError: false
		});
	};

	const requestDelete = (row: RoleTableRow) => {
		runMutation(async () => {
			await roleActions.requestDeleteRoleAction(row.id);
			setDeleteTarget(null);
		});
	};

	const cancelRequest = (row: RoleTableRow) => {
		runMutation(async () => {
			await roleActions.cancelRoleRequestAction(row.id);
		});
	};

	const requestRestore = (row: RoleTableRow) => {
		runMutation(async () => {
			await roleActions.requestRestoreRoleAction(row.id);
		});
	};

	const renderRoleActions = (row: RoleTableRow) => {
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
				title="Role Management"
				description="Manage role requests with editor workflows, including level and menu access changes."
			>
				<DashboardManagementToolbar
					keyword={queryState.keyword}
					onKeywordChange={queryState.setKeyword}
					searchPlaceholder="Search roles by name, level, or menu"
					filterCount={filters.appliedFilters.length}
					onToggleFilter={filters.toggleFilterPanel}
					onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
					isLoading={isLoading}
					isMutating={isMutating}
					rightSlot={(
						<>
							<div className="flex items-center gap-2">
								<label htmlFor="role-show-deleted" className="text-sm">Show Deleted</label>
								<Switch
									id="role-show-deleted"
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

				<RoleRequestFilterCard
					isLoading={isLoading}
					isMutating={isMutating}
					filters={filters}
					getResolvedFilterColumnConfig={getResolvedFilterColumnConfig}
				/>

				<RoleColumnConfigCard
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

				<RoleActiveFiltersSummary items={filters.filterSummaryItems} />

				{displayError != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>{displayError.title}</AlertTitle>
						<AlertDescription>{displayError.message}</AlertDescription>
					</Alert>
				) : null}

				<RoleRequestsTable
					queryResult={queryResult}
					visibleColumns={columnPreferences.visibleColumns}
					visibleColumnCount={columnPreferences.visibleColumns.length + 1}
					detailTriggerColumnId={detailTriggerColumnId}
					isLoading={isLoading}
					isMutating={isMutating}
					getSortDirection={queryState.getSortDirection}
					onToggleSortField={queryState.toggleSortField}
					onOpenDetails={setDetailRow}
					renderRoleCell={renderRoleCell}
					renderActions={renderRoleActions}
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

			<RoleRequestDetailsDrawer
				open={detailRow != null}
				onOpenChange={open => {
					if(!open)
						setDetailRow(null);
				}}
				row={detailRow}
				renderActions={renderRoleActions}
				onOpenRequestChanges={setRequestChangeRow}
				relationNavigation={{
					getHrefBase: relationNavigation.getTargetHrefBase,
					onRelationLinkClick: relationNavigation.onRelationLinkClick,
					onOpenSummary: relationNavigation.openSummary
				}}
			/>

			<RoleRequestChangePreviewDrawer
				open={requestChangeRow != null}
				onOpenChange={open => {
					if(!open)
						setRequestChangeRow(null);
				}}
				row={requestChangeRow}
			/>

			<RoleRequestFormDrawer
				open={isFormOpen}
				onOpenChange={open => {
					setIsFormOpen(open);
					if(!open)
						setFormError(null);
				}}
				formState={formState}
				formError={formError}
				selectedMenuLabels={selectedMenuLabels}
				isMutating={isMutating}
				onNameChange={value => setFormState(previous => ({ ...previous, name: value }))}
				onLevelChange={value => setFormState(previous => ({ ...previous, level: value }))}
				onToggleMenu={toggleMenu}
				onSubmit={submitForm}
			/>

			<RoleRequestDeleteDialog
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

			<RoleRequestCancelDialog
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
