"use client";

import { useMemo, useState, useEffect, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { XIcon, CheckIcon, ArrowUpIcon, ArrowDownIcon, ArrowUpDownIcon, CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import {
	Dialog,
	DialogTitle,
	DialogFooter,
	DialogHeader,
	DialogContent,
	DialogDescription
} from "@/components/radix/Dialog";
import { ScrollArea } from "@/components/radix/ScrollArea";
import { Skeleton } from "@/components/radix/Skeleton";
import { Table, TableRow, TableBody, TableCell, TableHead, TableHeader } from "@/components/radix/Table";
import { Tabs, TabsList, TabsTrigger } from "@/components/radix/Tabs";
import { Textarea } from "@/components/radix/Textarea";

import { DashboardManagementToolbar, DashboardManagementPageFrame, DashboardManagementPagination } from "../../layout.components";
import * as creditApplicationActions from "../layout.actions";

type SortDirection = "asc" | "desc";

type ImportSortStateItem = { field: creditApplicationActions.CreditApplicationImportSortField, direction: SortDirection };

type ReviewedSortStateItem = { field: creditApplicationActions.CreditApplicationReviewedSortField, direction: SortDirection };

const DEBOUNCE_MS = 300;

function formatDateTime(value: string): string {
	const date = new Date(value);
	if(Number.isNaN(date.getTime()))
		return value;
	return date.toLocaleString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false
	});
}

function resolvePageError(error: unknown, fallbackMessage: string): { title: string, message: string } {
	if(error instanceof Error) {
		return {
			title: error.name.length > 0 ? error.name : "Error",
			message: error.message.length > 0 ? error.message : fallbackMessage
		};
	}
	return {
		title: "Error",
		message: fallbackMessage
	};
}

export default function CreditApplicationImportApproverPage() {
	const queryClient = useQueryClient();
	const [keyword, setKeyword] = useState("");
	const [debouncedKeyword, setDebouncedKeyword] = useState("");
	const [pageIndex, setPageIndex] = useState(1);
	const [queue, setQueue] = useState<creditApplicationActions.CreditApplicationImportApproverQueue>("pending");
	const [sortState, setSortState] = useState<ImportSortStateItem[]>([
		{ field: "createdAt", direction: "asc" }
	]);
	const [reviewedSortState, setReviewedSortState] = useState<ReviewedSortStateItem[]>([
		{ field: "importUploadedAt", direction: "desc" }
	]);
	const [reviewRow, setReviewRow] = useState<creditApplicationActions.CreditApplicationImportApproverTableRow | null>(null);
	const [reviewReason, setReviewReason] = useState("");
	const [reviewError, setReviewError] = useState<{ title: string, message: string } | null>(null);
	const [filePreview, setFilePreview] = useState<creditApplicationActions.CreditApplicationImportFilePreviewOutput | null>(null);
	const [filePreviewLoading, setFilePreviewLoading] = useState(false);
	const [filePreviewError, setFilePreviewError] = useState<{ title: string, message: string } | null>(null);
	const [pageError, setPageError] = useState<{ title: string, message: string } | null>(null);
	const [isMutating, startMutationTransition] = useTransition();

	const sortTokens = useMemo(() => (
		sortState.map(sortItem => `${sortItem.direction == "desc" ? "-" : "+"}${sortItem.field}`)
	), [sortState]);

	const reviewedSortTokens = useMemo(() => (
		reviewedSortState.map(sortItem => `${sortItem.direction == "desc" ? "-" : "+"}${sortItem.field}`)
	), [reviewedSortState]);

	useEffect(() => {
		const timer = window.setTimeout(() => {
			setDebouncedKeyword(keyword);
		}, DEBOUNCE_MS);
		return () => window.clearTimeout(timer);
	}, [keyword]);

	useEffect(() => {
		setPageIndex(1);
	}, [debouncedKeyword, sortTokens, reviewedSortTokens]);

	useEffect(() => {
		setPageIndex(1);
		if(queue == "pending")
			setSortState([{ field: "createdAt", direction: "asc" }]);
	}, [queue]);

	useEffect(() => {
		if(reviewRow == null) {
			setFilePreview(null);
			setFilePreviewError(null);
			setFilePreviewLoading(false);
			return;
		}
		let cancelled = false;
		setFilePreview(null);
		setFilePreviewError(null);
		setFilePreviewLoading(true);
		void creditApplicationActions.getCreditApplicationImportFilePreviewAction(reviewRow.id).then(data => {
			if(!cancelled) {
				setFilePreview(data);
				setFilePreviewLoading(false);
			}
		}).catch(error => {
			if(!cancelled) {
				setFilePreviewError(resolvePageError(error, "Failed to load file preview."));
				setFilePreviewLoading(false);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [reviewRow?.id]);

	const getSortDirection = (field: creditApplicationActions.CreditApplicationImportSortField): SortDirection | null => {
		const active = sortState.find(sortItem => sortItem.field == field);
		return active?.direction ?? null;
	};

	const toggleSortField = (field: creditApplicationActions.CreditApplicationImportSortField) => {
		setSortState(previous => {
			const current = previous.find(sortItem => sortItem.field == field);
			if(current == null)
				return [{ field, direction: "asc" }];
			if(current.direction == "asc")
				return [{ field, direction: "desc" }];
			return [];
		});
	};

	const renderSortIcon = (field: creditApplicationActions.CreditApplicationImportSortField) => {
		const direction = getSortDirection(field);
		if(direction == "asc")
			return <ArrowUpIcon className="size-3.5 shrink-0 text-foreground" />;
		if(direction == "desc")
			return <ArrowDownIcon className="size-3.5 shrink-0 text-foreground" />;
		return <ArrowUpDownIcon className="text-muted-foreground size-3.5 shrink-0" />;
	};

	const getReviewedSortDirection = (field: creditApplicationActions.CreditApplicationReviewedSortField): SortDirection | null => {
		const active = reviewedSortState.find(sortItem => sortItem.field == field);
		return active?.direction ?? null;
	};

	const toggleReviewedSortField = (field: creditApplicationActions.CreditApplicationReviewedSortField) => {
		setReviewedSortState(previous => {
			const current = previous.find(sortItem => sortItem.field == field);
			if(current == null)
				return [{ field, direction: "asc" }];
			if(current.direction == "asc")
				return [{ field, direction: "desc" }];
			return [];
		});
	};

	const renderReviewedSortIcon = (field: creditApplicationActions.CreditApplicationReviewedSortField) => {
		const direction = getReviewedSortDirection(field);
		if(direction == "asc")
			return <ArrowUpIcon className="size-3.5 shrink-0 text-foreground" />;
		if(direction == "desc")
			return <ArrowDownIcon className="size-3.5 shrink-0 text-foreground" />;
		return <ArrowUpDownIcon className="text-muted-foreground size-3.5 shrink-0" />;
	};

	const pendingQuery = useQuery({
		queryKey: ["credit-application-management", "imports-approver-pending", { pageIndex, debouncedKeyword, sortTokens }],
		queryFn: () => creditApplicationActions.queryCreditApplicationImportsPendingApproverAction({
			page: pageIndex,
			keyword: debouncedKeyword,
			sort: sortTokens
		}),
		enabled: queue == "pending",
		refetchOnWindowFocus: true
	});

	const reviewedQuery = useQuery({
		queryKey: ["credit-application-management", "imports-approver-reviewed-rows", { pageIndex, debouncedKeyword, reviewedSortTokens }],
		queryFn: () => creditApplicationActions.queryCreditApplicationsReviewedListingAction({
			page: pageIndex,
			keyword: debouncedKeyword,
			sort: reviewedSortTokens
		}),
		enabled: queue == "reviewed",
		refetchOnWindowFocus: true
	});

	useEffect(() => {
		if(queue != "pending")
			return;
		if(pendingQuery.data == null || pendingQuery.isFetching)
			return;
		if(pendingQuery.data.page != pageIndex)
			setPageIndex(pendingQuery.data.page);
	}, [queue, pageIndex, pendingQuery.data, pendingQuery.isFetching]);

	useEffect(() => {
		if(queue != "reviewed")
			return;
		if(reviewedQuery.data == null || reviewedQuery.isFetching)
			return;
		if(reviewedQuery.data.page != pageIndex)
			setPageIndex(reviewedQuery.data.page);
	}, [queue, pageIndex, reviewedQuery.data, reviewedQuery.isFetching]);

	const pendingResult = pendingQuery.data ?? {
		docs: [],
		totalDocs: 0,
		page: 1,
		hasNextPage: false,
		hasPreviousPage: false
	};
	const reviewedResult = reviewedQuery.data ?? {
		docs: [],
		totalDocs: 0,
		page: 1,
		hasNextPage: false,
		hasPreviousPage: false
	};

	const isLoading = queue == "pending" ? pendingQuery.isPending : reviewedQuery.isPending;
	const queryErrorMessage = queue == "pending" ?
		(pendingQuery.error instanceof Error ?
			pendingQuery.error.message :
			pendingQuery.error != null ? "Failed to load imports." : null) :
		(reviewedQuery.error instanceof Error ?
			reviewedQuery.error.message :
			reviewedQuery.error != null ? "Failed to load reviewed accounts." : null);

	const displayError = pageError ?? (queryErrorMessage != null ? {
		title: "Error",
		message: queryErrorMessage
	} : null);

	const invalidateImportQueries = async () => {
		await queryClient.invalidateQueries({ queryKey: ["credit-application-management", "imports"] });
		await queryClient.invalidateQueries({ queryKey: ["credit-application-management", "imports-approver-pending"] });
		await queryClient.invalidateQueries({ queryKey: ["credit-application-management", "imports-approver-reviewed-rows"] });
	};

	const submitReview = (decision: "approve" | "reject") => {
		if(reviewRow == null)
			return;
		startMutationTransition(() => {
			void (async () => {
				setReviewError(null);
				setPageError(null);
				try {
					await creditApplicationActions.reviewCreditApplicationImportAction({
						importId: reviewRow.id,
						decision,
						reason: reviewReason
					});
					setReviewRow(null);
					setReviewReason("");
					await invalidateImportQueries();
				} catch(error) {
					setReviewError(resolvePageError(error, "Review failed."));
				}
			})();
		});
	};

	const searchPlaceholder = queue == "pending" ?
		"Search by file name" :
		"Search by account name or apply ID";

	return (
		<>
			<DashboardManagementPageFrame
				title="Import approver"
				description="Review uploaded account files. Approve to allow downstream processing, or reject with an optional comment. Reviewed lists account rows from approved imports."
			>
				<Tabs
					value={queue}
					onValueChange={value => {
						if(value == "pending" || value == "reviewed")
							setQueue(value);
					}}
					className="gap-4"
				>
					<TabsList className="mb-2">
						<TabsTrigger value="pending">Pending review</TabsTrigger>
						<TabsTrigger value="reviewed">Reviewed</TabsTrigger>
					</TabsList>

					<div className="flex flex-col gap-4">
						<DashboardManagementToolbar
							keyword={keyword}
							onKeywordChange={setKeyword}
							searchPlaceholder={searchPlaceholder}
							filterCount={0}
							onToggleFilter={() => {}}
							onToggleColumns={() => {}}
							isLoading={isLoading}
							isMutating={isMutating}
						/>

						{displayError != null ? (
							<Alert variant="destructive">
								<CircleAlertIcon />
								<AlertTitle>{displayError.title}</AlertTitle>
								<AlertDescription>{displayError.message}</AlertDescription>
							</Alert>
						) : null}

						<div className="rounded-xl border">
							<Table>
								{queue == "pending" ? (
									<>
										<TableHeader>
											<TableRow>
												<TableHead>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => toggleSortField("filename")}
														disabled={isLoading || isMutating}
														className="-ml-2 h-7 gap-1 px-2 text-foreground"
													>
														Filename
														{renderSortIcon("filename")}
													</Button>
												</TableHead>
												<TableHead>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => toggleSortField("createdAt")}
														disabled={isLoading || isMutating}
														className="-ml-2 h-7 gap-1 px-2 text-foreground"
													>
														Upload date
														{renderSortIcon("createdAt")}
													</Button>
												</TableHead>
												<TableHead>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => toggleSortField("uploadBy")}
														disabled={isLoading || isMutating}
														className="-ml-2 h-7 gap-1 px-2 text-foreground"
													>
														Upload by
														{renderSortIcon("uploadBy")}
													</Button>
												</TableHead>
												<TableHead className="text-end">Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{isLoading ? (
												<TableRow>
													<TableCell colSpan={4}>
														<Skeleton className="h-10 w-full" />
													</TableCell>
												</TableRow>
											) : null}
											{!isLoading && pendingResult.docs.length == 0 ? (
												<TableRow>
													<TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
														No files waiting for review.
													</TableCell>
												</TableRow>
											) : null}
											{!isLoading ? pendingResult.docs.map(row => (
												<TableRow key={row.id}>
													<TableCell className="font-medium">
														{row.url != null && row.url.length > 0 ? (
															<a href={row.url} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
																{row.filename}
															</a>
														) : (
															row.filename
														)}
													</TableCell>
													<TableCell>{formatDateTime(row.createdAt)}</TableCell>
													<TableCell>{row.uploadByName}</TableCell>
													<TableCell className="text-end">
														<Button
															type="button"
															size="sm"
															variant="default"
															onClick={() => {
																setReviewError(null);
																setReviewReason("");
																setFilePreviewError(null);
																setReviewRow(row);
															}}
															disabled={isMutating}
														>
															<CheckIcon />
															Review
														</Button>
													</TableCell>
												</TableRow>
											)) : null}
										</TableBody>
									</>
								) : (
									<>
										<TableHeader>
											<TableRow>
												<TableHead>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => toggleReviewedSortField("importFilename")}
														disabled={isLoading || isMutating}
														className="-ml-2 h-7 gap-1 px-2 text-foreground"
													>
														Filename
														{renderReviewedSortIcon("importFilename")}
													</Button>
												</TableHead>
												<TableHead>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => toggleReviewedSortField("importUploadedAt")}
														disabled={isLoading || isMutating}
														className="-ml-2 h-7 gap-1 px-2 text-foreground"
													>
														Upload date
														{renderReviewedSortIcon("importUploadedAt")}
													</Button>
												</TableHead>
												<TableHead>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => toggleReviewedSortField("uploadBy")}
														disabled={isLoading || isMutating}
														className="-ml-2 h-7 gap-1 px-2 text-foreground"
													>
														Upload by
														{renderReviewedSortIcon("uploadBy")}
													</Button>
												</TableHead>
												<TableHead>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => toggleReviewedSortField("applyId")}
														disabled={isLoading || isMutating}
														className="-ml-2 h-7 gap-1 px-2 text-foreground"
													>
														Apply ID
														{renderReviewedSortIcon("applyId")}
													</Button>
												</TableHead>
												<TableHead>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => toggleReviewedSortField("accountName")}
														disabled={isLoading || isMutating}
														className="-ml-2 h-7 gap-1 px-2 text-foreground"
													>
														Account name
														{renderReviewedSortIcon("accountName")}
													</Button>
												</TableHead>
												<TableHead>Address 1</TableHead>
												<TableHead>Address 2</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{isLoading ? (
												<TableRow>
													<TableCell colSpan={7}>
														<Skeleton className="h-10 w-full" />
													</TableCell>
												</TableRow>
											) : null}
											{!isLoading && reviewedResult.docs.length == 0 ? (
												<TableRow>
													<TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
														No account rows yet. Records appear here after an import is approved and account lines are created.
													</TableCell>
												</TableRow>
											) : null}
											{!isLoading ? reviewedResult.docs.map(row => (
												<TableRow key={row.id}>
													<TableCell className="font-medium">
														{row.importUrl != null && row.importUrl.length > 0 ? (
															<a href={row.importUrl} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
																{row.importFilename}
															</a>
														) : (
															row.importFilename
														)}
													</TableCell>
													<TableCell>{formatDateTime(row.importUploadedAt)}</TableCell>
													<TableCell>{row.uploadByName}</TableCell>
													<TableCell className="font-mono text-xs">{row.applyId}</TableCell>
													<TableCell>{row.accountName}</TableCell>
													<TableCell className="max-w-40 truncate" title={row.address1}>{row.address1}</TableCell>
													<TableCell className="max-w-40 truncate" title={row.address2}>{row.address2}</TableCell>
												</TableRow>
											)) : null}
										</TableBody>
									</>
								)}
							</Table>
						</div>

						<DashboardManagementPagination
							pageIndex={pageIndex}
							totalRequests={queue == "pending" ? pendingResult.totalDocs : reviewedResult.totalDocs}
							hasPreviousPage={queue == "pending" ? pendingResult.hasPreviousPage : reviewedResult.hasPreviousPage}
							hasNextPage={queue == "pending" ? pendingResult.hasNextPage : reviewedResult.hasNextPage}
							isLoading={isLoading}
							isMutating={isMutating}
							onPrevious={() => setPageIndex(previous => Math.max(previous - 1, 1))}
							onNext={() => setPageIndex(previous => previous + 1)}
						/>
					</div>
				</Tabs>
			</DashboardManagementPageFrame>

			<Dialog
				open={reviewRow != null}
				onOpenChange={open => {
					if(!open) {
						setReviewRow(null);
						setReviewReason("");
						setReviewError(null);
						setFilePreview(null);
						setFilePreviewError(null);
						setFilePreviewLoading(false);
					}
				}}
			>
				<DialogContent className="sm:max-w-3xl" showCloseButton={true}>
					<DialogHeader>
						<DialogTitle>Review import</DialogTitle>
						<DialogDescription>
							Preview the first rows from the uploaded spreadsheet. Approve creates account records from every data row (required columns: account name; optional: address 1/2, phone, WhatsApp, email, apply ID). Reject stores your decision without creating records.
						</DialogDescription>
					</DialogHeader>
					{reviewRow != null ? (
						<div className="grid gap-3 text-sm">
							<div className="grid gap-1">
								<p><span className="text-muted-foreground">File:</span> {reviewRow.filename}</p>
								<p><span className="text-muted-foreground">Uploaded:</span> {formatDateTime(reviewRow.createdAt)}</p>
								<p><span className="text-muted-foreground">Upload by:</span> {reviewRow.uploadByName}</p>
							</div>
							<div className="grid gap-1.5">
								<span className="text-muted-foreground font-medium">Data preview</span>
								{filePreviewLoading ? (
									<Skeleton className="h-40 w-full" />
								) : null}
								{filePreviewError != null ? (
									<Alert variant="destructive">
										<CircleAlertIcon />
										<AlertTitle>{filePreviewError.title}</AlertTitle>
										<AlertDescription>{filePreviewError.message}</AlertDescription>
									</Alert>
								) : null}
								{!filePreviewLoading && filePreview != null && filePreview.headers.length == 0 ? (
									<p className="text-muted-foreground">No tabular data found in the file.</p>
								) : null}
								{!filePreviewLoading && filePreview != null && filePreview.headers.length > 0 ? (
									<>
										<ScrollArea className="max-h-56 rounded-lg border">
											<Table>
												<TableHeader>
													<TableRow>
														{filePreview.headers.map((header, index) => (
															<TableHead key={index} className="whitespace-nowrap text-xs font-medium">
																{header.length > 0 ? header : `Column ${index + 1}`}
															</TableHead>
														))}
													</TableRow>
												</TableHeader>
												<TableBody>
													{filePreview.rows.length == 0 ? (
														<TableRow>
															<TableCell colSpan={Math.max(filePreview.headers.length, 1)} className="text-muted-foreground py-6 text-center">
																No data rows under the header.
															</TableCell>
														</TableRow>
													) : (
														filePreview.rows.map((cells, rowIndex) => (
															<TableRow key={rowIndex}>
																{filePreview.headers.map((_header, cellIndex) => (
																	<TableCell key={cellIndex} className="max-w-32 truncate text-xs" title={cells[cellIndex] ?? ""}>
																		{cells[cellIndex] ?? ""}
																	</TableCell>
																))}
															</TableRow>
														))
													)}
												</TableBody>
											</Table>
										</ScrollArea>
										<p className="text-muted-foreground text-xs">
											Showing {filePreview.rows.length} of {filePreview.totalDataRows} data row{filePreview.totalDataRows == 1 ? "" : "s"}.
											{filePreview.truncated ? " Preview is truncated." : ""}
										</p>
									</>
								) : null}
							</div>
							<label className="grid gap-1.5">
								<span className="text-muted-foreground">Comment (optional)</span>
								<Textarea
									value={reviewReason}
									onChange={event => setReviewReason(event.target.value)}
									placeholder="Add a short note for the submitter or audit trail"
									disabled={isMutating}
									rows={3}
								/>
							</label>
						</div>
					) : null}
					{reviewError != null ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>{reviewError.title}</AlertTitle>
							<AlertDescription>{reviewError.message}</AlertDescription>
						</Alert>
					) : null}
					<DialogFooter className="border-0 bg-transparent p-0 flex flex-col gap-2 sm:flex-row sm:justify-between">
						<Button type="button" variant="outline" onClick={() => submitReview("reject")} disabled={isMutating || reviewRow == null}>
							<XIcon />
							Reject
						</Button>
						<Button type="button" variant="default" onClick={() => submitReview("approve")} disabled={isMutating || reviewRow == null || filePreviewLoading}>
							<CheckIcon />
							Approve
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
