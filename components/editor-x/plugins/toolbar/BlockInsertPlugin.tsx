import { PlusIcon } from "lucide-react";

import { Button } from "../../../radix/Button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger
} from "../../../radix/DropdownMenu";
import { useEditorModal } from "../../editor-hooks/UseModal";

export function BlockInsertPlugin({ children }: { children: React.ReactNode }) {
	const [modal] = useEditorModal();

	return (
		<>
			{modal}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="sm" className="gap-1 px-2">
						<PlusIcon className="size-4" />
						<span className="text-sm">Insert</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="whitespace-nowrap w-auto" align="end">{children}</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
}
