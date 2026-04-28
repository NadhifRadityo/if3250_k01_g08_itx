import { ImageIcon } from "lucide-react";

import { InsertImageDialog, type UploadedImage } from "../../extensions/ImagesExtension";
import { ComponentPickerOption } from ".//ComponentPickerOption";

export function ImagePickerPlugin({ onUpload }: { onUpload: (formData: FormData) => Promise<UploadedImage> }) {
	return new ComponentPickerOption("Image", {
		icon: <ImageIcon className="size-4" />,
		keywords: ["image", "photo", "picture", "file"],
		onSelect: (_, editor, showModal) =>
			showModal("Insert Image", onClose => (
				<InsertImageDialog
					activeEditor={editor}
					onClose={onClose}
					onUpload={onUpload}
				/>
			))
	});
}
