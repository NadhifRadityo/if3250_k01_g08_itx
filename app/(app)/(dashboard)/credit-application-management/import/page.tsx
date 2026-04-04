"use client";

import { useRef, useMemo, useState, useEffect, useTransition, type ChangeEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UploadIcon, ArrowUpIcon, ArrowDownIcon, ArrowUpDownIcon, CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Skeleton } from "@/components/radix/Skeleton";
import { Table, TableRow, TableBody, TableCell, TableHead, TableHeader } from "@/components/radix/Table";

import { DashboardManagementToolbar, DashboardManagementPageFrame, DashboardManagementPagination } from "../../layout.components";
import * as creditActions from "../layout.actions";

type SortDirection = "asc" | "desc";

type ImportSortStateItem = { field: creditActions.CreditApplicationImportSortField, direction: SortDirection };

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

export default function CreditApplicationImportPage() {
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [keyword, setKeyword] = useState("");
	const [debouncedKeyword, setDebouncedKeyword] = useState("");
	const [pageIndex, setPageIndex] = useState(1);
	const [pageError, setPageError] = useState<{ title: string, message: string } | null>(null);
	const [uploadError, setUploadError] = useState<{ title: string, message: string } | null>(null);
	const [isMutating, startMutationTransition] = useTransition();
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
			return <ArrowUpIcon className="size-3.5" />;
		if(direction == "desc")
			return <ArrowDownIcon className="size-3.5" />;
		return <ArrowUpDownIcon className="text-muted-foreground size-3.5" />;
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

	const openFilePicker = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if(file == null)
			return;
		const formData = new FormData();
		formData.append("file", file);
		startMutationTransition(() => {
			void (async () => {
				setUploadError(null);
				setPageError(null);
				try {
					await creditActions.uploadCreditApplicationImportAction(formData);
					await queryClient.invalidateQueries({ queryKey: ["credit-application-management", "imports"] });
				} catch(error) {
					setUploadError(resolvePageError(error, "Upload failed."));
				} finally {
					event.target.value = "";
				}
			})();
		});
	};

	return (
		<DashboardManagementPageFrame
			title="Account upload"
			description="Upload Excel or CSV account files for credit application processing. Files await import approver review before ingestion."
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

			<div className="rounded-md border">
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
									className="-ml-2 h-7 gap-1 px-2"
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
									className="-ml-2 h-7 gap-1 px-2"
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
									className="-ml-2 h-7 gap-1 px-2"
								>
									Upload by
									{renderSortIcon("uploadBy")}
								</Button>
							</TableHead>
							<TableHead>Approved By</TableHead>
							<TableHead>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => toggleSortField("approveName")}
									disabled={isLoading || isMutating}
									className="-ml-2 h-7 gap-1 px-2"
								>
									Approve Name
									{renderSortIcon("approveName")}
								</Button>
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={5}>
									<Skeleton className="h-10 w-full" />
								</TableCell>
							</TableRow>
						) : null}
						{!isLoading && queryResult.docs.length == 0 ? (
							<TableRow>
								<TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
									No uploads yet. Use Upload file to add an Excel or CSV file.
								</TableCell>
							</TableRow>
						) : null}
						{!isLoading ? queryResult.docs.map(row => (
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
								<TableCell>{row.approvedByLabel}</TableCell>
								<TableCell>{row.approveName}</TableCell>
							</TableRow>
						)) : null}
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
	);
}
