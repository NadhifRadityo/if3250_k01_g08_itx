import * as React from "react";
import { EyeIcon } from "lucide-react";

import cn from "@/utils/cn";

type VisibilityButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	active?: boolean;
};

export default function VisibilityButton({
	className,
	active = false,
	type = "button",
	...props
}: VisibilityButtonProps) {
	return (
		<button
			type={type}
			className={cn(
				"inline-flex size-11 items-center justify-center rounded-[8px] border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A8FC1]/45",
				active ?
					"border-[#D5EAF5] bg-[#D5EAF5] text-[#3A8FC1] hover:bg-[#C3E0F0]" :
					"border-transparent bg-transparent text-[#687382] hover:border-[#D5EAF5] hover:bg-[#D5EAF5] hover:text-[#3A8FC1]",
				className
			)}
			aria-label={active ? "Hide user" : "Show user"}
			{...props}
		>
			<EyeIcon className="size-4" aria-hidden="true" />
		</button>
	);
}
