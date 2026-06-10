"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import { wsa } from "@/utils/actions";

export interface UploadedFile {
	altText: string;
	height?: number;
	src: string;
	width?: number;
}

export const uploadGenericRichtextImage = wsa(async (formData: FormData): Promise<UploadedFile> => {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();
	const altText = formData.get("altText");
	const image = formData.get("image");

	if(typeof altText != "string")
		throw new Error("No altText provided");
	if(!(image instanceof File))
		throw new Error("No image provided");
	if(!image.type.startsWith("image/"))
		throw new Error("Invalid image");

	const result = await payload.create({
		user: user,
		collection: "generic-richtext-uploads",
		file: {
			name: image.name,
			data: Buffer.from(await image.arrayBuffer()),
			size: image.size,
			mimetype: image.type
		},
		data: {
			altText: altText
		}
	});

	return {
		altText: result.altText!,
		height: result.height ?? undefined,
		src: `/api/generic-richtext-uploads/file/${encodeURIComponent(result.filename!)}`,
		width: result.width ?? undefined
	};
});
