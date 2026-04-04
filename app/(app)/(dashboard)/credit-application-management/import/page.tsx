"use client";

import { useRef, useMemo, useState, useEffect, useTransition, type ChangeEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	PencilIcon,
	Trash2Icon,
	UploadIcon,
	ArrowUpIcon,
	ArrowDownIcon,
	RotateCcwIcon,
	ArrowUpDownIcon,
	CircleAlertIcon
} from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { AlertDialog, AlertDialogTitle, AlertDialogAction, AlertDialogCancel, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogDescription } from "@/components/radix/AlertDialog";
import { Badge } from "@/components/radix/Badge";
import { Button } from "@/components/radix/Button";
import {
	Dialog,
	DialogTitle,
	DialogFooter,
	DialogHeader,
	DialogContent,
	DialogDescription
} from "@/components/radix/Dialog";
import { Skeleton } from "@/components/radix/Skeleton";
import { Table, TableRow, TableBody, TableCell, TableHead, TableHeader } from "@/components/radix/Table";

import { DashboardManagementToolbar, DashboardManagementPageFrame, DashboardManagementPagination } from "../../layout.components";
import * as creditActions from "../layout.actions";

type SortDirection = "asc" | "desc";

type ImportSortStateItem = { field: creditActions.CreditApplicationImportSortField, direction: SortDirection };

const DEBOUNCE_MS = 300;
const CSV_PREVIEW_BYTES = 512 * 1024;
const CSV_PREVIEW_MAX_ROWS = 12;

const CREDIT_IMPORT_REST_UPLOAD_URL = "/api/credit-application-imports/upload";

function creditImportRestReplaceFileUrl(importId: string): string {
	return `/api/credit-application-imports/${encodeURIComponent(importId)}/file`;
}

async function parseCreditImportRestErrorMessage(response: Response): Promise<string> {
	const text = await response.text();
	if(text.length == 0)
		return response.statusText.length > 0 ? response.statusText : "Request failed.";
	try {
		const body = JSON.parse(text) as Record<string, unknown>;
		if(typeof body.summary == "string" && body.summary.length > 0)
			return body.summary;
		if(Array.isArray(body.messages)) {
			const parts = body.messages.filter((item): item is string => typeof item == "string");
			if(parts.length > 0)
				return parts.join(" ");
		}
		if(typeof body.error == "string") {
			const preset: Record<string, string> = {
				unauthorized: "Unauthorized.",
				forbidden: "Forbidden.",
				not_found: "Import not found.",
				deleted: "This upload has been deleted.",
				read_only: "Approved imports are read-only."
			};
			if(body.error in preset)
				return preset[body.error];
			return body.error;
		}
	} catch{
		/* use raw text */
	}
	return text;
}

async function uploadCreditImportFileViaRest(file: File): Promise<void> {
	const formData = new FormData();
	formData.append("file", file);
	const response = await fetch(CREDIT_IMPORT_REST_UPLOAD_URL, {
		method: "POST",
		body: formData,
		credentials: "include"
	});
	if(!response.ok)
		throw new Error(await parseCreditImportRestErrorMessage(response));
}

async function replaceCreditImportFileViaRest(importId: string, file: File): Promise<void> {
	const formData = new FormData();
	formData.append("file", file);
	const response = await fetch(creditImportRestReplaceFileUrl(importId), {
		method: "PUT",
		body: formData,
		credentials: "include"
	});
	if(!response.ok)
		throw new Error(await parseCreditImportRestErrorMessage(response));
}

function isCsvFilename(name: string): boolean {
	return name.toLowerCase().endsWith(".csv");
}

function parseCsvPreview(text: string, maxDataRows: number): { headers: string[], rows: string[][] } {
	const lines = text.split(/\r?\n/).map(line => line.trimEnd()).filter(line => line.length > 0);
	if(lines.length == 0)
		return { headers: [], rows: [] };
	const splitLine = (line: string): string[] => line.split(",").map(cell => cell.trim().replace(/^"|"$/g, ""));
	const headers = splitLine(lines[0]);
	const rows = lines.slice(1, 1 + maxDataRows).map(splitLine);
	return { headers, rows };
}

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

function importReviewPhase(row: creditActions.CreditApplicationImportTableRow): "pending" | "rejected" | "approved" {
	if(row.reviewedAt == null)
		return "pending";
	if(row.reviewApproved == false)
		return "rejected";
	return "approved";
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

export default function CreditApplicationImportPage() {
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const replaceImportIdRef = useRef<string | null>(null);
	const [keyword, setKeyword] = useState("");
	const [debouncedKeyword, setDebouncedKeyword] = useState("");
	const [pageIndex, setPageIndex] = useState(1);
	const [pageError, setPageError] = useState<{ title: string, message: string } | null>(null);
	const [uploadError, setUploadError] = useState<{ title: string, message: string } | null>(null);
	const [isMutating, startMutationTransition] = useTransition();
	const [csvDialogOpen, setCsvDialogOpen] = useState(false);
	const [csvDialogReplaceImportId, setCsvDialogReplaceImportId] = useState<string | null>(null);
	const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
	const [csvPreviewHeaders, setCsvPreviewHeaders] = useState<string[]>([]);
	const [csvPreviewRows, setCsvPreviewRows] = useState<string[][]>([]);
	const [deleteTarget, setDeleteTarget] = useState<creditActions.CreditApplicationImportTableRow | null>(null);
	const [sortState, setSortState] = useState<ImportSortStateItem[]>([
		{ field: "createdAt", direction: "desc" }
	]);

	const sortTokens = useMemo(() => (
		sortState.map(sortItem => `${sortItem.direction == "desc" ? "-" : "+"}${sortItem.field}`)
	), [sortState]);

	const getSortDirection = (field: creditActions.CreditApplicationImportSortField): SortDirection | null => {
		const active = sortState.find(sortItem => sortItem.field == field);
		return active?.direction ?? null;
	};

	const toggleSortField = (field: creditActions.CreditApplicationImportSortField) => {
		setSortState(previous => {
			const current = previous.find(sortItem => sortItem.field == field);
			if(current == null)
				return [{ field, direction: "asc" }];
			if(current.direction == "asc")
				return [{ field, direction: "desc" }];
			return [];
		});
	};

	const renderSortIcon = (field: creditActions.CreditApplicationImportSortField) => {
		const direction = getSortDirection(field);
		if(direction == "asc")
			return <ArrowUpIcon className="size-3.5 shrink-0 text-foreground" />;
		if(direction == "desc")
			return <ArrowDownIcon className="size-3.5 shrink-0 text-foreground" />;
		return <ArrowUpDownIcon className="text-muted-foreground size-3.5 shrink-0" />;
	};

	useEffect(() => {
		const timer = window.setTimeout(() => {
			setDebouncedKeyword(keyword);
		}, DEBOUNCE_MS);
		return () => window.clearTimeout(timer);
	}, [keyword]);

	useEffect(() => {
		setPageIndex(1);
	}, [debouncedKeyword, sortTokens]);

	const importsQuery = useQuery({
		queryKey: ["credit-application-management", "imports", { pageIndex, debouncedKeyword, sortTokens }],
		queryFn: () => creditActions.queryCreditApplicationImportsEditorAction({
			page: pageIndex,
			keyword: debouncedKeyword,
			sort: sortTokens
		}),
		refetchOnWindowFocus: true
	});

	useEffect(() => {
		if(importsQuery.data == null || importsQuery.isFetching)
			return;
		if(importsQuery.data.page != pageIndex)
			setPageIndex(importsQuery.data.page);
	}, [pageIndex, importsQuery.data, importsQuery.isFetching]);

	const queryResult = importsQuery.data ?? {
		docs: [],
		totalDocs: 0,
		page: 1,
		hasNextPage: false,
		hasPreviousPage: false
	};
	const isLoading = importsQuery.isPending;
	const queryErrorMessage = importsQuery.error instanceof Error ?
		importsQuery.error.message :
		importsQuery.error != null ? "Failed to load uploads." : null;
	const displayError = pageError ?? (queryErrorMessage != null ? {
		title: "Error",
		message: queryErrorMessage
	} : null);

	const invalidateImportQueries = async () => {
		await queryClient.invalidateQueries({ queryKey: ["credit-application-management", "imports"] });
		await queryClient.invalidateQueries({ queryKey: ["credit-application-management", "imports-approver-pending"] });
	};

	const openFilePicker = () => {
		replaceImportIdRef.current = null;
		fileInputRef.current?.click();
	};

	const startReplaceFile = (importId: string) => {
		replaceImportIdRef.current = importId;
		fileInputRef.current?.click();
	};

	const runUpload = (file: File, clearInput: HTMLInputElement | null) => {
		startMutationTransition(() => {
			void (async () => {
				setUploadError(null);
				setPageError(null);
				try {
					await uploadCreditImportFileViaRest(file);
					await invalidateImportQueries();
				} catch(error) {
					setUploadError(resolvePageError(error, "Upload failed."));
				} finally {
					if(clearInput != null)
						clearInput.value = "";
				}
			})();
		});
	};

	const runReplaceUpload = (importId: string, file: File, clearInput: HTMLInputElement | null) => {
		startMutationTransition(() => {
			void (async () => {
				setUploadError(null);
				setPageError(null);
				try {
					await replaceCreditImportFileViaRest(importId, file);
					await invalidateImportQueries();
				} catch(error) {
					setUploadError(resolvePageError(error, "Replace file failed."));
				} finally {
					if(clearInput != null)
						clearInput.value = "";
				}
			})();
		});
	};

	const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		const replaceId = replaceImportIdRef.current;
		replaceImportIdRef.current = null;
		if(file == null)
			return;
		if(isCsvFilename(file.name)) {
			void (async () => {
				try {
					const text = await file.slice(0, CSV_PREVIEW_BYTES).text();
					const preview = parseCsvPreview(text, CSV_PREVIEW_MAX_ROWS);
					setCsvPreviewHeaders(preview.headers);
					setCsvPreviewRows(preview.rows);
					setPendingUploadFile(file);
					setCsvDialogReplaceImportId(replaceId);
					setCsvDialogOpen(true);
					setUploadError(null);
				} catch(error) {
					setUploadError(resolvePageError(error, "Could not read CSV for preview."));
				} finally {
					event.target.value = "";
				}
			})();
			return;
		}
		if(replaceId != null) {
			runReplaceUpload(replaceId, file, event.target);
			return;
		}
		runUpload(file, event.target);
	};

	const confirmCsvUpload = () => {
		if(pendingUploadFile == null)
			return;
		const file = pendingUploadFile;
		const replaceId = csvDialogReplaceImportId;
		setCsvDialogOpen(false);
		setPendingUploadFile(null);
		setCsvPreviewHeaders([]);
		setCsvPreviewRows([]);
		setCsvDialogReplaceImportId(null);
		if(replaceId != null) {
			runReplaceUpload(replaceId, file, fileInputRef.current);
			return;
		}
		runUpload(file, fileInputRef.current);
	};

	const confirmSoftDelete = () => {
		if(deleteTarget == null)
			return;
		const id = deleteTarget.id;
		startMutationTransition(() => {
			void (async () => {
				setUploadError(null);
				setPageError(null);
				try {
					await creditActions.softDeleteCreditApplicationImportAction(id);
					setDeleteTarget(null);
					await invalidateImportQueries();
				} catch(error) {
					setUploadError(resolvePageError(error, "Delete failed."));
				}
			})();
		});
	};

	const reopenForReview = (importId: string) => {
		startMutationTransition(() => {
			void (async () => {
				setUploadError(null);
				setPageError(null);
				try {
					await creditActions.reopenCreditApplicationImportReviewAction(importId);
					await invalidateImportQueries();
				} catch(error) {
					setUploadError(resolvePageError(error, "Could not send import back for review."));
				}
			})();
		});
	};

	return (
		<>
			<DashboardManagementPageFrame
				title="Account upload"
				description="Upload Excel or CSV files for checker review. Rows are not created until Import approver approves. While status is pending or rejected you can replace the file, delete the upload, or clear a rejection to queue again; approved imports are read-only."
			>
				<input
					ref={fileInputRef}
					type="file"
					className="hidden"
					accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
					onChange={handleFileChange}
				/>

				<DashboardManagementToolbar
					keyword={keyword}
					onKeywordChange={setKeyword}
					searchPlaceholder="Search by file name"
					filterCount={0}
					onToggleFilter={() => {}}
					onToggleColumns={() => {}}
					isLoading={isLoading}
					isMutating={isMutating}
					rightSlot={(
						<Button type="button" onClick={openFilePicker} disabled={isLoading || isMutating}>
							<UploadIcon />
							Upload file
						</Button>
					)}
				/>

				{uploadError != null ? (
					<Alert variant="destructive" className="mb-4">
						<CircleAlertIcon />
						<AlertTitle>{uploadError.title}</AlertTitle>
						<AlertDescription>{uploadError.message}</AlertDescription>
					</Alert>
				) : null}

				{displayError != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>{displayError.title}</AlertTitle>
						<AlertDescription>{displayError.message}</AlertDescription>
					</Alert>
				) : null}

				<div className="rounded-xl border">
					<Table>
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
										Upload Date
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
								<TableHead>Review status</TableHead>
								<TableHead>Approved By</TableHead>
								<TableHead>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => toggleSortField("approveName")}
										disabled={isLoading || isMutating}
										className="-ml-2 h-7 gap-1 px-2 text-foreground"
									>
										Approve Name
										{renderSortIcon("approveName")}
									</Button>
								</TableHead>
								<TableHead className="text-end w-65">Actions</TableHead>
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
							{!isLoading && queryResult.docs.length == 0 ? (
								<TableRow>
									<TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
										No uploads yet. Use Upload file to add an Excel or CSV file.
									</TableCell>
								</TableRow>
							) : null}
							{!isLoading ? queryResult.docs.map(row => {
								const phase = importReviewPhase(row);
								const canMutate = phase != "approved";
								return (
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
										<TableCell>
											{phase == "pending" ? (
												<Badge variant="outline">Pending</Badge>
											) : null}
											{phase == "rejected" ? (
												<Badge variant="destructive">Rejected</Badge>
											) : null}
											{phase == "approved" ? (
												<Badge variant="secondary">Approved</Badge>
											) : null}
										</TableCell>
										<TableCell>{row.approvedByLabel}</TableCell>
										<TableCell>{row.approveName}</TableCell>
										<TableCell className="text-end">
											{canMutate ? (
												<div className="flex flex-wrap items-center justify-end gap-1">
													<Button
														type="button"
														size="sm"
														variant="outline"
														onClick={() => startReplaceFile(row.id)}
														disabled={isLoading || isMutating}
													>
														<PencilIcon />
														Edit
													</Button>
													{phase == "rejected" ? (
														<Button
															type="button"
															size="sm"
															variant="secondary"
															onClick={() => reopenForReview(row.id)}
															disabled={isLoading || isMutating}
														>
															<RotateCcwIcon />
															Reopen
														</Button>
													) : null}
													<Button
														type="button"
														size="sm"
														variant="destructive"
														onClick={() => setDeleteTarget(row)}
														disabled={isLoading || isMutating}
													>
														<Trash2Icon />
														Delete
													</Button>
												</div>
											) : (
												<span className="text-muted-foreground text-xs">Read-only</span>
											)}
										</TableCell>
									</TableRow>
								);
							}) : null}
						</TableBody>
					</Table>
				</div>

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

			<AlertDialog
				open={deleteTarget != null}
				onOpenChange={open => {
					if(!open)
						setDeleteTarget(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete import</AlertDialogTitle>
						<AlertDialogDescription>
							This removes the upload from the list (soft delete). Pending or rejected imports only. This cannot be undone from this screen.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
						<AlertDialogAction variant="destructive" onClick={confirmSoftDelete} disabled={isMutating}>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<Dialog
				open={csvDialogOpen}
				onOpenChange={open => {
					if(!open) {
						setCsvDialogOpen(false);
						setPendingUploadFile(null);
						setCsvPreviewHeaders([]);
						setCsvPreviewRows([]);
						setCsvDialogReplaceImportId(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-3xl" showCloseButton={true}>
					<DialogHeader>
						<DialogTitle>Preview CSV</DialogTitle>
						<DialogDescription>
							{csvDialogReplaceImportId != null ?
								"This file will replace the current upload for this import. Rejection will be cleared so the checker can review again." :
								`First rows from the file (up to ${CSV_PREVIEW_MAX_ROWS} data rows for this dialog; the server still validates the full sheet on upload).`}
						</DialogDescription>
					</DialogHeader>
					<div className="max-h-[50vh] overflow-auto rounded-lg border">
						<Table>
							<TableHeader>
								<TableRow>
									{csvPreviewHeaders.length == 0 ? (
										<TableHead className="text-muted-foreground">No header row detected</TableHead>
									) : (
										csvPreviewHeaders.map((header, index) => (
											<TableHead key={index} className="whitespace-nowrap">{header.length > 0 ? header : `Column ${index + 1}`}</TableHead>
										))
									)}
								</TableRow>
							</TableHeader>
							<TableBody>
								{csvPreviewRows.length == 0 ? (
									<TableRow>
										<TableCell colSpan={Math.max(csvPreviewHeaders.length, 1)} className="text-muted-foreground py-6 text-center">
											No data rows in the preview slice.
										</TableCell>
									</TableRow>
								) : (
									csvPreviewRows.map((cells, rowIndex) => (
										<TableRow key={rowIndex}>
											{cells.map((cell, cellIndex) => (
												<TableCell key={cellIndex} className="max-w-[12rem] truncate whitespace-nowrap" title={cell}>
													{cell}
												</TableCell>
											))}
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
					<DialogFooter className="border-0 bg-transparent p-0 flex flex-col gap-2 sm:flex-row sm:justify-end">
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setCsvDialogOpen(false);
								setPendingUploadFile(null);
								setCsvPreviewHeaders([]);
								setCsvPreviewRows([]);
								setCsvDialogReplaceImportId(null);
							}}
							disabled={isMutating}
						>
							Cancel
						</Button>
						<Button type="button" onClick={confirmCsvUpload} disabled={isMutating || pendingUploadFile == null}>
							<UploadIcon />
							Upload file
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
