import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import cn from "@/utils/cn";

const roleBadgeVariants = cva(
	"inline-flex h-10 min-w-31 items-center justify-center rounded-[10px] border px-4 text-base font-semibold tracking-[0.01em] transition-all duration-200",
	{
		variants: {
			variant: {
				default: "border-transparent bg-[#3A8FC1] text-white shadow-[0_10px_24px_rgba(58,143,193,0.3)]",
				muted: "border-[#C9D2DB] bg-white text-[#687382]"
			}
		},
		defaultVariants: {
			variant: "default"
		}
	}
);

type RoleBadgeProps = React.HTMLAttributes<HTMLDivElement> &
	VariantProps<typeof roleBadgeVariants>;

export default function RoleBadge({
	className,
	variant = "default",
	children = "Pembuat (Maker)",
	...props
}: RoleBadgeProps) {
	return (
		<div className={cn(roleBadgeVariants({ variant }), className)} {...props}>
			{children}
		</div>
	);
}
