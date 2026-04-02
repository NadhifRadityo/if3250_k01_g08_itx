"use client";

import { useRef, useMemo, useState, useEffect, useCallback, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";
import { XIcon, InfoIcon, LockIcon, MailIcon, PhoneIcon, SearchIcon, ArrowUpDownIcon, ChevronDownIcon } from "lucide-react";

import cn from "@/utils/cn";
import ActionButton from "@/components/userManagement/ActionButton";
import RoleBadge from "@/components/userManagement/RoleBadge";
import TextAction from "@/components/userManagement/TextAction";
import UserDirectoryRow from "@/components/userManagement/UserDirectoryRow";

import { scrollStagedUsersAction, searchStagedUsersAction } from "./page.actions";

const ITEM_LIMIT = 20;

const sortOptions = [
	{ field: "updatedAt", label: "Terakhir Diperbarui" },
	{ field: "createdAt", label: "Tanggal Dibuat" },
	{ field: "name", label: "Nama" },
	{ field: "email", label: "Email" },
	{ field: "reviewedAt", label: "Tanggal Review" }
] as const;

type SortField = (typeof sortOptions)[number]["field"];
type SortDirection = "asc" | "desc";
type SearchStagedUsersResult = Awaited<ReturnType<typeof searchStagedUsersAction>>;
type StagedUser = SearchStagedUsersResult["result"][number];

function getInitials(name: string) {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if(parts.length == 0) return "--";
	return parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join("");
}

function formatDateTime(dateValue: string | Date | null | undefined) {
	if(dateValue == null)
		return { date: "-", time: "-" };
	const parsedDate = new Date(dateValue);
	if(Number.isNaN(parsedDate.getTime()))
		return { date: "-", time: "-" };
	return {
		date: parsedDate.toLocaleDateString("id-ID", {
			day: "2-digit",
			month: "short",
			year: "numeric"
		}),
		time: `${parsedDate.toLocaleTimeString("id-ID", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false
		})} WIB`
	};
}

function mapRole(role: unknown): "admin" | "manager" | "supervisor" | "officer" {
	if(role == "admin" || role == "manager" || role == "supervisor" || role == "officer")
		return role;
	return "officer";
}

function mapStatus(stagedUser: StagedUser): "active" | "pending" | "rejected" {
	const normalizedUser = stagedUser as StagedUser & { reviewApproved?: boolean | null, reviewApproved?: boolean | null };
	const reviewApproved = normalizedUser.reviewApproved ?? normalizedUser.reviewApproved ?? null;
	if(stagedUser.reviewedAt == null)
		return "pending";
	return reviewApproved == true ? "active" : "rejected";
}

function Field({
	label,
	required = false,
	children
}: {
	label: string;
	required?: boolean;
	children: ReactNode;
}) {
	return (
		<label className="space-y-1.5">
			<p className="text-[11px] font-semibold text-[#3B4A5C]">
				{label}
				{required ? <span className="ml-1 text-[#D73A49]">*</span> : null}
			</p>
			{children}
		</label>
	);
}

function Input({ icon, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }) {
	return (
		<div className="relative">
			{icon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9BA8B7]">{icon}</span> : null}
			<input
				className={cn("h-10 w-full rounded-md border border-[#D0DAE5] bg-white px-3 text-xs text-[#1E2D3D] placeholder:text-[#9BA8B7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A8FC1]/35", className)}
				{...props}
			/>
		</div>
	);
}

function SelectInput({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
	return (
		<div className="relative">
			<select
				className={cn(
					"h-10 w-full appearance-none rounded-md border border-[#D0DAE5] bg-white px-3 pr-9 text-xs text-[#516277] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A8FC1]/35",
					className
				)}
				{...props}
			>
				{children}
			</select>
			<ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-[#516277]" />
		</div>
	);
}

export default function UserManagementPage() {
	const [activeApprovalRole, setActiveApprovalRole] = useState<"maker" | "checker">("maker");
	const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
	const [searchKeyword, setSearchKeyword] = useState("");
	const [debouncedKeyword, setDebouncedKeyword] = useState("");
	const [showSortOptions, setShowSortOptions] = useState(false);
	const [sortState, setSortState] = useState<Array<{ field: SortField, direction: SortDirection }>>([
		{ field: "updatedAt", direction: "desc" }
	]);
	const [users, setUsers] = useState<StagedUser[]>([]);
	const [pageIndex, setPageIndex] = useState(0);
	const [totalUsers, setTotalUsers] = useState(0);
	const [resultRemaining, setResultRemaining] = useState(0);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const requestSequence = useRef(0);

	const sortTokens = useMemo(() => (
		sortState.map(({ field, direction }) => `${direction == "desc" ? "-" : "+"}${field}`)
	), [sortState]);

	const rows = useMemo(() => (
		users.map(user => {
			const { date, time } = formatDateTime(user.updatedAt ?? user.createdAt);
			return {
				id: user.id,
				name: user.name,
				email: user.email,
				initials: getInitials(user.name),
				empId: user.employeeId,
				role: mapRole(user.role),
				status: mapStatus(user),
				date,
				time,
				paginationCursor: user.paginationCursor
			};
		})
	), [users]);

	const canGoPrevious = pageIndex > 0 && rows.length > 0 && !isLoading;
	const canGoNext = rows.length > 0 && resultRemaining > rows.length && !isLoading;

	const loadFirstPage = useCallback(async () => {
		const currentRequest = ++requestSequence.current;
		setIsLoading(true);
		setErrorMessage(null);
		try {
			const result = await searchStagedUsersAction(debouncedKeyword, sortTokens, ITEM_LIMIT);
			if(currentRequest != requestSequence.current) return;
			setUsers(result.result);
			setTotalUsers(result.total);
			setResultRemaining(result.resultRemaining);
			setPageIndex(0);
			setSelectedUserIds([]);
		} catch(error) {
			if(currentRequest != requestSequence.current) return;
			setUsers([]);
			setTotalUsers(0);
			setResultRemaining(0);
			setPageIndex(0);
			setErrorMessage(error instanceof Error ? error.message : "Gagal memuat data staged user.");
		} finally {
			if(currentRequest == requestSequence.current)
				setIsLoading(false);
		}
	}, [debouncedKeyword, sortTokens]);

	const scrollPage = useCallback(async (direction: "next" | "previous") => {
		const cursor = direction == "next" ? rows.at(-1)?.paginationCursor : rows[0]?.paginationCursor;
		if(cursor == null) return;
		const currentRequest = ++requestSequence.current;
		setIsLoading(true);
		setErrorMessage(null);
		try {
			const result = await scrollStagedUsersAction(
				cursor,
				direction == "next" ? { next: ITEM_LIMIT } : { previous: ITEM_LIMIT }
			);
			if(currentRequest != requestSequence.current) return;
			if(result.result.length == 0) {
				setResultRemaining(0);
				return;
			}
			setUsers(result.result);
			setTotalUsers(result.total);
			setResultRemaining(result.resultRemaining);
			setSelectedUserIds([]);
			setPageIndex(previous => Math.max(0, previous + (direction == "next" ? 1 : -1)));
		} catch(error) {
			if(currentRequest != requestSequence.current) return;
			setErrorMessage(error instanceof Error ? error.message : "Gagal memuat halaman staged user.");
		} finally {
			if(currentRequest == requestSequence.current)
				setIsLoading(false);
		}
	}, [rows]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			setDebouncedKeyword(searchKeyword.trim());
		}, 300);
		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [searchKeyword]);

	useEffect(() => {
		void loadFirstPage();
	}, [loadFirstPage]);

	const toggleUserSelection = (userId: string) => {
		setSelectedUserIds(previous => (
			previous.includes(userId) ?
				previous.filter(id => id != userId) :
				[...previous, userId]
		));
	};

	const toggleSortField = (field: SortField) => {
		setSortState(previous => {
			const existingIndex = previous.findIndex(sortItem => sortItem.field == field);
			if(existingIndex == -1)
				return [...previous, { field, direction: "asc" }];
			const existing = previous[existingIndex];
			if(existing.direction == "asc")
				return previous.map((sortItem, index) => index == existingIndex ? { ...sortItem, direction: "desc" } : sortItem);
			return previous.filter(sortItem => sortItem.field != field);
		});
	};

	const showingFrom = rows.length == 0 ? 0 : pageIndex * ITEM_LIMIT + 1;
	const showingTo = pageIndex * ITEM_LIMIT + rows.length;

	return (
		<main className="min-h-screen bg-[#F0F8FF] px-4 py-5 lg:px-7">
			<div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 xl:flex-row xl:items-start">
				<section className="min-w-0 flex-1 px-2 py-2 lg:px-4 lg:py-4">
					<div className="mb-4 flex items-center gap-2 text-[11px] text-[#7A8796]">
						<TextAction className="border-none text-[11px] font-medium text-[#4A8FBD] hover:border-none">Pengaturan</TextAction>
						<span>&gt;</span>
						<span className="font-medium text-[#2C3D50]">Manajemen Pengguna</span>
					</div>

					<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
						<div>
							<h1 className="text-[34px] font-semibold leading-tight text-[#1A2940]">Manajemen Pengguna</h1>
							<p className="mt-1 text-xs text-[#7C8898]">Kelola pengguna sistem, grup, dan persetujuan akses.</p>
						</div>

						<div className="flex items-center gap-1.5">
							<button
								type="button"
								onClick={() => setActiveApprovalRole("maker")}
								className="rounded-[10px] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(58,143,193,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A8FC1]/35"
								aria-pressed={activeApprovalRole == "maker"}
							>
								<RoleBadge
									className="h-6 min-w-0 px-3 text-[9px] tracking-[0.08em]"
									variant={activeApprovalRole == "maker" ? "default" : "muted"}
								>
									Pembuat (Maker)
								</RoleBadge>
							</button>
							<button
								type="button"
								onClick={() => setActiveApprovalRole("checker")}
								className="rounded-[10px] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(58,143,193,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A8FC1]/35"
								aria-pressed={activeApprovalRole == "checker"}
							>
								<RoleBadge
									className="h-6 min-w-0 px-3 text-[9px] tracking-[0.08em]"
									variant={activeApprovalRole == "checker" ? "default" : "muted"}
								>
									Penyetuju (Checker)
								</RoleBadge>
							</button>
						</div>
					</div>

					<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
						<div className="flex flex-wrap items-center gap-2">
							<div className="relative">
								<SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#93A1B0]" />
								<input
									value={searchKeyword}
									onChange={event => setSearchKeyword(event.target.value)}
									placeholder="Cari username atau ID karyawan..."
									className="h-8 w-[290px] rounded-md border border-[#C7D3DF] bg-[#EEF3F8] pl-9 pr-3 text-xs text-[#213346] placeholder:text-[#9AA7B6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A8FC1]/35"
								/>
							</div>
							<ActionButton
								variant="filter"
								className="h-8 bg-[#F8FCFF] px-3 text-[10px]"
								onClick={() => setShowSortOptions(previous => !previous)}
							>
								Urutkan
							</ActionButton>
						</div>

						<ActionButton variant="add" className="h-8 px-4 text-[10px] shadow-none hover:shadow-none" />
					</div>

					{showSortOptions ? (
						<div className="mb-4 rounded-lg border border-[#C8D2DE] bg-white px-3 py-3 shadow-[0_4px_10px_rgba(34,55,79,0.06)]">
							<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
								<p className="text-xs font-semibold text-[#2C3D50]">Multi Sort</p>
								<button
									type="button"
									onClick={() => setSortState([])}
									className="text-[11px] font-medium text-[#4A8FBD] hover:text-[#2B6D98]"
								>
									Reset
								</button>
							</div>
							<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
								{sortOptions.map(option => {
									const sortIndex = sortState.findIndex(sortItem => sortItem.field == option.field);
									const sortItem = sortIndex == -1 ? null : sortState[sortIndex];
									return (
										<button
											key={option.field}
											type="button"
											onClick={() => toggleSortField(option.field)}
											className={cn(
												"flex items-center justify-between rounded-md border px-3 py-2 text-left text-[11px] transition-colors",
												sortItem == null ?
													"border-[#CFD9E4] bg-[#F8FCFF] text-[#5C6B7C] hover:border-[#9DC0DA]" :
													"border-[#66A7D1] bg-[#E8F4FC] text-[#1E4A67]"
											)}
										>
											<span>{option.label}</span>
											<span className="inline-flex items-center gap-1">
												{sortItem == null ? (
													<ArrowUpDownIcon className="size-3.5" />
												) : (
													<>
														<span>{sortItem.direction == "asc" ? "ASC" : "DESC"}</span>
														<span className="rounded bg-[#3A8FC1] px-1.5 py-0.5 text-[10px] font-semibold text-white">{sortIndex + 1}</span>
													</>
												)}
											</span>
										</button>
									);
								})}
							</div>
							<p className="mt-2 text-[10px] text-[#7C8898]">Klik kolom untuk berputar ASC -&gt; DESC -&gt; mati.</p>
						</div>
					) : null}

					{errorMessage != null ? (
						<div className="mb-4 rounded-md border border-[#E4B7BC] bg-[#FFF1F3] px-3 py-2 text-xs text-[#9E2A35]">
							{errorMessage}
						</div>
					) : null}

					<div className="overflow-x-auto rounded-lg border border-[#C8D2DE] bg-[#F0F8FF] shadow-[0_4px_10px_rgba(34,55,79,0.06)]">
						<div className="min-w-[900px]">
							<div className="grid grid-cols-[30px_192px_108px_130px_112px_128px_80px] items-center gap-4 border-b border-[#D2DBE5] bg-[#F0F8FF] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#97A4B2]">
								<div />
								<p>Nama Pengguna</p>
								<p>ID Karyawan</p>
								<p>Peran (Role)</p>
								<p>Status</p>
								<p>Terakhir Diperbarui</p>
								<div />
							</div>

							{isLoading && rows.length == 0 ? (
								<div className="px-4 py-6 text-center text-xs text-[#708094]">Memuat data staged user...</div>
							) : null}

							{!isLoading && rows.length == 0 ? (
								<div className="px-4 py-6 text-center text-xs text-[#708094]">Tidak ada staged user yang sesuai.</div>
							) : null}

							{rows.map(row => (
								<UserDirectoryRow
									key={row.id}
									name={row.name}
									email={row.email}
									initials={row.initials}
									empId={row.empId}
									role={row.role}
									status={row.status}
									date={row.date}
									time={row.time}
									selected={selectedUserIds.includes(row.id)}
									onToggleSelected={() => toggleUserSelection(row.id)}
									tone="light"
									showMore
								/>
							))}

							<div className="flex items-center justify-between px-4 py-2.5 text-[10px] text-[#7F8D9E]">
								<p>Menampilkan {showingFrom}-{showingTo} dari {totalUsers} pengguna</p>
								<div className="flex gap-2">
									<ActionButton
										variant="previous"
										className="h-7 border-[#3A8FC1] bg-[#F8FCFF] px-3 text-[9px]"
										onClick={() => void scrollPage("previous")}
										disabled={!canGoPrevious}
									>
										Sebelumnya
									</ActionButton>
									<ActionButton
										variant="next"
										className="h-7 border-[#3A8FC1] bg-[#F8FCFF] px-3 text-[9px]"
										onClick={() => void scrollPage("next")}
										disabled={!canGoNext}
									>
										Berikutnya
									</ActionButton>
								</div>
							</div>
						</div>
					</div>
				</section>

				<div className="w-full xl:sticky xl:top-5 xl:w-[380px] xl:shrink-0">
					<aside className="rounded-lg border border-[#C8D2DE] bg-white shadow-[0_12px_24px_rgba(34,55,79,0.08)]">
						<div className="flex items-start justify-between border-b border-[#E1E6EC] px-4 py-3">
							<div>
								<h2 className="text-[21px] font-semibold text-[#1D2E42]">Tambah Pengguna Baru</h2>
								<p className="mt-0.5 max-w-[260px] text-xs text-[#7E8A99]">Isi formulir. Status akan dimulai Menunggu Persetujuan hingga diverifikasi.</p>
							</div>
							<button type="button" className="inline-flex size-7 items-center justify-center rounded text-[#7D8A99] hover:bg-[#EEF3F8]">
								<XIcon className="size-4" />
							</button>
						</div>

						<div className="space-y-4 px-4 py-3">
							<div className="flex items-center justify-end gap-2">
								<ActionButton variant="cancel" className="h-7 px-3 text-[9px]" />
								<ActionButton variant="submit" className="h-7 px-4 text-[9px] shadow-none hover:shadow-none" />
							</div>

							<div className="rounded-md border border-[#CFE0EF] bg-[#EDF6FC] p-3 text-[11px] leading-snug text-[#4B6B89]">
								<p className="flex items-start gap-1.5"><InfoIcon className="mt-0.5 size-3.5 shrink-0" />Sebagai <strong className="font-semibold text-[#2C4C6B]">Pembuat (Maker)</strong>, data yang dikirim akan berstatus <strong className="font-semibold text-[#2C4C6B]">Menunggu Persetujuan</strong> hingga diverifikasi oleh Penyetuju (Checker).</p>
							</div>

							<form className="space-y-3.5">
								<div className="grid grid-cols-2 gap-3">
									<Field label="Username" required>
										<Input placeholder="cth: budi.w" />
									</Field>
									<Field label="ID Karyawan" required>
										<Input placeholder="cth: EMP-2026" />
									</Field>
								</div>

								<Field label="Nama Lengkap" required>
									<Input placeholder="Nama lengkap" />
								</Field>

								<div className="grid grid-cols-2 gap-3">
									<Field label="Alamat Email" required>
										<Input icon={<MailIcon className="size-3.5" />} placeholder="pengguna@perusahaan.com" className="pl-8" />
									</Field>
									<Field label="Nomor Telepon">
										<Input icon={<PhoneIcon className="size-3.5" />} placeholder="0812xxxxxx" className="pl-8" />
									</Field>
								</div>

								<div className="h-px bg-[#E2E8EF]" />

								<div className="grid grid-cols-2 gap-3">
									<Field label="Grup Pengguna" required>
										<SelectInput defaultValue="" required>
											<option value="" disabled>Pilih grup</option>
											<option value="it-support">IT Support</option>
											<option value="operasional">Operasional</option>
											<option value="keuangan">Keuangan</option>
										</SelectInput>
									</Field>
									<Field label="Supervisor" required>
										<SelectInput defaultValue="" required>
											<option value="" disabled>Pilih supervisor</option>
											<option value="sri-wahyuni">Sri Wahyuni</option>
											<option value="andri-setiawan">Andri Setiawan</option>
											<option value="ratna-kusuma">Ratna Kusuma</option>
										</SelectInput>
									</Field>
								</div>

								<Field label="Maks. Percobaan Login" required>
									<Input defaultValue="4" />
								</Field>

								<div className="h-px bg-[#E2E8EF]" />

								<Field label="Kata Sandi Sementara" required>
									<Input icon={<LockIcon className="size-3.5" />} placeholder="8-12 karakter, huruf besar, simbol" className="pl-8 pr-9" />
									<p className="mt-1 text-[10px] text-[#8C97A6]">Harus mengandung huruf besar, huruf kecil, angka, dan simbol.</p>
								</Field>

								<Field label="Aktif" required>
									<SelectInput defaultValue="" required>
										<option value="" disabled>Pilih</option>
										<option value="aktif">Aktif</option>
										<option value="nonaktif">Nonaktif</option>
									</SelectInput>
								</Field>
							</form>
						</div>
					</aside>
				</div>
			</div>
		</main>
	);
}
