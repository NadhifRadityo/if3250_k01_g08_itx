import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { PlusIcon, SendIcon, ChevronLeftIcon, ChevronRightIcon, SlidersHorizontalIcon } from "lucide-react";

import cn from "@/utils/cn";

const actionButtonVariants = cva(
	"inline-flex items-center justify-center gap-2 rounded-[10px] border text-xs font-semibold tracking-[0.08em] uppercase transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A8FC1]/45 disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				filter: "h-8 border-[#3A8FC1] bg-white px-4 text-[#3A8FC1] shadow-[0_1px_2px_rgba(0,0,0,0.12)] hover:bg-[#EAF5FB] hover:shadow-[0_0_0_1px_#3A8FC1]",
				add: "h-9 border-[#3A8FC1] bg-[#3A8FC1] px-5 text-white hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(58,143,193,0.35)]",
				previous: "h-8 border-[#3A8FC1] bg-[#9AA4AE] px-3 text-[#3A8FC1] hover:bg-[#8C969F]",
				next: "h-8 border-[#3A8FC1] bg-white px-3 text-[#3A8FC1] hover:bg-[#EAF5FB]",
				cancel: "h-8 border-[#3A8FC1] bg-white px-4 text-[#3A8FC1] hover:bg-[#EAF5FB]",
				submit: "h-9 border-[#3A8FC1] bg-[#3A8FC1] px-6 text-white hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(58,143,193,0.35)]"
			}
		},
		defaultVariants: {
			variant: "filter"
		}
	}
);

type ActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
	VariantProps<typeof actionButtonVariants>;

const iconByVariant: Record<NonNullable<ActionButtonProps["variant"]>, React.ReactNode> = {
	filter: <SlidersHorizontalIcon className="size-3.5" aria-hidden="true" />,
	add: <PlusIcon className="size-3.5" aria-hidden="true" />,
	previous: <ChevronLeftIcon className="size-3.5" aria-hidden="true" />,
	next: <ChevronRightIcon className="size-3.5" aria-hidden="true" />,
	cancel: null,
	submit: <SendIcon className="size-3.5" aria-hidden="true" />
};

const labelByVariant: Record<NonNullable<ActionButtonProps["variant"]>, string> = {
	filter: "Filter",
	add: "Tambah Pengguna",
	previous: "Sebelumnya",
	next: "Berikutnya",
	cancel: "Batal",
	submit: "Kirim Untuk Persetujuan"
};

export default function ActionButton({
	className,
	variant = "filter",
	children,
	type = "button",
	...props
}: ActionButtonProps) {
	const icon = iconByVariant[variant];
	const content = children ?? labelByVariant[variant];

	return (
		<button
			type={type}
			className={cn(actionButtonVariants({ variant }), className)}
			{...props}
		>
			{icon}
			<span>{content}</span>
		</button>
	);
}
