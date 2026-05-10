import { addDays, differenceInCalendarDays } from "date-fns";

export const LOGIN_ACTIVITY_TIMEZONE = "Asia/Jakarta";

export const LOGIN_ACTIVITY_MAX_RANGE_DAYS = 31;

export type LoginActivityDateRange = {
	fromInclusive: Date;
	untilExclusive: Date;
};

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseAndValidateLoginActivityDateRange(fromYmd: string, untilYmd: string): LoginActivityDateRange {
	const fromStr = normalizeYmdInput(fromYmd);
	const untilStr = normalizeYmdInput(untilYmd);
	if(fromStr == null || untilStr == null)
		throw new Error("Invalid date format. Use YYYY-MM-DD.");

	const fromInclusive = jakartaMidnightToDate(fromStr);
	const untilInclusiveStart = jakartaMidnightToDate(untilStr);
	if(fromInclusive == null || untilInclusiveStart == null)
		throw new Error("Invalid calendar date.");

	if(untilInclusiveStart.getTime() < fromInclusive.getTime())
		throw new Error("End date must be on or after start date.");

	const fromNoon = new Date(`${fromStr}T12:00:00+07:00`);
	const untilNoon = new Date(`${untilStr}T12:00:00+07:00`);
	const span = differenceInCalendarDays(untilNoon, fromNoon) + 1;
	if(span > LOGIN_ACTIVITY_MAX_RANGE_DAYS)
		throw new Error(`Date range must be at most ${String(LOGIN_ACTIVITY_MAX_RANGE_DAYS)} days.`);

	const untilExclusive = addDays(untilInclusiveStart, 1);

	return {
		fromInclusive,
		untilExclusive
	};
}

function normalizeYmdInput(value: string): string | null {
	const trimmed = value.trim();
	if(!YMD_RE.test(trimmed))
		return null;
	return trimmed;
}

function jakartaMidnightToDate(ymd: string): Date | null {
	const instant = new Date(`${ymd}T00:00:00+07:00`);
	if(Number.isNaN(instant.getTime()))
		return null;
	const roundTrip = instant.toLocaleDateString("en-CA", { timeZone: LOGIN_ACTIVITY_TIMEZONE });
	return roundTrip == ymd ? instant : null;
}

export function sanitizeUsernameSearchForLike(trimmed: string): string | null {
	if(trimmed.length == 0)
		return null;
	const stripped = trimmed.replaceAll("%", "").replaceAll("_", "").replaceAll("\\", "");
	if(stripped.length == 0)
		return null;
	return `%${stripped}%`;
}

export function canAccessLoginActivityLogDashboard(menus: readonly string[]): boolean {
	return menus.includes("login-activity-log-viewer") || menus.includes("login-activity-log-auditor");
}

export function jakartaTodayYmd(now: Date = new Date()): string {
	const parts = readJakartaYmdParts(now);
	return `${parts.year}-${parts.month}-${parts.day}`;
}

export function defaultLoginActivityJakartaWeekRange(dayCount = 7): { fromYmd: string, untilYmd: string } {
	const untilYmd = jakartaTodayYmd();
	const shift = Math.max(0, dayCount - 1);
	const noonInstant = Date.parse(`${untilYmd}T12:00:00+07:00`);
	const fromMidday = noonInstant - shift * 24 * 60 * 60 * 1000;
	const fromYmd = formatIsoAsJakartaYmdDay(new Date(fromMidday));
	return { fromYmd, untilYmd };
}

export function formatInstantAsJakartaDateTime(isoUtc: Date | string | null | undefined): string {
	if(isoUtc == null)
		return "—";
	const d = isoUtc instanceof Date ? isoUtc : new Date(isoUtc);
	if(Number.isNaN(d.getTime()))
		return "—";
	return new Intl.DateTimeFormat("en-GB", {
		timeZone: LOGIN_ACTIVITY_TIMEZONE,
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false
	}).format(d);
}

export function formatIsoAsJakartaYmdDay(isoUtc: Date | string): string {
	const iso = isoUtc instanceof Date ? isoUtc : new Date(isoUtc);
	const parts = readJakartaYmdParts(iso);
	return `${parts.year}-${parts.month}-${parts.day}`;
}

function readJakartaYmdParts(d: Date): { year: string, month: string, day: string } {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: LOGIN_ACTIVITY_TIMEZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit"
	}).formatToParts(d);
	let year = "0000";
	let month = "01";
	let day = "01";
	for(const part of parts) {
		if(part.type == "year")
			year = part.value;
		if(part.type == "month")
			month = part.value.padStart(2, "0");
		if(part.type == "day")
			day = part.value.padStart(2, "0");
	}
	return { year, month, day };
}
