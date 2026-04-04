import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import { getDashboardShellContext } from "@/app/(app)/(dashboard)/layout.actions";

import { handleCreditApplicationImportPost } from "./handleCreditApplicationImportPost";

export async function POST(request: Request): Promise<Response> {
	return handleCreditApplicationImportPost(request, {
		getShell: getDashboardShellContext,
		getPayload: () => getPayload({ config: payloadConfig })
	});
}
