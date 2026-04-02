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

import * as teamActions from "./page.actions";

const PAGE_SIZE = 20;
const sortOptions = [
	{ field: "updatedAt", label: "Updated At" },
	{ field: "createdAt", label: "Created At" },
	{ field: "name", label: "Name" },
	{ field: "supervisorName", label: "Supervisor" },
	{ field: "deletedAt", label: "Deleted At" },
	{ field: "reviewedAt", label: "Reviewed At" }
] as const;

type SortDirection = "asc" | "desc";
type SortField = (typeof sortOptions)[number]["field"];
type QueryTeamsOutput = Awaited<ReturnType<typeof teamActions.queryTeamsAction>>;
type TeamTableRow = QueryTeamsOutput["docs"][number];
type TeamManagementTabMode = Parameters<typeof teamActions.queryTeamsAction>[0]["mode"];
type AssignableUsers = Awaited<ReturnType<typeof teamActions.searchTeamAssignableUsersAction>>;

type FormState = {
	teamId?: string;
	name: string;
	supervisorId: string;
	officerIds: string[];
};

const emptyAssignableUsers: AssignableUsers = {
	supervisors: [],
	officers: []
};

const emptyQueryResult: QueryTeamsOutput = {
	docs: [],
	totalDocs: 0,
	page: 1,
	hasNextPage: false,
	hasPreviousPage: false
};

const defaultFormState: FormState = {
	name: "",
	supervisorId: "",
	officerIds: []
};

function formatDateTime(dateValue: string | null) {
	if(dateValue == null)
		return "-";
	const date = new Date(dateValue);
	if(Number.isNaN(date.getTime()))
		return "-";
	return `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

function getReviewStatus(row: TeamTableRow): { label: string, variant: "default" | "secondary" | "destructive" } {
	if(row.reviewedAt == null)
		return { label: "Pending", variant: "secondary" };
	if(row.reviewApproved == true)
		return { label: "Approved", variant: "default" };
	return { label: "Rejected", variant: "destructive" };
}

export default function Page() {
	const [mode, setMode] = useState<TeamManagementTabMode>("editor");
	const [keyword, setKeyword] = useState("");
	const [debouncedKeyword, setDebouncedKeyword] = useState("");
	const [sortState, setSortState] = useState<Array<{ field: SortField, direction: SortDirection }>>([
		{ field: "updatedAt", direction: "desc" }
	]);
	const [pageIndex, setPageIndex] = useState(1);
	const [queryResult, setQueryResult] = useState<QueryTeamsOutput>(emptyQueryResult);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const requestSequence = useRef(0);

	const [assignableUsers, setAssignableUsers] = useState<AssignableUsers>(emptyAssignableUsers);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [formState, setFormState] = useState<FormState>(defaultFormState);
	const [formError, setFormError] = useState<string | null>(null);

	const [deleteTarget, setDeleteTarget] = useState<TeamTableRow | null>(null);
	const [reviewDialogState, setReviewDialogState] = useState<{ row: TeamTableRow, decision: "approve" | "reject" } | null>(null);
	const [reviewReason, setReviewReason] = useState("");
	const [isMutating, startMutationTransition] = useTransition();

	const sortTokens = useMemo(() => (
		sortState.map(sortItem => `${sortItem.direction == "desc" ? "-" : "+"}${sortItem.field}`)
	), [sortState]);

	const officerNameById = useMemo(() => Object.fromEntries(
		assignableUsers.officers.map(officer => [officer.id, `${officer.name} (${officer.email})`])
	), [assignableUsers.officers]);

	const selectedOfficerLabels = useMemo(() => (
		formState.officerIds.map(officerId => officerNameById[officerId]).filter((value): value is string => value != null)
	), [formState.officerIds, officerNameById]);

	const loadTeamsPage = useCallback(async (targetPage: number) => {
		const requestId = ++requestSequence.current;
		setIsLoading(true);
		setErrorMessage(null);
		try {
			const response = await teamActions.queryTeamsAction({
				keyword: debouncedKeyword,
				sort: sortTokens,
				page: targetPage,
				limit: PAGE_SIZE,
				mode
			});
			if(requestId != requestSequence.current) return;
			setQueryResult(response);
			setPageIndex(response.page);
		} catch(error) {
			console.error(error);
			if(requestId != requestSequence.current) return;
			setQueryResult(emptyQueryResult);
			setPageIndex(1);
			setErrorMessage(error instanceof Error ? error.message : "Failed to load team requests.");
		} finally {
			if(requestId == requestSequence.current)
				setIsLoading(false);
		}
	}, [debouncedKeyword, mode, sortTokens]);

	useEffect(() => {
		const timeout = window.setTimeout(() => {
			setDebouncedKeyword(keyword.trim());
		}, 250);
		return () => {
			window.clearTimeout(timeout);
		};
	}, [keyword]);

	useEffect(() => {
		void loadTeamsPage(1);
	}, [loadTeamsPage]);

	useEffect(() => {
		void (async () => {
			try {
				const users = await teamActions.searchTeamAssignableUsersAction("");
				setAssignableUsers(users);
			} catch(_error) {
				setAssignableUsers(emptyAssignableUsers);
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
					await loadTeamsPage(pageIndex);
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

	const toggleOfficer = (officerId: string) => {
		setFormState(previous => ({
			...previous,
			officerIds: previous.officerIds.includes(officerId) ?
				previous.officerIds.filter(id => id != officerId) :
				[...previous.officerIds, officerId]
		}));
	};

	const submitForm = () => {
		setFormError(null);
		if(formState.name.trim().length == 0)
			return setFormError("Team name is required.");
		if(formState.supervisorId.trim().length == 0)
			return setFormError("Supervisor is required.");
		if(formState.officerIds.length == 0)
			return setFormError("At least one officer is required.");
		runMutation(async () => {
			await teamActions.upsertTeamRequestAction({
				teamId: formState.teamId,
				name: formState.name,
				supervisorId: formState.supervisorId,
				officerIds: formState.officerIds
			});
			setIsFormOpen(false);
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

	const submitReview = () => {
		if(reviewDialogState == null) return;
		runMutation(async () => {
			await teamActions.reviewTeamRequestAction({
				teamId: reviewDialogState.row.id,
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
					<CardTitle>Team Management</CardTitle>
					<CardDescription>Manage team structure requests with editor and approver workflows for supervisor and officer assignments.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<Tabs value={mode} onValueChange={value => setMode(value as TeamManagementTabMode)}>
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
											placeholder="Search teams by team name, supervisor, or officer"
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
											<TableHead>Supervisor</TableHead>
											<TableHead>Officers</TableHead>
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
												<TableCell colSpan={8} className="text-muted-foreground py-8 text-center">Loading team requests...</TableCell>
											</TableRow>
										) : null}
										{!isLoading && queryResult.docs.length == 0 ? (
											<TableRow>
												<TableCell colSpan={8} className="text-muted-foreground py-8 text-center">No team requests found.</TableCell>
											</TableRow>
										) : null}
										{queryResult.docs.map(row => {
											const status = getReviewStatus(row);
											const isPending = row.reviewedAt == null;
											return (
												<TableRow key={row.id}>
													<TableCell className="font-medium">{row.name}</TableCell>
													<TableCell>{row.supervisorName}</TableCell>
													<TableCell className="max-w-55 overflow-hidden text-ellipsis whitespace-nowrap">{row.officerNames.length > 0 ? row.officerNames.join(", ") : "-"}</TableCell>
													<TableCell>{row.requestType}</TableCell>
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
										onClick={() => void loadTeamsPage(pageIndex - 1)}
										disabled={pageIndex <= 1 || !queryResult.hasPreviousPage || isLoading || isMutating}
									>
										Previous
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => void loadTeamsPage(pageIndex + 1)}
										disabled={!queryResult.hasNextPage || isLoading || isMutating}
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
						<DialogTitle>{formState.teamId == null ? "Add Team Request" : "Edit Team Request"}</DialogTitle>
						<DialogDescription>Changes in editor mode create pending team requests that require approver review before publication.</DialogDescription>
					</DialogHeader>
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Team Name</label>
							<Input value={formState.name} onChange={event => setFormState(previous => ({ ...previous, name: event.target.value }))} placeholder="Collection Team Alpha" />
						</div>
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Supervisor</label>
							<Select value={formState.supervisorId.length > 0 ? formState.supervisorId : "none"} onValueChange={value => setFormState(previous => ({ ...previous, supervisorId: value == "none" ? "" : value }))}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select supervisor" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Select supervisor</SelectItem>
									{assignableUsers.supervisors.map(supervisor => (
										<SelectItem key={supervisor.id} value={supervisor.id}>{supervisor.name} ({supervisor.email})</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<div className="flex items-center justify-between">
								<label className="text-sm font-medium">Officers</label>
								<Badge variant="outline">{formState.officerIds.length} selected</Badge>
							</div>
							<div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-2">
								{assignableUsers.officers.length == 0 ? (
									<p className="text-muted-foreground p-2 text-sm">No officers available.</p>
								) : assignableUsers.officers.map(officer => {
									const selected = formState.officerIds.includes(officer.id);
									return (
										<Button
											key={officer.id}
											type="button"
											variant={selected ? "secondary" : "outline"}
											onClick={() => toggleOfficer(officer.id)}
											className="h-auto w-full justify-between py-2"
										>
											<span className="text-left text-sm">{officer.name} ({officer.email})</span>
											{selected ? <CheckIcon className="size-4" /> : null}
										</Button>
									);
								})}
							</div>
							<p className="text-muted-foreground text-xs">{selectedOfficerLabels.length > 0 ? selectedOfficerLabels.join(", ") : "No officers selected."}</p>
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
								"Approving this request publishes the team configuration and applies the supervisor/officer assignments." :
								"Rejecting this request keeps the request in draft mode and records the review reason."}
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
