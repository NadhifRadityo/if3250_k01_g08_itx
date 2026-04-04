"use client";

import { useEffect, useState } from "react";
import { SearchIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/radix/Alert";
import { Badge } from "@/components/radix/Badge";
import { Button } from "@/components/radix/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/radix/Card";
import { Input } from "@/components/radix/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/radix/Table";

import { AccountAssignmentPagination, parseErrorMessage } from "../shared.components";
import { queryViewerAssignmentsAction } from "../layout.actions";

type ViewerRow = {
	assignment_id: string | null;
	apply_id: string;
	account_name: string;
	officer_name: string | null;
	address: string;
	product_code: string;
};

const PAGE_SIZE = 20;

export default function PenugasanAkunViewerPage() {
	const [keywordInput, setKeywordInput] = useState("");
	const [keyword, setKeyword] = useState("");
	const [page, setPage] = useState(1);
	const [rows, setRows] = useState<ViewerRow[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const totalPages = Math.max(1, Math.ceil(Math.max(total, 1) / PAGE_SIZE));

	useEffect(() => {
		void (async () => {
			setLoading(true);
			setErrorMessage(null);
			try {
				const data = await queryViewerAssignmentsAction({
					search: keyword,
					page,
					limit: PAGE_SIZE
				});
				setRows(data.docs ?? []);
				setTotal(data.totalDocs ?? 0);
			} catch(error) {
				setErrorMessage(parseErrorMessage(error, "Failed to load account assignment data."));
			} finally {
				setLoading(false);
			}
		})();
	}, [keyword, page]);

	return (
		<div className="min-h-screen bg-slate-50">
			<div className="px-4 pt-5 text-sm text-muted-foreground sm:px-6">
				<span className="text-primary">Manajemen Akun</span>
				<span className="mx-1.5">›</span>
				<span className="font-medium text-foreground">Penugasan Akun</span>
			</div>

			<div className="space-y-5 px-4 py-5 sm:px-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h1 className="text-2xl font-bold tracking-tight">Penugasan Akun</h1>
					<Badge variant="outline" className="bg-white px-3 py-1 text-xs">Viewer Mode</Badge>
				</div>

				{errorMessage != null ? (
					<Alert variant="destructive">
						<AlertTitle>Error</AlertTitle>
						<AlertDescription>{errorMessage}</AlertDescription>
					</Alert>
				) : null}

				<Card>
					<CardHeader className="pb-3">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<CardTitle className="text-base font-semibold">Account Assignment Overview</CardTitle>
							<Badge className="border border-slate-200 bg-slate-100 px-3 text-xs font-semibold tracking-wide text-slate-700 uppercase hover:bg-slate-100">
								{rows.length} Records
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="flex gap-2">
							<div className="relative max-w-lg grow">
								<SearchIcon className="text-muted-foreground absolute top-2 left-2.5 size-4" />
								<Input className="pl-8" placeholder="Search apply ID / account name..." value={keywordInput} onChange={event => setKeywordInput(event.target.value)} />
							</div>
							<Button type="button" disabled={loading} onClick={() => { setPage(1); setKeyword(keywordInput); }}>Search</Button>
							<Button type="button" variant="outline" onClick={() => setKeywordInput("")}>Cancel</Button>
						</div>

						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Apply ID</TableHead>
									<TableHead>Acc. Name</TableHead>
									<TableHead>Officer Name</TableHead>
									<TableHead>Address 1</TableHead>
									<TableHead>Product Code</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{rows.length == 0 ? (
									<TableRow>
										<TableCell colSpan={6} className="text-muted-foreground py-10 text-center text-sm">No account rows found.</TableCell>
									</TableRow>
								) : rows.map(row => (
									<TableRow key={row.apply_id}>
										<TableCell>
											<span className="text-primary font-medium">{row.apply_id}</span>
										</TableCell>
										<TableCell className="font-medium">{row.account_name}</TableCell>
										<TableCell>{row.officer_name ?? "Unassigned"}</TableCell>
										<TableCell className="text-muted-foreground text-sm">{row.address}</TableCell>
										<TableCell>
											<Badge className="border border-sky-200 bg-sky-100 text-xs font-semibold text-sky-700 hover:bg-sky-100">{row.product_code}</Badge>
										</TableCell>
										<TableCell>
											<Badge variant="outline">{row.assignment_id == null ? "unassigned" : "assigned"}</Badge>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>

						<AccountAssignmentPagination
							page={page}
							totalPages={totalPages}
							total={total}
							showing={rows.length}
							onPage={setPage}
						/>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
