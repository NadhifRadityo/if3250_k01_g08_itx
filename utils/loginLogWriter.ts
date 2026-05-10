import type { Payload } from "payload";

export type LoginLogEvent = "login" | "logout";
export type LoginLogOutcome = "success" | "failure";

export async function writeLoginLogEntry(
	payload: Payload,
	input: {
		userId: string | null;
		ip: string;
		event: LoginLogEvent;
		outcome?: LoginLogOutcome | null;
		occurredAt?: Date;
	}
): Promise<void> {
	const occurredAt = input.occurredAt ?? new Date();
	const data: Record<string, unknown> = {
		occurredAt: occurredAt.toISOString(),
		ip: input.ip,
		event: input.event
	};
	if(input.userId != null && input.userId.length > 0)
		data.user = input.userId;
	if(input.event == "login" && input.outcome != null)
		data.outcome = input.outcome;

	await payload.create({
		collection: "login-logs",
		data: data as never,
		overrideAccess: true,
		depth: 0
	});
}
