"use client";

import { useRef, useMemo, useState, useEffect, useTransition, type ChangeEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CellValue } from "exceljs";
import {
	PencilIcon,
	Trash2Icon,
	UploadIcon,
	ArrowUpIcon,
	ArrowDownIcon,
	RotateCcwIcon,
	ArrowUpDownIcon,
	CircleAlertIcon,
	DownloadIcon
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
const IMPORT_PREVIEW_MAX_DATA_ROWS = 12;
const CREDIT_IMPORT_TEMPLATE_PATH = "/credit-application-import-template.xlsx";

const CREDIT_IMPORT_REST_UPLOAD_URL = "/api/credit-application-imports/upload";

function creditImportRestReplaceFileUrl(importId: string): string {
	return `/api/credit-application-imports/${encodeURIComponent(importId)}/file`;
}

async function parseCreditImportRestErrorMessage(response: Response): Promise<string> {
	const text = await response.text();
	if(text.length == 0) {
		return response.statusText.length > 0 ?
			`Request failed (${response.status}): ${response.statusText}` :
			`Request failed (${response.status}).`;
	}
	let body: Record<string, unknown>;
	try {
		body = JSON.parse(text) as Record<string, unknown>;
	} catch{
		throw new Error(
			`Unexpected non-JSON response (${response.status}). The upload API should always return JSON; this often means a proxy or server error.`
		);
	}
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
			return preset[body.error as keyof typeof preset];
		return body.error;
	}
	throw new Error(
		`Unexpected error response shape (${response.status}). Expected JSON with error, messages, or summary.`
	);
}

function isXlsxFilename(name: string): boolean {
	return name.toLowerCase().endsWith(".xlsx");
}

function cellValueToString(value: CellValue): string {
	if(value == null)
		return "";
	if(typeof value == "string" || typeof value == "number" || typeof value == "boolean")
		return String(value);
	if(typeof value == "object") {
		if("richText" in value && Array.isArray(value.richText))
			return value.richText.map(part => (typeof part.text == "string" ? part.text : "")).join("");
		if("text" in value && typeof value.text == "string")
			return value.text;
		if("result" in value && value.result != null)
			return cellValueToString(value.result as CellValue);
	}
	return "";
}

async function buildImportPreviewFromXlsxFile(file: File, maxDataRows: number): Promise<{ headers: string[], rows: string[][] }> {
	const ExcelJS = (await import("exceljs")).default;
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(await file.arrayBuffer());
	const worksheet = workbook.worksheets[0];
	if(worksheet == null)
		return { headers: [], rows: [] };

	const headerRow = worksheet.getRow(1);
	let columnCount = headerRow.cellCount;
	if(columnCount < 1)
		columnCount = 1;

	const headers: string[] = [];
	for(let c = 1; c <= columnCount; c++)
		headers.push(cellValueToString(headerRow.getCell(c).value));

	const rows: string[][] = [];
	const limitRow = Math.min(worksheet.rowCount, 1 + maxDataRows);
	for(let r = 2; r <= limitRow; r++) {
		const row = worksheet.getRow(r);
		if(row.hasValues == false)
			continue;
		const cells: string[] = [];
		for(let c = 1; c <= columnCount; c++)
			cells.push(cellValueToString(row.getCell(c).value));
		if(cells.every(cell => cell.length == 0))
			continue;
		rows.push(cells);
		if(rows.length >= maxDataRows)
			break;
	}
	return { headers, rows };
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
	const [importPreviewDialogOpen, setImportPreviewDialogOpen] = useState(false);
	const [importPreviewReplaceImportId, setImportPreviewReplaceImportId] = useState<string | null>(null);
	const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
	const [importPreviewHeaders, setImportPreviewHeaders] = useState<string[]>([]);
	const [importPreviewRows, setImportPreviewRows] = useState<string[][]>([]);
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
		if(!isXlsxFilename(file.name)) {
			setUploadError({
				title: "Unsupported file",
				message: "Only .xlsx files are accepted. Download the template for the correct columns."
			});
			event.target.value = "";
			return;
		}
		void (async () => {
			try {
				const preview = await buildImportPreviewFromXlsxFile(file, IMPORT_PREVIEW_MAX_DATA_ROWS);
				setImportPreviewHeaders(preview.headers);
				setImportPreviewRows(preview.rows);
				setPendingUploadFile(file);
				setImportPreviewReplaceImportId(replaceId);
				setImportPreviewDialogOpen(true);
				setUploadError(null);
			} catch(error) {
				setUploadError(resolvePageError(error, "Could not read the Excel file for preview."));
			} finally {
				event.target.value = "";
			}
		})();
	};

	const confirmImportUpload = () => {
		if(pendingUploadFile == null)
			return;
		const file = pendingUploadFile;
		const replaceId = importPreviewReplaceImportId;
		setImportPreviewDialogOpen(false);
		setPendingUploadFile(null);
		setImportPreviewHeaders([]);
		setImportPreviewRows([]);
		setImportPreviewReplaceImportId(null);
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
				description="Upload .xlsx files using the template columns for checker review. Rows are not created until Import approver approves. While status is pending or rejected you can replace the file, delete the upload, or clear a rejection to queue again; approved imports are read-only."
			>
				<input
					ref={fileInputRef}
					type="file"
					className="hidden"
					accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
						<div className="flex flex-wrap items-center gap-2">
							<Button type="button" variant="outline" asChild>
								<a href={CREDIT_IMPORT_TEMPLATE_PATH} download>
									<DownloadIcon />
									Download template
								</a>
							</Button>
							<Button type="button" onClick={openFilePicker} disabled={isLoading || isMutating}>
								<UploadIcon />
								Upload file
							</Button>
						</div>
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
										No uploads yet. Download the template, then use Upload file to add a .xlsx file.
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
				open={importPreviewDialogOpen}
				onOpenChange={open => {
					if(!open) {
						setImportPreviewDialogOpen(false);
						setPendingUploadFile(null);
						setImportPreviewHeaders([]);
						setImportPreviewRows([]);
						setImportPreviewReplaceImportId(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-3xl" showCloseButton={true}>
					<DialogHeader>
						<DialogTitle>Preview spreadsheet</DialogTitle>
						<DialogDescription>
							{importPreviewReplaceImportId != null ?
								"This file will replace the current upload for this import. Rejection will be cleared so the checker can review again." :
								`First rows from the workbook (up to ${IMPORT_PREVIEW_MAX_DATA_ROWS} data rows in this dialog; the server still validates the full sheet on upload).`}
						</DialogDescription>
					</DialogHeader>
					<div className="max-h-[50vh] overflow-auto rounded-lg border">
						<Table>
							<TableHeader>
								<TableRow>
									{importPreviewHeaders.length == 0 ? (
										<TableHead className="text-muted-foreground">No header row detected</TableHead>
									) : (
										importPreviewHeaders.map((header, index) => (
											<TableHead key={index} className="whitespace-nowrap">{header.length > 0 ? header : `Column ${index + 1}`}</TableHead>
										))
									)}
								</TableRow>
							</TableHeader>
							<TableBody>
								{importPreviewRows.length == 0 ? (
									<TableRow>
										<TableCell colSpan={Math.max(importPreviewHeaders.length, 1)} className="text-muted-foreground py-6 text-center">
											No data rows in the preview slice.
										</TableCell>
									</TableRow>
								) : (
									importPreviewRows.map((cells, rowIndex) => (
										<TableRow key={rowIndex}>
											{cells.map((cell, cellIndex) => (
												<TableCell key={cellIndex} className="max-w-48 truncate whitespace-nowrap" title={cell}>
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
								setImportPreviewDialogOpen(false);
								setPendingUploadFile(null);
								setImportPreviewHeaders([]);
								setImportPreviewRows([]);
								setImportPreviewReplaceImportId(null);
							}}
							disabled={isMutating}
						>
							Cancel
						</Button>
						<Button type="button" onClick={confirmImportUpload} disabled={isMutating || pendingUploadFile == null}>
							<UploadIcon />
							Upload file
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
