"use client";

import { useMemo, useState, useEffect } from "react";
import { SearchIcon, UserPlusIcon, SaveIcon, AlertTriangleIcon, UsersIcon } from "lucide-react";

import { Badge } from "@/components/radix/Badge";
import { Button } from "@/components/radix/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/radix/Card";
import { Checkbox } from "@/components/radix/Checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/radix/Dialog";
import { Input } from "@/components/radix/Input";
import { Label } from "@/components/radix/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/radix/Select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/radix/Table";
import { Alert, AlertDescription, AlertTitle } from "@/components/radix/Alert";
import { SearchableMultiSelect } from "@/components/SearchableSelect";

import { AccountAssignmentPagination, parseErrorMessage } from "../shared.components";
import {
	createAssignmentRequestsAction,
	listAssignmentOfficerOptionsAction,
	queryMakerAssignmentsAction,
	reassignAssignmentRequestAction
} from "../layout.actions";

type MakerRow = {
	assignment_id: string | null;
	assignment_status: "pending_approval" | "approved" | "rejected" | null;
	apply_id: string;
	account_name: string;
	officer_name: string | null;
	address: string;
	product_code: string;
};

const PAGE_SIZE = 20;

export default function PenugasanAkunMakerPage() {
	const [searchBy, setSearchBy] = useState("apply_id");
	const [keywordInput, setKeywordInput] = useState("");
	const [keyword, setKeyword] = useState("");
	const [page, setPage] = useState(1);
	const [rows, setRows] = useState<MakerRow[]>([]);
	const [total, setTotal] = useState(0);
	const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});
	const [loading, setLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const [officers, setOfficers] = useState<Array<{ id: string; name: string }>>([]);
	const [selectedOfficerIds, setSelectedOfficerIds] = useState<string[]>([]);
	const [showPanel, setShowPanel] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [reloadKey, setReloadKey] = useState(0);

	const selectedRows = useMemo(
		() => rows.filter(row => selectedMap[row.apply_id] == true),
		[rows, selectedMap]
	);
	const selectedCount = selectedRows.length;
	const allSelected = rows.length > 0 && rows.every(row => selectedMap[row.apply_id] == true);
	const totalPages = Math.max(1, Math.ceil(Math.max(total, 1) / PAGE_SIZE));

	const filteredRows = useMemo(() => {
		if(searchBy != "officer_name")
			return rows;
		const term = keyword.trim().toLowerCase();
		if(term.length == 0)
			return rows;
		return rows.filter(row => (row.officer_name ?? "").toLowerCase().includes(term));
	}, [rows, searchBy, keyword]);

	useEffect(() => {
		void (async () => {
			try {
				const docs = await listAssignmentOfficerOptionsAction();
				setOfficers(docs ?? []);
			} catch {
				setOfficers([]);
			}
		})();
	}, []);

	useEffect(() => {
		if(searchBy == "officer_name") {
			setRows([]);
			setTotal(0);
			setSelectedMap({});
			return;
		}

		void (async () => {
			setLoading(true);
			setErrorMessage(null);
			try {
				const data = await queryMakerAssignmentsAction({
					search: keyword,
					page,
					limit: PAGE_SIZE
				});
				setRows(data.docs ?? []);
				setTotal(data.totalDocs ?? 0);
				setSelectedMap({});
			} catch(error) {
				setErrorMessage(parseErrorMessage(error, "Failed to load account list."));
			} finally {
				setLoading(false);
			}
		})();
	}, [keyword, page, reloadKey, searchBy]);

	const selectedOfficerLabel = selectedOfficerIds
		.map(id => officers.find(officer => officer.id == id)?.name ?? id)
		.join(", ");

	const toggleRow = (applyId: string) => {
		setSelectedMap(previous => ({
			...previous,
			[applyId]: !previous[applyId]
		}));
	};

	const toggleAll = (checked: boolean) => {
		setSelectedMap(rows.reduce<Record<string, boolean>>((accumulator, row) => {
			accumulator[row.apply_id] = checked;
			return accumulator;
		}, {}));
	};

	const handleReset = () => {
		setSelectedMap({});
		setShowPanel(false);
		setSelectedOfficerIds([]);
		setKeywordInput("");
		setKeyword("");
		setPage(1);
	};

	const handleSave = () => {
		if(selectedOfficerIds.length == 0)
			return;
		if(selectedOfficerIds.length != 1 && selectedOfficerIds.length != selectedRows.length) {
			setErrorMessage("Please select one officer for all rows, or match the number of selected officers with selected accounts.");
			return;
		}
		setConfirmOpen(true);
	};

	const resolveOfficerForRow = (index: number): string => {
		if(selectedOfficerIds.length == 1)
			return selectedOfficerIds[0];
		return selectedOfficerIds[index];
	};

	const confirmSave = async () => {
		if(selectedOfficerIds.length == 0 || selectedRows.length == 0)
			return;
		if(selectedOfficerIds.length != 1 && selectedOfficerIds.length != selectedRows.length)
			return;

		setSubmitting(true);
		setErrorMessage(null);
		setConfirmOpen(false);
		setShowPanel(false);
		try {
			const officerByApplyId = new Map<string, string>(selectedRows.map((row, index) => [row.apply_id, resolveOfficerForRow(index)]));
			const createRows = selectedRows.filter(row => row.assignment_id == null);
			const reassignRows = selectedRows.filter(row => row.assignment_id != null);
			const pendingRows = reassignRows.filter(row => row.assignment_status == "pending_approval");
			if(pendingRows.length > 0)
				throw new Error("One or more selected accounts are still pending approval and cannot be reassigned yet.");

			if(createRows.length > 0) {
				await createAssignmentRequestsAction({
					apply_ids: createRows.map(row => row.apply_id),
					officer_ids: createRows.map(row => officerByApplyId.get(row.apply_id) ?? "")
				});
			}

			for(const row of reassignRows) {
				await reassignAssignmentRequestAction({
					assignmentId: String(row.assignment_id),
					officer_ids: [officerByApplyId.get(row.apply_id) ?? ""]
				});
			}

			setSelectedOfficerIds([]);
			setSelectedMap({});
			setPage(1);
			setReloadKey(previous => previous + 1);
		} catch(error) {
			setErrorMessage(parseErrorMessage(error, "Failed to submit assignment request."));
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
							<span className="bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Pembuat (Maker)</span>
							<a href="/account-assignment/checker" className="text-muted-foreground px-5 py-2 text-sm font-medium hover:text-foreground">Penyetuju (Checker)</a>
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
					<CardContent className="pt-5">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
							<div className="flex flex-col gap-1.5">
								<Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Search By</Label>
								<Select value={searchBy} onValueChange={setSearchBy}>
									<SelectTrigger className="w-52">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="apply_id">Account Name / Apply ID</SelectItem>
										<SelectItem value="officer_name">Officer Name</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="flex flex-1 flex-col gap-1.5">
								<Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Please Input</Label>
								<Input
									placeholder="Enter keywords..."
									value={keywordInput}
									onChange={event => setKeywordInput(event.target.value)}
									onKeyDown={event => {
										if(event.key == "Enter") {
											setPage(1);
											setKeyword(keywordInput);
										}
									}}
								/>
							</div>

							<div className="flex gap-2">
								<Button type="button" disabled={loading || submitting} onClick={() => { setPage(1); setKeyword(keywordInput); }}>
									<SearchIcon className="mr-2 size-4" />
									Search
								</Button>
								<Button type="button" variant="outline" onClick={() => setKeywordInput("")}>Cancel</Button>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="pt-5">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-12">
										<Checkbox checked={allSelected} onCheckedChange={value => toggleAll(value == true)} />
									</TableHead>
									<TableHead>Apply ID</TableHead>
									<TableHead>Acc. Name</TableHead>
									<TableHead>Officer Name</TableHead>
									<TableHead>Address 1</TableHead>
									<TableHead>Product Code</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{(searchBy == "officer_name" ? filteredRows : rows).length == 0 ? (
									<TableRow>
										<TableCell colSpan={6} className="text-muted-foreground py-10 text-center text-sm">
											No account rows found.
										</TableCell>
									</TableRow>
								) : (searchBy == "officer_name" ? filteredRows : rows).map(row => (
									<TableRow key={row.apply_id} className={selectedMap[row.apply_id] == true ? "bg-primary/5" : ""}>
										<TableCell>
											<Checkbox checked={selectedMap[row.apply_id] == true} onCheckedChange={() => toggleRow(row.apply_id)} />
										</TableCell>
										<TableCell>
											<span className="text-primary cursor-pointer font-medium hover:underline">{row.apply_id}</span>
										</TableCell>
										<TableCell className="font-medium">{row.account_name}</TableCell>
										<TableCell>
											{row.officer_name != null ? (
												<Badge variant="outline" className="font-mono text-xs">{row.officer_name}</Badge>
											) : (
												<span className="text-muted-foreground text-sm">Unassigned</span>
											)}
										</TableCell>
										<TableCell className="text-muted-foreground text-sm">{row.address}</TableCell>
										<TableCell>
											<Badge className="border border-sky-200 bg-sky-100 text-xs font-semibold text-sky-700 hover:bg-sky-100">{row.product_code}</Badge>
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

				<div className="flex justify-end gap-3">
					<Button type="button" variant="outline" onClick={handleReset}>Cancel</Button>
					<Button type="button" onClick={() => setShowPanel(true)} disabled={selectedCount == 0 || submitting} className="gap-2">
						<UserPlusIcon className="size-4" />
						Assignment
						{selectedCount > 0 ? (
							<Badge className="ml-1 bg-white/20 px-1.5 text-xs text-white">{selectedCount}</Badge>
						) : null}
					</Button>
				</div>

				{showPanel ? (
					<Card className="border-primary/20 border-2 shadow-md">
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center gap-2 text-base">
								<UsersIcon className="text-primary size-5" />
								Penugasan Officer
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-5">
							<div className="space-y-1.5">
								<Label>Officer Name <span className="text-destructive">*</span></Label>
								<SearchableMultiSelect
									values={selectedOfficerIds}
									onValuesChange={setSelectedOfficerIds}
									placeholder="Please select officer(s)"
									searchPlaceholder="Search officer..."
									options={officers.map(officer => ({
										value: officer.id,
										label: `${officer.name} - ${officer.id}`,
										keywords: `${officer.name} ${officer.id}`
									}))}
								/>
								<p className="text-muted-foreground text-xs">
									Pick one officer for all selected accounts, or pick the same number of officers as selected accounts.
								</p>
							</div>

							<div className="flex flex-wrap items-center justify-between gap-3">
								<div className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-600">
									<AlertTriangleIcon className="size-3.5 shrink-0" />
									Requires Checker Validation
								</div>

								<div className="flex gap-2">
									<Button type="button" variant="outline" onClick={() => { setShowPanel(false); setSelectedOfficerIds([]); }}>Cancel</Button>
									<Button type="button" onClick={handleSave} disabled={selectedOfficerIds.length == 0 || submitting} className="gap-1.5">
										<SaveIcon className="size-4" />
										Save
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				) : null}
			</div>

			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Konfirmasi Penugasan</DialogTitle>
						<DialogDescription>
							<strong>{selectedCount} akun</strong> akan ditugaskan ke <strong>{selectedOfficerLabel}</strong>. Data akan dikirim ke checker untuk persetujuan.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>Batal</Button>
						<Button type="button" onClick={() => void confirmSave()} disabled={submitting}>Ya, Submit ke Checker</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
