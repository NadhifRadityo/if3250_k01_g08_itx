"use client";

import { useRef, useMemo, useState, useEffect, useCallback, useTransition } from "react";
import { XIcon, PlusIcon, CheckIcon, PencilIcon, SearchIcon, Trash2Icon, ArrowUpDownIcon } from "lucide-react";

import { AlertDialog, AlertDialogTitle, AlertDialogAction, AlertDialogCancel, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogDescription } from "@/components/radix/AlertDialog";
import { Badge } from "@/components/radix/Badge";
import { Button } from "@/components/radix/Button";
import { Card, CardTitle, CardHeader, CardContent, CardDescription } from "@/components/radix/Card";
import { Dialog, DialogTitle, DialogFooter, DialogHeader, DialogContent, DialogDescription } from "@/components/radix/Dialog";
import { Input } from "@/components/radix/Input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/radix/Popover";
import { Select, SelectItem, SelectValue, SelectContent, SelectTrigger } from "@/components/radix/Select";
import { Table, TableRow, TableBody, TableCell, TableHead, TableHeader } from "@/components/radix/Table";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "@/components/radix/Tabs";
import { Textarea } from "@/components/radix/Textarea";

import {
	queryStagedUsersAction,
	searchUserSupervisorsAction,
	cancelStagedUserRequestAction,
	requestDeleteStagedUserAction,
	reviewStagedUserRequestAction,
	upsertStagedUserRequestAction,
	type StagedUserTableRow,
	type UserManagementTabMode,
	type CursorStagedUsersOutput
} from "./page.actions";

const PAGE_SIZE = 20;
const sortOptions = [
	{ field: "updatedAt", label: "Updated At" },
	{ field: "createdAt", label: "Created At" },
	{ field: "name", label: "Name" },
	{ field: "email", label: "Email" },
	{ field: "deletedAt", label: "Deleted At" },
	{ field: "reviewedAt", label: "Reviewed At" }
] as const;

type SortDirection = "asc" | "desc";
type SortField = (typeof sortOptions)[number]["field"];
type RoleValue = "admin" | "manager" | "supervisor" | "officer";
type SupervisorOption = Awaited<ReturnType<typeof searchUserSupervisorsAction>>[number];

type FormState = {
	stagedUserId?: string;
	email: string;
	name: string;
	employeeId: string;
	role: RoleValue;
	supervisorId: string;
	initialPassword: string;
};

const emptyQueryResult: CursorStagedUsersOutput = {
	docs: [],
	totalDocs: 0,
	hasNextPage: false,
	startCursor: null,
	endCursor: null
};

const defaultFormState: FormState = {
	email: "",
	name: "",
	employeeId: "",
	role: "officer",
	supervisorId: "",
	initialPassword: ""
};

function formatDateTime(dateValue: string | null) {
	if(dateValue == null)
		return "-";
	const date = new Date(dateValue);
	if(Number.isNaN(date.getTime()))
		return "-";
	return `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

function getRequestType(row: StagedUserTableRow) {
	if(row.linkedUserId == null) return "Create";
	if(row.deletedAt != null) return "Delete";
	return "Update";
}

function getReviewStatus(row: StagedUserTableRow): { label: string, variant: "default" | "secondary" | "destructive" } {
	if(row.reviewedAt == null)
		return { label: "Pending", variant: "secondary" };
	if(row.reviewApproved == true)
		return { label: "Approved", variant: "default" };
	return { label: "Rejected", variant: "destructive" };
}

export default function Page() {
	const [mode, setMode] = useState<UserManagementTabMode>("editor");
	const [keyword, setKeyword] = useState("");
	const [debouncedKeyword, setDebouncedKeyword] = useState("");
	const [sortState, setSortState] = useState<Array<{ field: SortField, direction: SortDirection }>>([
		{ field: "updatedAt", direction: "desc" }
	]);
	const [pageIndex, setPageIndex] = useState(1);
	const [queryResult, setQueryResult] = useState<CursorStagedUsersOutput>(emptyQueryResult);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const requestSequence = useRef(0);

	const [supervisors, setSupervisors] = useState<SupervisorOption[]>([]);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [formState, setFormState] = useState<FormState>(defaultFormState);
	const [formError, setFormError] = useState<string | null>(null);

	const [deleteTarget, setDeleteTarget] = useState<StagedUserTableRow | null>(null);
	const [reviewDialogState, setReviewDialogState] = useState<{ row: StagedUserTableRow, decision: "approve" | "reject" } | null>(null);
	const [reviewReason, setReviewReason] = useState("");
	const [isMutating, startMutationTransition] = useTransition();

	const sortTokens = useMemo(() => (
		sortState.map(sortItem => `${sortItem.direction == "desc" ? "-" : "+"}${sortItem.field}`)
	), [sortState]);

	const loadInitialStagedUsers = useCallback(async () => {
		const requestId = ++requestSequence.current;
		setIsLoading(true);
		setErrorMessage(null);
		try {
			const response = await queryStagedUsersAction({
				keyword: debouncedKeyword,
				sort: sortTokens,
				limit: PAGE_SIZE,
				mode
			});
			if(requestId != requestSequence.current) return;
			setQueryResult(response);
			setPageIndex(1);
		} catch(error) {
			console.error(error);
			if(requestId != requestSequence.current) return;
			setQueryResult(emptyQueryResult);
			setErrorMessage(error instanceof Error ? error.message : "Failed to load staged users.");
		} finally {
			if(requestId == requestSequence.current)
				setIsLoading(false);
		}
	}, [debouncedKeyword, mode, sortTokens]);

	const scrollByCursor = useCallback(async (direction: "next" | "previous") => {
		const cursor = direction == "next" ? queryResult.endCursor : queryResult.startCursor;
		if(cursor == null) return;
		const requestId = ++requestSequence.current;
		setIsLoading(true);
		setErrorMessage(null);
		try {
			const response = await queryStagedUsersAction({
				keyword: debouncedKeyword,
				sort: sortTokens,
				limit: PAGE_SIZE,
				mode,
				cursor,
				scroll: direction == "next" ? { next: PAGE_SIZE } : { previous: PAGE_SIZE }
			});
			if(requestId != requestSequence.current) return;
			if(response.startCursor == null)
				return;
			setQueryResult(response);
			setPageIndex(previous => Math.max(1, previous + (direction == "next" ? 1 : -1)));
		} catch(error) {
			if(requestId != requestSequence.current) return;
			setErrorMessage(error instanceof Error ? error.message : "Failed to load next page.");
		} finally {
			if(requestId == requestSequence.current)
				setIsLoading(false);
		}
	}, [debouncedKeyword, mode, queryResult.endCursor, queryResult.startCursor, sortTokens]);

	useEffect(() => {
		const timeout = window.setTimeout(() => {
			setDebouncedKeyword(keyword.trim());
		}, 250);
		return () => {
			window.clearTimeout(timeout);
		};
	}, [keyword]);

	useEffect(() => {
		void loadInitialStagedUsers();
	}, [loadInitialStagedUsers]);

	useEffect(() => {
		void (async () => {
			try {
				const results = await searchUserSupervisorsAction("");
				setSupervisors(results);
			} catch(_error) {
				setSupervisors([]);
			}
		})();
	}, []);

	const toggleSortField = (field: SortField) => {
		setSortState(previous => {
			const currentIndex = previous.findIndex(sortItem => sortItem.field == field);
			if(currentIndex == -1)
				return [...previous, { field, direction: "asc" }];
			const current = previous[currentIndex];
			if(current.direction == "asc") {
				return previous.map((sortItem, index) => (
					index == currentIndex ? { ...sortItem, direction: "desc" } : sortItem
				));
			}
			return previous.filter(sortItem => sortItem.field != field);
		});
	};

	const runMutation = (action: () => Promise<void>) => {
		startMutationTransition(() => {
			void (async () => {
				setErrorMessage(null);
				try {
					await action();
					await loadInitialStagedUsers();
				} catch(error) {
					setErrorMessage(error instanceof Error ? error.message : "Operation failed.");
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
			role: row.role,
			supervisorId: row.supervisorId ?? "",
			initialPassword: row.initialPassword
		});
		setIsFormOpen(true);
	};

	const submitForm = () => {
		setFormError(null);
		if(formState.email.trim().length == 0)
			return setFormError("Email is required.");
		if(formState.name.trim().length == 0)
			return setFormError("Name is required.");
		if(formState.employeeId.trim().length == 0)
			return setFormError("Employee ID is required.");
		if(formState.stagedUserId == null && formState.initialPassword.trim().length < 8)
			return setFormError("Initial password is required for new requests and must be at least 8 characters.");
		runMutation(async () => {
			await upsertStagedUserRequestAction({
				stagedUserId: formState.stagedUserId,
				email: formState.email,
				name: formState.name,
				employeeId: formState.employeeId,
				role: formState.role,
				supervisorId: formState.supervisorId.length > 0 ? formState.supervisorId : null,
				initialPassword: formState.initialPassword
			});
			setIsFormOpen(false);
		});
	};

	const requestDelete = (row: StagedUserTableRow) => {
		runMutation(async () => {
			await requestDeleteStagedUserAction(row.id);
			setDeleteTarget(null);
		});
	};

	const cancelRequest = (row: StagedUserTableRow) => {
		runMutation(async () => {
			await cancelStagedUserRequestAction(row.id);
		});
	};

	const submitReview = () => {
		if(reviewDialogState == null) return;
		runMutation(async () => {
			await reviewStagedUserRequestAction({
				stagedUserId: reviewDialogState.row.id,
				decision: reviewDialogState.decision,
				reason: reviewReason
			});
			setReviewDialogState(null);
			setReviewReason("");
		});
	};

	return (
		<main className="bg-muted/30 min-h-full p-4 md:p-6">
			<Card>
				<CardHeader>
					<CardTitle>User Management</CardTitle>
					<CardDescription>Manage staged user requests with editor and approver workflows, including review comments and approval syncing into the users collection.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<Tabs value={mode} onValueChange={value => setMode(value as UserManagementTabMode)}>
						<TabsList>
							<TabsTrigger value="editor">Editor</TabsTrigger>
							<TabsTrigger value="approver">Approver</TabsTrigger>
						</TabsList>
						<TabsContent value={mode} className="space-y-4">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<div className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row sm:items-center">
									<div className="relative w-full">
										<SearchIcon className="text-muted-foreground absolute top-2 left-2.5 size-4" />
										<Input
											value={keyword}
											onChange={event => setKeyword(event.target.value)}
											placeholder="Search staged users by name, email, or employee ID"
											className="pl-8"
										/>
									</div>
									<Popover>
										<PopoverTrigger asChild>
											<Button variant="outline" type="button" className="shrink-0" disabled={isLoading || isMutating}>
												<ArrowUpDownIcon />
												Sort
												{sortState.length > 0 ? <Badge variant="outline">{sortState.length}</Badge> : null}
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-84 p-3" align="end">
											<div className="space-y-3">
												<div className="flex items-center justify-between">
													<p className="text-sm font-medium">Sort by</p>
													<Button variant="outline" size="sm" type="button" onClick={() => setSortState([])} disabled={isLoading || isMutating}>Reset</Button>
												</div>
												<div className="grid gap-2">
													{sortOptions.map(option => {
														const activeSortIndex = sortState.findIndex(sortItem => sortItem.field == option.field);
														const activeSort = activeSortIndex == -1 ? null : sortState[activeSortIndex];
														return (
															<Button
																key={option.field}
																type="button"
																variant={activeSort == null ? "outline" : "secondary"}
																onClick={() => toggleSortField(option.field)}
																className="justify-between"
																disabled={isLoading || isMutating}
															>
																<span>{option.label}</span>
																<span className="inline-flex items-center gap-1">
																	{activeSort == null ? <ArrowUpDownIcon className="size-4" /> : activeSort.direction.toUpperCase()}
																	{activeSort != null ? <Badge variant="outline">{activeSortIndex + 1}</Badge> : null}
																</span>
															</Button>
														);
													})}
												</div>
											</div>
										</PopoverContent>
									</Popover>
								</div>
								{mode == "editor" ? (
									<Button type="button" onClick={openCreateDialog} disabled={isLoading || isMutating}>
										<PlusIcon />
										Add Request
									</Button>
								) : null}
							</div>

							{errorMessage != null ? (
								<div className="text-destructive bg-destructive/10 rounded-lg border px-3 py-2 text-sm">{errorMessage}</div>
							) : null}

							<div className="rounded-xl border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Name</TableHead>
											<TableHead>Email</TableHead>
											<TableHead>Employee ID</TableHead>
											<TableHead>Role</TableHead>
											<TableHead>Request</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Updated</TableHead>
											<TableHead>Review Comment</TableHead>
											<TableHead className="w-65">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{isLoading ? (
											<TableRow>
												<TableCell colSpan={9} className="text-muted-foreground py-8 text-center">Loading staged users...</TableCell>
											</TableRow>
										) : null}
										{!isLoading && queryResult.docs.length == 0 ? (
											<TableRow>
												<TableCell colSpan={9} className="text-muted-foreground py-8 text-center">No staged users found.</TableCell>
											</TableRow>
										) : null}
										{queryResult.docs.map(row => {
											const status = getReviewStatus(row);
											const isPending = row.reviewedAt == null;
											return (
												<TableRow key={row.id}>
													<TableCell className="font-medium">{row.name}</TableCell>
													<TableCell>{row.email}</TableCell>
													<TableCell>{row.employeeId}</TableCell>
													<TableCell>{row.role}</TableCell>
													<TableCell>{getRequestType(row)}</TableCell>
													<TableCell>
														<Badge variant={status.variant}>{status.label}</Badge>
													</TableCell>
													<TableCell>{formatDateTime(row.updatedAt)}</TableCell>
													<TableCell className="max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap">{row.reviewCommentText.length > 0 ? row.reviewCommentText : "-"}</TableCell>
													<TableCell>
														<div className="flex flex-wrap gap-2">
															{mode == "editor" ? (
																<>
																	<Button type="button" size="sm" variant="outline" onClick={() => openEditDialog(row)} disabled={isMutating}>
																		<PencilIcon />
																		Edit
																	</Button>
																	{row.deletedAt == null ? (
																		<Button type="button" size="sm" variant="destructive" onClick={() => setDeleteTarget(row)} disabled={isMutating}>
																			<Trash2Icon />
																			Request Delete
																		</Button>
																	) : null}
																	{isPending ? (
																		<Button type="button" size="sm" variant="secondary" onClick={() => cancelRequest(row)} disabled={isMutating}>
																			<XIcon />
																			Cancel Request
																		</Button>
																	) : null}
																</>
															) : (
																<>
																	<Button
																		type="button"
																		size="sm"
																		variant="default"
																		onClick={() => {
																			setReviewDialogState({ row, decision: "approve" });
																			setReviewReason("");
																		}}
																		disabled={!isPending || isMutating}
																	>
																		<CheckIcon />
																		Approve
																	</Button>
																	<Button
																		type="button"
																		size="sm"
																		variant="destructive"
																		onClick={() => {
																			setReviewDialogState({ row, decision: "reject" });
																			setReviewReason("");
																		}}
																		disabled={!isPending || isMutating}
																	>
																		<XIcon />
																		Reject
																	</Button>
																</>
															)}
														</div>
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</div>

							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<p className="text-muted-foreground text-sm">Showing page {pageIndex} ({queryResult.totalDocs} request(s))</p>
								<div className="flex gap-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => void scrollByCursor("previous")}
										disabled={pageIndex <= 1 || queryResult.startCursor == null || isLoading || isMutating}
									>
										Previous
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => void scrollByCursor("next")}
										disabled={!queryResult.hasNextPage || queryResult.endCursor == null || isLoading || isMutating}
									>
										Next
									</Button>
								</div>
							</div>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>

			<Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>{formState.stagedUserId == null ? "Add Staged User Request" : "Edit Staged User Request"}</DialogTitle>
						<DialogDescription>Changes in editor mode create pending requests and require approver review before the users collection is updated.</DialogDescription>
					</DialogHeader>
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Email</label>
							<Input value={formState.email} onChange={event => setFormState(previous => ({ ...previous, email: event.target.value }))} placeholder="user@example.com" />
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Name</label>
							<Input value={formState.name} onChange={event => setFormState(previous => ({ ...previous, name: event.target.value }))} placeholder="Full name" />
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Employee ID</label>
							<Input value={formState.employeeId} onChange={event => setFormState(previous => ({ ...previous, employeeId: event.target.value }))} placeholder="EMP-0001" />
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Role</label>
							<Select value={formState.role} onValueChange={value => setFormState(previous => ({ ...previous, role: value as RoleValue }))}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select role" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="admin">Admin</SelectItem>
									<SelectItem value="manager">Manager</SelectItem>
									<SelectItem value="supervisor">Supervisor</SelectItem>
									<SelectItem value="officer">Officer</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Supervisor</label>
							<Select value={formState.supervisorId.length > 0 ? formState.supervisorId : "none"} onValueChange={value => setFormState(previous => ({ ...previous, supervisorId: value == "none" ? "" : value }))}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="No supervisor" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">No supervisor</SelectItem>
									{supervisors.map(supervisor => (
										<SelectItem key={supervisor.id} value={supervisor.id}>{supervisor.name} ({supervisor.email})</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Initial Password {formState.stagedUserId == null ? "(required)" : "(optional reset)"}</label>
							<Input
								type="password"
								value={formState.initialPassword}
								onChange={event => setFormState(previous => ({ ...previous, initialPassword: event.target.value }))}
								placeholder={formState.stagedUserId == null ? "At least 8 characters" : "Leave blank to keep current password"}
							/>
						</div>
					</div>
					{formError != null ? <p className="text-destructive text-sm">{formError}</p> : null}
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isMutating}>Cancel</Button>
						<Button type="button" onClick={submitForm} disabled={isMutating}>Save Request</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog open={deleteTarget != null} onOpenChange={open => !open ? setDeleteTarget(null) : null}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Request Delete</AlertDialogTitle>
						<AlertDialogDescription>
							Delete does not hard-delete data. It creates a pending delete request by setting deletedAt, and requires approver review.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
						<AlertDialogAction variant="destructive" onClick={() => deleteTarget != null ? requestDelete(deleteTarget) : null} disabled={isMutating}>Request Delete</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<Dialog open={reviewDialogState != null} onOpenChange={open => !open ? setReviewDialogState(null) : null}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{reviewDialogState?.decision == "approve" ? "Approve Request" : "Reject Request"}</DialogTitle>
						<DialogDescription>
							{reviewDialogState?.decision == "approve" ?
								"Approving this request will push the staged changes to the users collection and preserve audit fields." :
								"Rejecting this request keeps it in staged-users and records the review reason."}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						<label className="text-sm font-medium">Review Reason (optional)</label>
						<Textarea value={reviewReason} onChange={event => setReviewReason(event.target.value)} placeholder="Provide a review reason" />
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setReviewDialogState(null)} disabled={isMutating}>Cancel</Button>
						<Button type="button" variant={reviewDialogState?.decision == "approve" ? "default" : "destructive"} onClick={submitReview} disabled={isMutating}>
							{reviewDialogState?.decision == "approve" ? "Approve" : "Reject"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</main>
	);
}
