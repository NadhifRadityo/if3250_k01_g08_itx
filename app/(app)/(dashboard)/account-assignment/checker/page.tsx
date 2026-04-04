"use client";

import { useMemo, useState, useEffect } from "react";
import { UserCheckIcon, AlertTriangleIcon, CheckCircle2Icon, XCircleIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/radix/Alert";
import { Badge } from "@/components/radix/Badge";
import { Button } from "@/components/radix/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/radix/Card";
import { Checkbox } from "@/components/radix/Checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/radix/Dialog";
import { Label } from "@/components/radix/Label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/radix/Table";
import { Textarea } from "@/components/radix/Textarea";
import { Input } from "@/components/radix/Input";
import { SearchIcon } from "lucide-react";

import { AccountAssignmentPagination, parseErrorMessage } from "../shared.components";
import {
	approveAssignmentAction,
	queryCheckerAssignmentsAction,
	rejectAssignmentAction
} from "../layout.actions";

type CheckerGroup = {
	created_by: {
		id: string;
		name: string | null;
	};
	requests: Array<{
		assignment_id: string;
		apply_id: string;
		account_name: string;
		officer_name: string | null;
		address: string;
		product_code: string;
		requested_at: string;
	}>;
};

type CheckerRow = CheckerGroup["requests"][number] & {
	requestor_id: string;
	requestor_name: string | null;
	selected: boolean;
};

type CheckerResult = {
	docs: CheckerGroup[];
	totalDocs: number;
	page: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
};

type ResultType = "approve" | "reject" | null;

const PAGE_SIZE = 20;

export default function PenugasanAkunCheckerPage() {
	const [keywordInput, setKeywordInput] = useState("");
	const [keyword, setKeyword] = useState("");
	const [page, setPage] = useState(1);
	const [rows, setRows] = useState<CheckerRow[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [approvalNotes, setApprovalNotes] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
	const [resultDialog, setResultDialog] = useState<ResultType>(null);
	const [reloadKey, setReloadKey] = useState(0);

	const selectedRows = rows.filter(row => row.selected);
	const selectedCount = selectedRows.length;
	const allSelected = rows.length > 0 && rows.every(row => row.selected);
	const totalPages = Math.max(1, Math.ceil(Math.max(total, 1) / PAGE_SIZE));

	const requestorInfo = useMemo(() => {
		if(selectedRows.length == 0)
			return { name: "-", role: "Maker" };
		const distinctRequestors = [...new Set(selectedRows.map(row => `${row.requestor_name ?? row.requestor_id}::${row.requestor_id}`))];
		if(distinctRequestors.length > 1)
			return { name: "Multiple Requestors", role: `Maker · ${distinctRequestors.length} users` };
		const [label] = distinctRequestors[0].split("::");
		return { name: label, role: "Maker" };
	}, [selectedRows]);

	useEffect(() => {
		void (async () => {
			setLoading(true);
			setErrorMessage(null);
			try {
				const data = await queryCheckerAssignmentsAction({
					search: keyword,
					page,
					limit: PAGE_SIZE
				});
				const nextRows: CheckerRow[] = [];
				for(const group of data.docs ?? []) {
					for(const row of group.requests ?? []) {
						nextRows.push({
							...row,
							requestor_id: group.created_by.id,
							requestor_name: group.created_by.name,
							selected: false
						});
					}
				}
				setRows(nextRows);
				setTotal(data.totalDocs ?? 0);
			} catch(error) {
				setErrorMessage(parseErrorMessage(error, "Failed to load pending approval rows."));
			} finally {
				setLoading(false);
			}
		})();
	}, [keyword, page, reloadKey]);

	const toggleRow = (assignmentId: string) => {
		setRows(previous => previous.map(row => row.assignment_id == assignmentId ? { ...row, selected: !row.selected } : row));
	};

	const toggleAll = (checked: boolean) => {
		setRows(previous => previous.map(row => ({ ...row, selected: checked })));
	};

	const runDecision = async (decision: "approve" | "reject") => {
		if(selectedRows.length == 0)
			return;

		setSubmitting(true);
		setErrorMessage(null);
		try {
			for(const row of selectedRows) {
				if(decision == "approve")
					await approveAssignmentAction({ assignmentId: row.assignment_id, notes: approvalNotes });
				else
					await rejectAssignmentAction({ assignmentId: row.assignment_id, notes: approvalNotes });
			}

			setRows(previous => previous.filter(row => row.selected == false));
			setApprovalNotes("");
			setRejectDialogOpen(false);
			setResultDialog(decision);
			setReloadKey(previous => previous + 1);
		} catch(error) {
			setErrorMessage(parseErrorMessage(error, `Failed to ${decision} assignments.`));
		} finally {
			setSubmitting(false);
		}
	};

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
					<div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
						<div className="flex min-w-max">
							<a href="/account-assignment/maker" className="text-muted-foreground px-5 py-2 text-sm font-medium hover:text-foreground">Pembuat (Maker)</a>
							<span className="bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Penyetuju (Checker)</span>
						</div>
					</div>
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
							<CardTitle className="text-base font-semibold">Pending Approvals</CardTitle>
							<Badge className="border border-amber-200 bg-amber-100 px-3 text-xs font-semibold tracking-wide text-amber-700 uppercase hover:bg-amber-100">
								{rows.length} Records Pending
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="flex gap-2">
							<div className="relative max-w-lg grow">
								<SearchIcon className="text-muted-foreground absolute top-2 left-2.5 size-4" />
								<Input className="pl-8" placeholder="Search apply ID / account name..." value={keywordInput} onChange={event => setKeywordInput(event.target.value)} />
							</div>
							<Button type="button" disabled={loading || submitting} onClick={() => { setPage(1); setKeyword(keywordInput); }}>Search</Button>
							<Button type="button" variant="outline" onClick={() => setKeywordInput("")}>Cancel</Button>
						</div>

						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-12">
										<Checkbox checked={allSelected} onCheckedChange={value => toggleAll(value == true)} />
									</TableHead>
									<TableHead>Apply ID</TableHead>
									<TableHead>Acc. Name</TableHead>
									<TableHead>Address 1</TableHead>
									<TableHead>Officer Name</TableHead>
									<TableHead>Requestor</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{rows.length == 0 ? (
									<TableRow>
										<TableCell colSpan={6} className="text-muted-foreground py-10 text-center text-sm">Tidak ada data pending approval.</TableCell>
									</TableRow>
								) : rows.map(row => (
									<TableRow key={row.assignment_id} className={row.selected ? "bg-primary/5" : ""}>
										<TableCell>
											<Checkbox checked={row.selected} onCheckedChange={() => toggleRow(row.assignment_id)} />
										</TableCell>
										<TableCell>
											<span className="text-primary cursor-pointer font-medium hover:underline">{row.apply_id}</span>
										</TableCell>
										<TableCell className="font-medium">{row.account_name}</TableCell>
										<TableCell className="text-muted-foreground text-sm">{row.address}</TableCell>
										<TableCell>
											<Badge variant="outline" className="font-mono text-xs">{row.officer_name ?? "-"}</Badge>
										</TableCell>
										<TableCell>{row.requestor_name ?? row.requestor_id}</TableCell>
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

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Card>
						<CardContent className="pt-5">
							<p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">Requestor Info</p>
							<div className="flex items-center gap-3">
								<div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
									<UserCheckIcon className="text-primary size-5" />
								</div>
								<div>
									<p className="text-sm font-semibold">{requestorInfo.name}</p>
									<p className="text-muted-foreground text-xs">{requestorInfo.role}</p>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="pt-5">
							<p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">Approval Notes</p>
							<Textarea
								placeholder="Add remarks for this decision (optional)..."
								value={approvalNotes}
								onChange={event => setApprovalNotes(event.target.value)}
								className="resize-none text-sm"
								rows={3}
							/>
						</CardContent>
					</Card>
				</div>

				<Card className="border-dashed">
					<CardContent className="py-3">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="text-muted-foreground flex items-center gap-2 text-sm">
								<AlertTriangleIcon className="text-amber-500 size-4 shrink-0" />
								Bulk action will apply to selected records only.
								{selectedCount > 0 ? <Badge variant="secondary" className="ml-1">{selectedCount} selected</Badge> : null}
							</div>

							<div className="flex gap-2">
								<Button type="button" variant="outline" onClick={() => { setRows(previous => previous.map(row => ({ ...row, selected: false }))); setApprovalNotes(""); }}>
									Cancel
								</Button>
								<Button type="button" variant="destructive" disabled={selectedCount == 0 || submitting} onClick={() => setRejectDialogOpen(true)} className="gap-1.5">
									<XCircleIcon className="size-4" />
									Reject
								</Button>
								<Button type="button" disabled={selectedCount == 0 || submitting} onClick={() => void runDecision("approve")} className="gap-1.5 bg-teal-600 text-white hover:bg-teal-700">
									<CheckCircle2Icon className="size-4" />
									Approve
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			<Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Konfirmasi Penolakan</DialogTitle>
						<DialogDescription>
							<strong>{selectedCount} record</strong> akan ditolak. Maker akan mendapat notifikasi untuk merevisi penugasan.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-1.5 py-2">
						<Label className="text-sm">Rejection Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
						<Textarea
							placeholder="Tulis alasan penolakan..."
							value={approvalNotes}
							onChange={event => setApprovalNotes(event.target.value)}
							className="resize-none"
							rows={3}
						/>
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setRejectDialogOpen(false)}>Batal</Button>
						<Button type="button" variant="destructive" onClick={() => void runDecision("reject")} disabled={submitting}>Ya, Tolak</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={resultDialog != null} onOpenChange={() => setResultDialog(null)}>
				<DialogContent>
					<DialogHeader>
						<div className="flex items-center gap-3">
							{resultDialog == "approve" ? (
								<CheckCircle2Icon className="text-teal-600 size-8 shrink-0" />
							) : (
								<XCircleIcon className="text-destructive size-8 shrink-0" />
							)}
							<div>
								<DialogTitle>{resultDialog == "approve" ? "Data has changed" : "Data has rejected"}</DialogTitle>
								<DialogDescription className="mt-1">
									{resultDialog == "approve"
										? "Penugasan akun telah disetujui. Officer siap melaksanakan survei."
										: "Penugasan akun telah ditolak. Maker dapat merevisi kembali."}
								</DialogDescription>
							</div>
						</div>
					</DialogHeader>
					<DialogFooter>
						<Button type="button" onClick={() => setResultDialog(null)}>OK</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
