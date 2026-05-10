"use server";

import { headers as nextHeaders } from "next/headers";
import { sql } from "@payloadcms/db-postgres";
import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import type { User } from "@/payload-types";
import {
	canAccessLoginActivityLogDashboard,
	formatInstantAsJakartaDateTime,
	parseAndValidateLoginActivityDateRange,
	sanitizeUsernameSearchForLike
} from "@/utils/activityLogController";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_EXPORT_AGG_ROWS = 5000;

function getExecuteRows(result: unknown): Record<string, unknown>[] {
	if(Array.isArray(result))
		return result as Record<string, unknown>[];
	if(result != null && typeof result == "object" && "rows" in result && Array.isArray((result as { rows: unknown }).rows))
		return (result as { rows: Record<string, unknown>[] }).rows;
	return [];
}

type RawAggRow = {
	total_count?: string | number | bigint;
	d: string | Date;
	user_id: string;
	first_login_at: string | Date | null;
	last_login_at: string | Date | null;
	last_logout_at: string | Date | null;
	ip: string | null;
};

export type LoginActivityAggregatedRow = {
	dateYmd: string;
	userId: string;
	firstLoginTime: string | null;
	lastLoginTime: string | null;
	lastLogoutTime: string | null;
	ip: string | null;
};

export type QueryLoginActivityAggregatesInput = {
	fromYmd: string;
	untilYmd: string;
	usernameSearch: string;
	userId: string;
	page: number;
	pageSize: number;
};

export type QueryLoginActivityAggregatesOutput = {
	rows: LoginActivityAggregatedRow[];
	total: number;
	page: number;
	pageSize: number;
};

async function resolveAuthedUserMenus(): Promise<{ payload: Awaited<ReturnType<typeof getPayload>>, user: User, menus: string[] } | null> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return null;
	const role = user.role;
	let menus: string[] = [];
	if(role != null && typeof role == "object" && "menus" in role && Array.isArray((role as { menus: unknown }).menus))
		menus = (role as { menus: string[] }).menus;
	else if(typeof role == "string") {
		const roleDoc = await payload.findByID({
			collection: "roles",
			id: role,
			user,
			overrideAccess: true,
			depth: 0,
			select: { menus: true }
		});
		menus = Array.isArray(roleDoc.menus) ? roleDoc.menus : [];
	}
	if(!canAccessLoginActivityLogDashboard(menus))
		return null;
	return { payload, user, menus };
}

function coerceIso(value: string | Date | null | undefined): string | null {
	if(value == null)
		return null;
	if(value instanceof Date)
		return Number.isNaN(value.getTime()) ? null : value.toISOString();
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function toYmdUtc(value: string | Date): string {
	const d = value instanceof Date ? value : new Date(value);
	return [
		String(d.getUTCFullYear()),
		String(d.getUTCMonth() + 1).padStart(2, "0"),
		String(d.getUTCDate()).padStart(2, "0")
	].join("-");
}

function mapAggRow(raw: RawAggRow): LoginActivityAggregatedRow {
	return {
		dateYmd: typeof raw.d == "string" ? raw.d.slice(0, 10) : toYmdUtc(raw.d),
		userId: String(raw.user_id),
		firstLoginTime: coerceIso(raw.first_login_at),
		lastLoginTime: coerceIso(raw.last_login_at),
		lastLogoutTime: coerceIso(raw.last_logout_at),
		ip: raw.ip ?? null
	};
}

function buildAggCte(fromIso: string, untilExclusiveIso: string, userId: string | null, likePattern: string | null) {
	const userFilter = userId != null && UUID_RE.test(userId) ? sql`AND ll.user_id = ${userId}::uuid` : sql``;
	const usernameFilter = likePattern != null && likePattern.length > 0 ? sql`
AND EXISTS (
	SELECT 1 FROM users u
	WHERE u.id = a.user_id
	AND (u.email ILIKE ${likePattern} OR u.name ILIKE ${likePattern})
)` : sql``;

	return sql`
WITH base AS (
	SELECT
		((ll.occurred_at AT TIME ZONE 'Asia/Jakarta')::date) AS d,
		ll.user_id,
		ll.occurred_at,
		ll.event::text AS event,
		ll.outcome::text AS outcome,
		ll.ip
	FROM login_logs ll
	WHERE ll.occurred_at >= ${fromIso}::timestamptz
		AND ll.occurred_at < ${untilExclusiveIso}::timestamptz
		${userFilter}
),
agg AS (
	SELECT
		d,
		user_id,
		MIN(occurred_at) FILTER (WHERE event = 'login' AND outcome = 'success') AS first_login_at,
		MAX(occurred_at) FILTER (WHERE event = 'login' AND outcome = 'success') AS last_login_at,
		MAX(occurred_at) FILTER (WHERE event = 'logout') AS last_logout_at,
		(array_agg(ip ORDER BY occurred_at DESC) FILTER (WHERE event = 'login' AND outcome = 'success'))[1] AS ip
	FROM base
	GROUP BY d, user_id
),
filtered AS (
	SELECT a.* FROM agg a
	WHERE 1 = 1
	${usernameFilter}
)
`;
}

export async function queryLoginActivityAggregatesAction(
	input: QueryLoginActivityAggregatesInput
): Promise<QueryLoginActivityAggregatesOutput | { error: string }> {
	const ctx = await resolveAuthedUserMenus();
	if(ctx == null)
		return { error: "Unauthorized" };

	let range;
	try {
		range = parseAndValidateLoginActivityDateRange(input.fromYmd, input.untilYmd);
	}
	catch (error) {
		return { error: error instanceof Error ? error.message : "Invalid date range" };
	}

	const fromIso = range.fromInclusive.toISOString();
	const untilExclusiveIso = range.untilExclusive.toISOString();

	const userId = input.userId.trim();
	const normalizedUserId = UUID_RE.test(userId) ? userId : null;

	const usernameTrim = input.usernameSearch.trim();
	const likePattern = sanitizeUsernameSearchForLike(usernameTrim);

	const pageSize = [10, 20, 50].includes(input.pageSize) ? input.pageSize : 10;
	const page = Math.max(1, Math.floor(input.page));
	const offset = (page - 1) * pageSize;

	const cte = buildAggCte(fromIso, untilExclusiveIso, normalizedUserId, likePattern);

	const countResult = await ctx.payload.db.execute({
		drizzle: ctx.payload.db.drizzle,
		sql: sql`${cte} SELECT COUNT(*)::bigint AS total_count FROM filtered`
	});

	const countRows = getExecuteRows(countResult);
	const totalRaw = countRows[0]?.total_count;
	const total = typeof totalRaw == "bigint" ? Number(totalRaw) : typeof totalRaw == "string" ? Number(totalRaw) : typeof totalRaw == "number" ? totalRaw : 0;

	const pageResult = await ctx.payload.db.execute({
		drizzle: ctx.payload.db.drizzle,
		sql: sql`${cte}
SELECT
	d,
	user_id,
	first_login_at,
	last_login_at,
	last_logout_at,
	ip
FROM filtered
ORDER BY d DESC, user_id ASC
LIMIT ${pageSize} OFFSET ${offset}
`
	});

	const pageRows = getExecuteRows(pageResult);
	const rows = pageRows.map(row => mapAggRow(row as unknown as RawAggRow));

	return {
		rows,
		total: Number.isFinite(total) ? total : 0,
		page,
		pageSize
	};
}

export async function searchUsersForLoginActivityFilterAction(keyword: string): Promise<Array<{ value: string, label: string }>> {
	const ctx = await resolveAuthedUserMenus();
	if(ctx == null)
		return [];

	const trimmed = keyword.trim();
	if(trimmed.length == 0)
		return [];

	const users = await ctx.payload.find({
		collection: "users",
		user: ctx.user,
		overrideAccess: false,
		depth: 0,
		limit: 20,
		sort: "email",
		where: {
			or: [
				{ email: { contains: trimmed } },
				{ name: { contains: trimmed } }
			]
		},
		select: {
			id: true,
			email: true,
			name: true
		}
	});

	return users.docs.map(doc => ({
		value: String(doc.id),
		label: `${doc.name} (${doc.email})`
	}));
}

export type DownloadLoginActivityCsvInput = {
	fromYmd: string;
	untilYmd: string;
	usernameSearch: string;
	userId: string;
	rowKeys: string[] | null;
};

export async function downloadLoginActivityCsvAction(
	input: DownloadLoginActivityCsvInput
): Promise<{ csv: string, filename: string } | { error: string }> {
	const ctx = await resolveAuthedUserMenus();
	if(ctx == null)
		return { error: "Unauthorized" };

	let range;
	try {
		range = parseAndValidateLoginActivityDateRange(input.fromYmd, input.untilYmd);
	}
	catch (error) {
		return { error: error instanceof Error ? error.message : "Invalid date range" };
	}

	const fromIso = range.fromInclusive.toISOString();
	const untilExclusiveIso = range.untilExclusive.toISOString();
	const userId = input.userId.trim();
	const normalizedUserId = UUID_RE.test(userId) ? userId : null;
	const usernameTrim = input.usernameSearch.trim();
	const likePattern = sanitizeUsernameSearchForLike(usernameTrim);

	const cte = buildAggCte(fromIso, untilExclusiveIso, normalizedUserId, likePattern);

	const keysRaw = input.rowKeys?.filter(key => key.trim().length > 0) ?? [];
	const tupleFilter = keysRaw.length > 0 ? buildTupleInFilter(keysRaw) : null;

	const limitSql = tupleFilter == null ? sql`LIMIT ${MAX_EXPORT_AGG_ROWS}` : sql``;

	const dataResult = await ctx.payload.db.execute({
		drizzle: ctx.payload.db.drizzle,
		sql: tupleFilter == null ? sql`${cte}
SELECT d, user_id, first_login_at, last_login_at, last_logout_at, ip
FROM filtered
ORDER BY d DESC, user_id ASC
${limitSql}
` : sql`${cte}
SELECT f.d, f.user_id, f.first_login_at, f.last_login_at, f.last_logout_at, f.ip
FROM filtered f
WHERE (${tupleFilter})
ORDER BY f.d DESC, f.user_id ASC
`
	});

	const dataRows = getExecuteRows(dataResult);
	const mapped = dataRows.map(row => mapAggRow(row as unknown as RawAggRow));

	const header = ["DATE", "FIRST LOGIN TIME", "LAST LOGIN TIME", "LAST LOGOUT TIME", "USER ID", "IP"];
	const lines = [header.join(",")];
	for(const row of mapped) {
		const cells = [
			row.dateYmd,
			row.firstLoginTime == null ? "" : formatInstantAsJakartaDateTime(row.firstLoginTime),
			row.lastLoginTime == null ? "" : formatInstantAsJakartaDateTime(row.lastLoginTime),
			row.lastLogoutTime == null ? "" : formatInstantAsJakartaDateTime(row.lastLogoutTime),
			row.userId,
			row.ip ?? ""
		];
		lines.push(cells.map(cell => `"${String(cell).replaceAll("\"", "\"\"")}"`).join(","));
	}

	const filename = `login-activity-${input.fromYmd}_to_${input.untilYmd}.csv`;
	return { csv: lines.join("\n"), filename };
}

function buildTupleInFilter(keys: string[]) {
	const parts: ReturnType<typeof sql>[] = [];
	for(const key of keys) {
		const pipe = key.indexOf("|");
		if(pipe <= 0 || pipe >= key.length - 1)
			continue;
		const day = key.slice(0, pipe);
		const uid = key.slice(pipe + 1);
		if(!/^\d{4}-\d{2}-\d{2}$/.test(day) || !UUID_RE.test(uid))
			continue;
		parts.push(sql`(f.d = ${day}::date AND f.user_id = ${uid}::uuid)`);
	}
	if(parts.length == 0)
		return sql`FALSE`;
	return sql.join(parts, sql` OR `);
}
