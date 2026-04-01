"use client";

import { useState } from "react";
import { ChevronDownIcon, InfoIcon, LockIcon, MailIcon, PhoneIcon, SearchIcon, XIcon } from "lucide-react";

import ActionButton from "@/components/userManagement/ActionButton";
import RoleBadge from "@/components/userManagement/RoleBadge";
import TextAction from "@/components/userManagement/TextAction";
import UserDirectoryRow from "@/components/userManagement/UserDirectoryRow";
import cn from "@/utils/cn";

const userRows = [
	{
		name: "Ahmad Syuhada",
		email: "ahmad@company.com",
		initials: "AS",
		empId: "EMP-202301",
		role: "administrator",
		status: "active",
		date: "11 Mar 2026",
		time: "14:00 WIB",
		selected: false
	},
	{
		name: "Budi Wibowo",
		email: "budi.w@company.com",
		initials: "BW",
		empId: "EMP-202305",
		role: "officer",
		status: "pending",
		date: "11 Mar 2026",
		time: "09:30 WIB",
		selected: true
	},
	{
		name: "Cindy Dewi",
		email: "cindy@company.com",
		initials: "CD",
		empId: "EMP-202298",
		role: "checker",
		status: "active",
		date: "10 Mar 2026",
		time: "16:45 WIB",
		selected: false
	},
	{
		name: "Dian Rahayu",
		email: "dian.r@company.com",
		initials: "DR",
		empId: "EMP-202311",
		role: "field-agent",
		status: "rejected",
		date: "09 Mar 2026",
		time: "11:20 WIB",
		selected: false
	}
] as const;

function Field({
	label,
	required = false,
	children
}: {
	label: string;
	required?: boolean;
	children: React.ReactNode;
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

function Input({ icon, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode; }) {
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

function SelectInput({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
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
	const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
		userRows.filter(user => user.selected).map(user => user.empId)
	);

	const toggleUserSelection = (empId: string) => {
		setSelectedUserIds(previous => (
			previous.includes(empId)
				? previous.filter(id => id != empId)
				: [...previous, empId]
		));
	};

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
									placeholder="Cari username atau ID karyawan..."
									className="h-8 w-[290px] rounded-md border border-[#C7D3DF] bg-[#EEF3F8] pl-9 pr-3 text-xs text-[#213346] placeholder:text-[#9AA7B6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A8FC1]/35"
								/>
							</div>
							<ActionButton variant="filter" className="h-8 bg-[#F8FCFF] px-3 text-[10px]" />
						</div>

						<ActionButton variant="add" className="h-8 px-4 text-[10px] shadow-none hover:shadow-none" />
					</div>

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

							{userRows.map(row => (
								<UserDirectoryRow
									key={row.empId}
									{...row}
									selected={selectedUserIds.includes(row.empId)}
									onToggleSelected={() => toggleUserSelection(row.empId)}
									tone="light"
									showMore
								/>
							))}

							<div className="flex items-center justify-between px-4 py-2.5 text-[10px] text-[#7F8D9E]">
								<p>Menampilkan 1-4 dari 50 pengguna</p>
								<div className="flex gap-2">
									<ActionButton variant="previous" className="h-7 border-[#3A8FC1] bg-[#F8FCFF] px-3 text-[9px]">Sebelumnya</ActionButton>
									<ActionButton variant="next" className="h-7 border-[#3A8FC1] bg-[#F8FCFF] px-3 text-[9px]">Berikutnya</ActionButton>
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
