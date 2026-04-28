import { ImageIcon } from "lucide-react";

import { DropdownMenuItem } from "../../../../radix/DropdownMenu";
import { useToolbarContext } from "../../../context/ToolbarContext";
import { InsertImageDialog, type UploadedImage } from "../../../extensions/ImagesExtension";

export function InsertImage({ onUpload }: { onUpload: (formData: FormData) => Promise<UploadedImage> }) {
	const { activeEditor, showModal } = useToolbarContext();

	return (
		<DropdownMenuItem
			onClick={() => {
				showModal("Insert Image", onClose => (
					<InsertImageDialog
						activeEditor={activeEditor}
						onClose={onClose}
						onUpload={onUpload}
					/>
				));
			}}
		>
			<div className="flex items-center gap-1">
				<ImageIcon className="size-4" />
				<span>Image</span>
			</div>
		</DropdownMenuItem>
	);
}
