"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import { CircleAlertIcon, DownloadIcon } from "lucide-react";

import { DatetimeInput } from "@/components/DatetimeInput";
import { SearchableSelect, type SearchableSelectOption } from "@/components/SearchableSelect";
import { Alert, AlertDescription, AlertTitle } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Checkbox } from "@/components/radix/Checkbox";
import { Input } from "@/components/radix/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/radix/Table";

import {
	defaultLoginActivityJakartaWeekRange,
	formatInstantAsJakartaDateTime,
	LOGIN_ACTIVITY_MAX_RANGE_DAYS,
	LOGIN_ACTIVITY_TIMEZONE
} from "@/utils/activityLogController";

import { DashboardManagementPageFrame, DashboardManagementPagination } from "../layout.components";
import * as loginActivityActions from "./page.actions";
import type { LoginActivityAggregatedRow } from "./page.actions";

const PAGE_SIZE = 20;

function formatLogoutCell(iso: string | null): string {
	if(iso == null || iso.length == 0)
		return "No logout recorded";
	return formatInstantAsJakartaDateTime(iso);
}

function rowKey(row: LoginActivityAggregatedRow): string {
	return `${row.dateYmd}|${row.userId}`;
}

export function LoginActivityLogPage() {
	const initialWeek = useMemo(() => defaultLoginActivityJakartaWeekRange(7), []);

	const [draftFrom, setDraftFrom] = useState(initialWeek.fromYmd);
	const [draftUntil, setDraftUntil] = useState(initialWeek.untilYmd);
	const [draftUsername, setDraftUsername] = useState("");
	const [draftUserId, setDraftUserId] = useState("");

	const [appliedFrom, setAppliedFrom] = useState(initialWeek.fromYmd);
	const [appliedUntil, setAppliedUntil] = useState(initialWeek.untilYmd);
	const [appliedUsername, setAppliedUsername] = useState("");
	const [appliedUserId, setAppliedUserId] = useState("");

	const [pageIndex, setPageIndex] = useState(1);
	const [rows, setRows] = useState<LoginActivityAggregatedRow[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<Set<string>>(() => new Set());

	const [userOptions, setUserOptions] = useState<SearchableSelectOption[]>([]);

	const fetchUsers = useCallback(async (keyword: string, selectedValues: string[]): Promise<SearchableSelectOption[]> => {
		const list = await loginActivityActions.searchUsersForLoginActivityFilterAction(keyword);
		const selectedSet = new Set(selectedValues.filter(value => value.length > 0));
		if(draftUserId.length > 0)
			selectedSet.add(draftUserId);
		const mapped = list.map(entry => ({ value: entry.value, label: entry.label }));
		setUserOptions(prev => {
			const byValue = new Map<string, SearchableSelectOption>();
			for(const option of [...mapped, ...prev])
				byValue.set(option.value, option);
			for(const id of selectedSet) {
				const found = byValue.get(id);
				if(found == null) {
					const fromPrev = prev.find(option => option.value == id);
					if(fromPrev != null)
						byValue.set(id, fromPrev);
				}
			}
			return [...byValue.values()];
		});
		return mapped;
	}, [draftUserId]);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		const result = await loginActivityActions.queryLoginActivityAggregatesAction({
			fromYmd: appliedFrom,
			untilYmd: appliedUntil,
			usernameSearch: appliedUsername,
			userId: appliedUserId,
			page: pageIndex,
			pageSize: PAGE_SIZE
		});
		setLoading(false);
		if("error" in result) {
			setError(result.error);
			setRows([]);
			setTotal(0);
			return;
		}
		setRows(result.rows);
		setTotal(result.total);
		setSelected(previous => {
			const next = new Set<string>();
			for(const row of result.rows) {
				const key = rowKey(row);
				if(previous.has(key))
					next.add(key);
			}
			return next;
		});
	}, [appliedFrom, appliedUntil, appliedUsername, appliedUserId, pageIndex]);

	useEffect(() => {
		void load();
	}, [load]);

	const draftRangeDays = useMemo(() => {
		const from = new Date(`${draftFrom}T12:00:00+07:00`);
		const until = new Date(`${draftUntil}T12:00:00+07:00`);
		if(Number.isNaN(from.getTime()) || Number.isNaN(until.getTime()))
			return null;
		return differenceInCalendarDays(until, from) + 1;
	}, [draftFrom, draftUntil]);

	const draftRangeInvalid = draftRangeDays != null && draftRangeDays > LOGIN_ACTIVITY_MAX_RANGE_DAYS;

	const handleSearch = () => {
		if(draftRangeInvalid)
			return;
		setAppliedFrom(draftFrom);
		setAppliedUntil(draftUntil);
		setAppliedUsername(draftUsername);
		setAppliedUserId(draftUserId);
		setPageIndex(1);
		setSelected(new Set());
	};

	const handleCancel = () => {
		const resetWeek = defaultLoginActivityJakartaWeekRange(7);
		setDraftFrom(resetWeek.fromYmd);
		setDraftUntil(resetWeek.untilYmd);
		setDraftUsername("");
		setDraftUserId("");
		setAppliedFrom(resetWeek.fromYmd);
		setAppliedUntil(resetWeek.untilYmd);
		setAppliedUsername("");
		setAppliedUserId("");
		setPageIndex(1);
		setSelected(new Set());
	};

	const hasPreviousPage = pageIndex > 1;
	const hasNextPage = pageIndex * PAGE_SIZE < total;

	const allOnPageSelected = rows.length > 0 && rows.every(row => selected.has(rowKey(row)));
	const someOnPageSelected = rows.some(row => selected.has(rowKey(row)));

	const toggleSelectAllOnPage = (checked: boolean) => {
		setSelected(previous => {
			const next = new Set(previous);
			for(const row of rows) {
				const key = rowKey(row);
				if(checked)
					next.add(key);
				else
					next.delete(key);
			}
			return next;
		});
	};

	const toggleRow = (key: string, checked: boolean) => {
		setSelected(previous => {
			const next = new Set(previous);
			if(checked)
				next.add(key);
			else
				next.delete(key);
			return next;
		});
	};

	const handleDownload = async () => {
		setError(null);
		const keys = selected.size > 0 ? [...selected] : null;
		const result = await loginActivityActions.downloadLoginActivityCsvAction({
			fromYmd: appliedFrom,
			untilYmd: appliedUntil,
			usernameSearch: appliedUsername,
			userId: appliedUserId,
			rowKeys: keys
		});
		if("error" in result) {
			setError(result.error);
			return;
		}
		const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = result.filename;
		anchor.click();
		URL.revokeObjectURL(url);
	};

	return (
		<DashboardManagementPageFrame
			title="Login Activity Log"
			description={`Daily buckets and date filters use ${LOGIN_ACTIVITY_TIMEZONE.replace(/_/g, " ")} (WIB). Timestamps are shown in that zone. If the user did not explicitly log out (e.g. closed the browser), Last Logout shows “No logout recorded”.`}
		>
			<div className="flex flex-col gap-4">
				<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
					<div className="space-y-1">
						<p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">From</p>
						<DatetimeInput mode="date" value={draftFrom} onChange={setDraftFrom} />
					</div>
					<div className="space-y-1">
						<p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Until</p>
						<DatetimeInput mode="date" value={draftUntil} onChange={setDraftUntil} />
					</div>
					<div className="space-y-1 lg:col-span-2">
						<p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Username search</p>
						<Input
							value={draftUsername}
							onChange={event => setDraftUsername(event.target.value)}
							placeholder="Search by name or email"
							autoComplete="off"
						/>
					</div>
				</div>
				<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 md:items-end">
					<div className="space-y-1 lg:col-span-2">
						<p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">User</p>
						<SearchableSelect
							value={draftUserId}
							onValueChange={setDraftUserId}
							options={userOptions}
							onSearch={fetchUsers}
							placeholder="All users"
							allowClear
							clearLabel="All users"
							searchRefetchInterval={false}
							searchRefetchOnWindowFocus={false}
						/>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button type="button" onClick={handleSearch} disabled={loading || draftRangeInvalid}>
							Search
						</Button>
						<Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
							Cancel
						</Button>
						<Button type="button" variant="secondary" onClick={() => void handleDownload()} disabled={loading}>
							<DownloadIcon className="size-4" />
							Download
						</Button>
					</div>
				</div>
				{draftRangeInvalid ? (
					<p className="text-destructive text-sm">
						{`Date range must be at most ${String(LOGIN_ACTIVITY_MAX_RANGE_DAYS)} days (inclusive).`}
					</p>
				) : null}
				{error != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>Error</AlertTitle>
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				) : null}
				<div className="rounded-md border overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>DATE</TableHead>
								<TableHead>FIRST LOGIN TIME</TableHead>
								<TableHead>LAST LOGIN TIME</TableHead>
								<TableHead>LAST LOGOUT TIME</TableHead>
								<TableHead>USER ID</TableHead>
								<TableHead>IP</TableHead>
								<TableHead className="w-28 text-center">
									<div className="flex items-center justify-center gap-2">
										<span>SELECT</span>
										<Checkbox
											checked={allOnPageSelected ? true : someOnPageSelected ? "indeterminate" : false}
											onCheckedChange={value => toggleSelectAllOnPage(value == true)}
											aria-label="Select all on this page"
										/>
									</div>
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{loading ? (
								<TableRow>
									<TableCell colSpan={7} className="text-muted-foreground py-8 text-center text-sm">
										Loading login activity...
									</TableCell>
								</TableRow>
							) : rows.length == 0 ? (
								<TableRow>
									<TableCell colSpan={7} className="text-muted-foreground text-center text-sm py-8">
										No aggregated login activity for the selected filters.
									</TableCell>
								</TableRow>
							) : (
								rows.map(row => {
									const key = rowKey(row);
									return (
										<TableRow key={key}>
											<TableCell className="font-mono text-xs whitespace-nowrap">{row.dateYmd}</TableCell>
											<TableCell className="text-sm whitespace-nowrap">{formatInstantAsJakartaDateTime(row.firstLoginTime)}</TableCell>
											<TableCell className="text-sm whitespace-nowrap">{formatInstantAsJakartaDateTime(row.lastLoginTime)}</TableCell>
											<TableCell className="text-sm whitespace-nowrap">{formatLogoutCell(row.lastLogoutTime)}</TableCell>
											<TableCell className="font-mono text-xs">{row.userId}</TableCell>
											<TableCell className="font-mono text-xs">{row.ip ?? "—"}</TableCell>
											<TableCell className="text-center">
												<Checkbox
													checked={selected.has(key)}
													onCheckedChange={value => toggleRow(key, value == true)}
													aria-label={`Select ${key}`}
												/>
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</div>
				<DashboardManagementPagination
					pageIndex={pageIndex}
					totalRequests={total}
					hasPreviousPage={hasPreviousPage}
					hasNextPage={hasNextPage}
					isLoading={loading}
					isMutating={false}
					onPrevious={() => setPageIndex(previous => Math.max(1, previous - 1))}
					onNext={() => setPageIndex(previous => previous + 1)}
					summaryItemLabel="aggregate row(s)"
				/>
			</div>
		</DashboardManagementPageFrame>
	);
}
