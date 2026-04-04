import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import { getDashboardShellContext } from "@/app/(app)/(dashboard)/layout.actions";

import { handleCreditApplicationImportFilePut } from "./handleCreditApplicationImportFilePut";

type RouteParams = { params: Promise<{ importId: string }> };

export async function PUT(request: Request, context: RouteParams): Promise<Response> {
	const { importId } = await context.params;
	return handleCreditApplicationImportFilePut(request, importId, {
		getShell: getDashboardShellContext,
		getPayload: () => getPayload({ config: payloadConfig })
	});
}
