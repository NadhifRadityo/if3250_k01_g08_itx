import * as React from "react";
import { EyeIcon, PencilIcon, EllipsisVerticalIcon } from "lucide-react";

import cn from "@/utils/cn";

type UserStatus = "active" | "pending" | "rejected";
type UserRole = "administrator" | "officer" | "checker" | "field-agent";

type UserDirectoryRowProps = {
	name: string;
	email: string;
	initials: string;
	empId: string;
	role: UserRole;
	status: UserStatus;
	date: string;
	time: string;
	selected?: boolean;
	hovered?: boolean;
	tone?: "dark" | "light";
	showMore?: boolean;
	onToggleSelected?: () => void;
};

const roleLabel: Record<UserRole, string> = {
	administrator: "Administrator",
	officer: "Officer",
	checker: "Checker",
	"field-agent": "Field Agent"
};

const statusLabel: Record<UserStatus, string> = {
	active: "Active",
	pending: "Pending",
	rejected: "Rejected"
};

const statusClassName: Record<UserStatus, string> = {
	active: "border-[#4ED1A3] bg-[#DDF8EE] text-[#067553]",
	pending: "border-[#E5C35A] bg-[#FFF3CE] text-[#A96B03]",
	rejected: "border-[#E8A8A8] bg-[#FFDCDC] text-[#A02020]"
};

function IconButton({ children, className }: { children: React.ReactNode, className?: string }) {
	return (
		<button
			type="button"
			className={cn("inline-flex size-6 items-center justify-center rounded text-[#6B7280] transition-colors hover:bg-black/6 hover:text-[#374151] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A8FC1]/35", className)}
		>
			{children}
		</button>
	);
}

export default function UserDirectoryRow({
	name,
	email,
	initials,
	empId,
	role,
	status,
	date,
	time,
	selected = false,
	hovered = false,
	tone = "dark",
	showMore = true,
	onToggleSelected
}: UserDirectoryRowProps) {
	const darkTone = tone == "dark";
	const rowClassName = darkTone ?
		(hovered ?
			"border-[#D4DBE3] bg-[#D5DCE4] text-[#1E293B]" :
			"border-b border-[#7E8A99] bg-transparent text-[#DDE3EA] transition-colors hover:bg-[#2A2F37]") :
		(hovered ?
			"border-b border-[#D2DBE5] bg-[#E2EAF3] text-[#1F2A39]" :
			"border-b border-[#D2DBE5] bg-[#FFFFFF] text-[#1F2A39] transition-colors hover:bg-[#DEE8F2]");
	const checkboxClassName = selected ?
		"border-[#3A8FC1] bg-[#3A8FC1]" :
		(darkTone ?
			(hovered ? "border-[#8D99A8] bg-transparent" : "border-[#E5E7EB] bg-[#F3F4F6]") :
			"border-[#9AA7B8] bg-transparent");
	const avatarClassName = darkTone ?
		(hovered ? "border-[#C6D7E5] bg-[#CAE7F6] text-[#3B86B8]" : "border-[#D6DCE5] bg-[#E5EBF2] text-[#3B86B8]") :
		"border-[#C8D9E8] bg-[#D8ECF8] text-[#3B86B8]";
	const nameClassName = darkTone ? (hovered ? "text-[#27384B]" : "text-[#DDE5F0]") : "text-[#1D2A3A]";
	const secondaryClassName = darkTone ? (hovered ? "text-[#7B8694]" : "text-[#7D8796]") : "text-[#748296]";
	const idClassName = darkTone ? (hovered ? "text-[#7B8694]" : "text-[#6E7A8A]") : "text-[#7B8798]";
	const roleClassName = darkTone ?
		(hovered ? "border-[#BFD2E2] bg-[#DCEFFC] text-[#3F8EBF]" : "border-[#C9D2DB] bg-[#E9EDF2] text-[#3F8EBF]") :
		"border-[#BFD2E2] bg-[#DCEFFC] text-[#3F8EBF]";
	const dateClassName = darkTone ? (hovered ? "text-[#344154]" : "text-[#D4DEE9]") : "text-[#334255]";
	const timeClassName = darkTone ? (hovered ? "text-[#7B8694]" : "text-[#7D8796]") : "text-[#748296]";
	const iconClassName = darkTone ?
		"inline-flex size-6 items-center justify-center rounded text-[#6B7280] transition-colors hover:bg-black/6 hover:text-[#374151] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A8FC1]/35" :
		"inline-flex size-6 items-center justify-center rounded text-[#6B7482] transition-all duration-150 hover:bg-[#C2CFDD] hover:text-[#243447] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A8FC1]/35";

	return (
		<div
			className={cn(
				"grid min-h-18 grid-cols-[30px_192px_108px_130px_112px_128px_80px] items-center gap-4 px-4 py-2",
				rowClassName
			)}
		>
			{onToggleSelected != null ? (
				<button
					type="button"
					onClick={onToggleSelected}
					aria-label={selected ? `Unselect ${name}` : `Select ${name}`}
					className={cn(
						"size-3.5 rounded-[3px] border transition-all duration-150 hover:scale-105 hover:border-[#3A8FC1] hover:bg-[#D8EBF8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A8FC1]/35",
						checkboxClassName
					)}
				/>
			) : (
				<div className={cn("size-3.5 rounded-[3px] border", checkboxClassName)} />
			)}

			<div className="flex items-center gap-2.5">
				<div className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold uppercase", avatarClassName)}>
					{initials}
				</div>
				<div className="min-w-0">
					<p className={cn("truncate text-[13px] font-semibold", nameClassName)}>{name}</p>
					<p className={cn("truncate text-[11px]", secondaryClassName)}>{email}</p>
				</div>
			</div>

			<p className={cn("text-[12px]", idClassName)}>{empId}</p>

			<div className={cn("inline-flex w-fit items-center rounded-[5px] border px-2 py-0.5 text-[10px] font-bold tracking-[0.09em] uppercase", roleClassName)}>
				{roleLabel[role]}
			</div>

			<div className={cn("inline-flex w-fit items-center rounded-full border px-3 py-0.5 text-[11px] font-bold tracking-[0.08em] uppercase", statusClassName[status])}>
				{statusLabel[status]}
			</div>

			<div className="leading-tight">
				<p className={cn("text-[12px]", dateClassName)}>{date}</p>
				<p className={cn("text-[11px]", timeClassName)}>{time}</p>
			</div>

			<div className="flex items-center gap-1">
				<IconButton className={iconClassName}><EyeIcon className="size-3.5" /></IconButton>
				<IconButton className={iconClassName}><PencilIcon className="size-3.5" /></IconButton>
				{showMore ? <IconButton className={iconClassName}><EllipsisVerticalIcon className="size-3.5" /></IconButton> : null}
			</div>
		</div>
	);
}
