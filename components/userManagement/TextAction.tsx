import * as React from "react";

import cn from "@/utils/cn";

type TextActionProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function TextAction({
	className,
	children = "Pengaturan",
	type = "button",
	...props
}: TextActionProps) {
	return (
		<button
			type={type}
			className={cn(
				"inline-flex items-center border-b border-transparent text-[31px] font-semibold tracking-tight text-[#3A8FC1] transition-all duration-200 hover:border-[#3A8FC1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A8FC1]/35",
				className
			)}
			{...props}
		>
			{children}
		</button>
	);
}
