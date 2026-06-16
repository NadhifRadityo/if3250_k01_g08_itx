"use server";

import { sql } from "@payloadcms/db-postgres";
import { SQL } from "@payloadcms/db-postgres/drizzle";
import { Payload, getPayload, type Where, type CollectionSlug } from "payload";

import payloadConfig from "@payload-config";
import { wsa, uwsa } from "@/utils/actions";
import {
	buildFilterWhere,
	executeAggregate,
	resolveCollection,
	composeFilteredSql,
	buildFilterClauseSql,
	type PayloadAggregateJoin
} from "@/utils/payload";

import { resolveRelationUsers } from "./relation-navigation.actions";
import type { MenuFilterState } from "./layout.components";
import type { RelationUser } from "./relation-navigation.shared";

type StatRelationValues = Partial<Record<`users:${string}`, RelationUser>>;

async function computeFilteredCount(
	{ payload, collectionSlug, baseFilters, additionalWhere }:
	{ payload: Payload, collectionSlug: CollectionSlug, baseFilters?: MenuFilterState[] | null, additionalWhere?: Where }
) {
	const conditions: Where[] = [];
	if(baseFilters != null && baseFilters.length > 0)
		conditions.push(buildFilterWhere(baseFilters));
	if(additionalWhere != null)
		conditions.push(additionalWhere);
	const result = await (payload as any).count({
		overrideAccess: true,
		collection: collectionSlug,
		where: conditions.length > 0 ? { and: conditions } : {}
	});
	return result.totalDocs as number;
}

async function computeReviewableCurrentFiltered(
	{ payload, collectionSlug, filters }:
	{ payload: Payload, collectionSlug: CollectionSlug, filters?: MenuFilterState[] }
) {
	const [active, deleted] = await Promise.all([
		computeFilteredCount({ payload, collectionSlug, baseFilters: filters, additionalWhere: { deletedAt: { exists: false } } }),
		computeFilteredCount({ payload, collectionSlug, baseFilters: filters, additionalWhere: { deletedAt: { exists: true } } })
	]);
	return {
		value: active,
		active: active,
		deleted: deleted,
		subtext: deleted > 0 ? `${deleted} deleted` : null
	};
}

async function computeReviewStatus(
	{ payload, collectionSlug, filters }:
	{ payload: Payload, collectionSlug: CollectionSlug, filters?: MenuFilterState[] }
) {
	const [approved, pending, rejected] = await Promise.all([
		computeFilteredCount({ payload, collectionSlug, baseFilters: filters, additionalWhere: { and: [{ _status: { equals: "published" } }, { reviewApproved: { equals: true } }] } }),
		computeFilteredCount({ payload, collectionSlug, baseFilters: filters, additionalWhere: { and: [{ _status: { equals: "draft" } }, { reviewedAt: { exists: false } }] } }),
		computeFilteredCount({ payload, collectionSlug, baseFilters: filters, additionalWhere: { and: [{ reviewedAt: { exists: true } }, { reviewApproved: { equals: false } }] } })
	]);
	return { approved: approved, pending: pending, rejected: rejected };
}

async function computePendingReview(
	{ payload, collectionSlug, filters }:
	{ payload: Payload, collectionSlug: CollectionSlug, filters?: MenuFilterState[] }
) {
	const joins: PayloadAggregateJoin[] = [];
	const whereSql = buildFilterClauseSql({ payload, collectionSlug, filters, joinsOut: joins });
	const { tableName } = resolveCollection(payload, collectionSlug);
	const rows = await executeAggregate<{ count: number, oldest_age_ms: number | null, avg_age_ms: number | null }>({
		payload: payload,
		sqlQuery: composeFilteredSql({
			tableName: tableName,
			joins: joins,
			whereSql: whereSql,
			selectClause: sql`SELECT COUNT(*)::int AS count,
				CASE WHEN COUNT(*) > 0 THEN (EXTRACT(EPOCH FROM (NOW() - MIN(${sql.identifier(tableName)}.created_at))) * 1000)::float8 ELSE NULL END AS oldest_age_ms,
				CASE WHEN COUNT(*) > 0 THEN (EXTRACT(EPOCH FROM AVG(NOW() - ${sql.identifier(tableName)}.created_at)) * 1000)::float8 ELSE NULL END AS avg_age_ms`,
			additionalWhere: sql`AND ${sql.identifier(tableName)}._status = 'draft' AND ${sql.identifier(tableName)}.reviewed_at IS NULL`
		})
	});
	const row = rows[0];
	return {
		count: row?.count ?? 0,
		oldestAgeMs: row?.oldest_age_ms ?? null,
		avgAgeMs: row?.avg_age_ms ?? null
	};
}

async function computeChangeRequestType(
	{ payload, collectionSlug, filters, pendingOnly = false }:
	{ payload: Payload, collectionSlug: CollectionSlug, filters?: MenuFilterState[], pendingOnly?: boolean }
) {
	const joins: PayloadAggregateJoin[] = [];
	const whereSql = buildFilterClauseSql({ payload, collectionSlug, filters, joinsOut: joins });
	const { tableName } = resolveCollection(payload, collectionSlug);
	const rows = await executeAggregate<{ change_request_type: string, count: number }>({
		payload: payload,
		sqlQuery: composeFilteredSql({
			tableName: tableName,
			joins: joins,
			whereSql: whereSql,
			selectClause: sql`SELECT ${sql.identifier(tableName)}.change_request_type, COUNT(*)::int AS count`,
			additionalWhere: pendingOnly ? sql`AND ${sql.identifier(tableName)}._status = 'draft' AND ${sql.identifier(tableName)}.reviewed_at IS NULL` : sql``,
			groupByClause: sql`GROUP BY ${sql.identifier(tableName)}.change_request_type`
		})
	});
	const result = { create: 0, update: 0, delete: 0 };
	for(const row of rows) {
		if(row.change_request_type == "create") result.create = row.count;
		else if(row.change_request_type == "update") result.update = row.count;
		else if(row.change_request_type == "delete") result.delete = row.count;
	}
	return result;
}

// Generic per-day series on a timestamp column. Used for createdAt, updatedAt, deletedAt,
// reviewedAt, evaluatedAt, etc.
async function computeDailySeriesOnColumn(
	{ payload, collectionSlug, column, days, filters, additionalWhere = sql``, filterColumnKey }:
	{ payload: Payload, collectionSlug: CollectionSlug, column: string, days: number, filters?: MenuFilterState[], additionalWhere?: SQL, filterColumnKey?: string }
) {
	const joins: PayloadAggregateJoin[] = [];
	const whereSql = buildFilterClauseSql({ payload, collectionSlug, filters, joinsOut: joins });
	const { tableName } = resolveCollection(payload, collectionSlug);
	const colExpr = sql`${sql.identifier(tableName)}.${sql.identifier(column)}`;
	const rows = await executeAggregate<{ bucket: string, count: number }>({
		payload: payload,
		sqlQuery: composeFilteredSql({
			tableName: tableName,
			joins: joins,
			whereSql: whereSql,
			selectClause: sql`SELECT to_char(date_trunc('day', ${colExpr}), 'YYYY-MM-DD') AS bucket, COUNT(*)::int AS count`,
			additionalWhere: sql`AND ${colExpr} >= NOW() - (${sql.raw(`'${days} days'`)})::interval ${additionalWhere}`,
			groupByClause: sql`GROUP BY bucket`,
			orderByClause: sql`ORDER BY bucket`
		})
	});
	const buckets = new Map(rows.map(r => [r.bucket, r.count] as const));
	const points: StatSeriesPoint[] = [];
	const today = new Date();
	for(let i = days - 1; i >= 0; i--) {
		const d = new Date(today);
		d.setDate(today.getDate() - i);
		const key = d.toISOString().slice(0, 10);
		const start = `${key}T00:00:00.000Z`;
		const next = new Date(d); next.setDate(d.getDate() + 1);
		const end = `${next.toISOString().slice(0, 10)}T00:00:00.000Z`;
		points.push({ bucket: key, count: buckets.get(key) ?? 0, bucketStart: start, bucketEnd: end });
	}
	return { points: points, intervalLabel: "day", filterColumnKey: filterColumnKey };
}

async function computePendingBacklogAge(
	{ payload, collectionSlug, filters }:
	{ payload: Payload, collectionSlug: CollectionSlug, filters?: MenuFilterState[] }
) {
	const joins: PayloadAggregateJoin[] = [];
	const whereSql = buildFilterClauseSql({ payload, collectionSlug, filters, joinsOut: joins });
	const { tableName } = resolveCollection(payload, collectionSlug);
	const colCreated = sql`${sql.identifier(tableName)}.created_at`;
	const rows = await executeAggregate<{ bin_label: string, count: number }>({
		payload: payload,
		sqlQuery: composeFilteredSql({
			tableName: tableName,
			joins: joins,
			whereSql: whereSql,
			selectClause: sql`SELECT CASE
				WHEN NOW() - ${colCreated} < interval '1 day' THEN '<1d'
				WHEN NOW() - ${colCreated} < interval '3 days' THEN '1-3d'
				WHEN NOW() - ${colCreated} < interval '7 days' THEN '3-7d'
				WHEN NOW() - ${colCreated} < interval '14 days' THEN '7-14d'
				ELSE '>14d'
			END AS bin_label, COUNT(*)::int AS count`,
			additionalWhere: sql`AND ${sql.identifier(tableName)}._status = 'draft' AND ${sql.identifier(tableName)}.reviewed_at IS NULL`,
			groupByClause: sql`GROUP BY bin_label`
		})
	});
	const counts = new Map(rows.map(r => [r.bin_label, r.count] as const));
	const dayMs = 24 * 60 * 60 * 1000;
	const labels = [
		{ binStart: 0, binEnd: 1 * dayMs, label: "<1d" },
		{ binStart: 1 * dayMs, binEnd: 3 * dayMs, label: "1-3d" },
		{ binStart: 3 * dayMs, binEnd: 7 * dayMs, label: "3-7d" },
		{ binStart: 7 * dayMs, binEnd: 14 * dayMs, label: "7-14d" },
		{ binStart: 14 * dayMs, binEnd: Number.POSITIVE_INFINITY, label: ">14d" }
	];
	const bins: StatHistogramBin[] = labels.map(b => ({
		binStart: b.binStart,
		binEnd: b.binEnd,
		label: b.label,
		count: counts.get(b.label) ?? 0
	}));
	return { bins: bins, unit: "age" };
}

async function computeTopCreators(
	{ payload, collectionSlug, limit = 10, filters, pendingOnly = false }:
	{ payload: Payload, collectionSlug: CollectionSlug, limit?: number, filters?: MenuFilterState[], pendingOnly?: boolean }
) {
	const joins: PayloadAggregateJoin[] = [];
	const whereSql = buildFilterClauseSql({ payload, collectionSlug, filters, joinsOut: joins });
	const { tableName } = resolveCollection(payload, collectionSlug);
	const colCreatedBy = sql`${sql.identifier(tableName)}.created_by_id`;
	const rows = await executeAggregate<{ created_by_id: string | null, count: number }>({
		payload: payload,
		sqlQuery: composeFilteredSql({
			tableName: tableName,
			joins: joins,
			whereSql: whereSql,
			selectClause: sql`SELECT ${colCreatedBy} AS created_by_id, COUNT(*)::int AS count`,
			additionalWhere: sql`AND ${colCreatedBy} IS NOT NULL ${pendingOnly ? sql`AND ${sql.identifier(tableName)}._status = 'draft' AND ${sql.identifier(tableName)}.reviewed_at IS NULL` : sql``}`,
			groupByClause: sql`GROUP BY ${colCreatedBy}`,
			orderByClause: sql`ORDER BY count DESC`,
			limitClause: sql`LIMIT ${sql.raw(`${limit}`)}`
		})
	});
	return {
		items: rows.map(r => ({
			key: r.created_by_id ?? "",
			count: r.count,
			filterValue: r.created_by_id ?? null
		})),
		filterColumnKey: "createdBy"
	};
}

// === Reviewable public actions ==================================================================

export const getCommonReviewableViewerStats = wsa(async (
	{ collectionSlug, days = 30, filters, keys }:
	{ collectionSlug: CollectionSlug, days?: number, filters: MenuFilterState[], keys: string[] }
) => {
	const payload = await getPayload({ config: payloadConfig });
	const [currentFiltered, reviewStatus, pendingReview, changeRequestType, createdAt, updatedAt, deletedAt, reviewedAt, topCreators] = await Promise.all([
		keys.includes("currentFiltered") ? computeReviewableCurrentFiltered({ payload, collectionSlug, filters }) : undefined,
		keys.includes("reviewStatus") ? computeReviewStatus({ payload, collectionSlug, filters }) : undefined,
		keys.includes("pendingReview") ? computePendingReview({ payload, collectionSlug, filters }) : undefined,
		keys.includes("changeRequestType") ? computeChangeRequestType({ payload, collectionSlug, filters }) : undefined,
		keys.includes("createdAt") ? computeDailySeriesOnColumn({ payload, collectionSlug, column: "created_at", days, filters, filterColumnKey: "createdAt" }) : undefined,
		keys.includes("updatedAt") ? computeDailySeriesOnColumn({ payload, collectionSlug, column: "updated_at", days, filters, filterColumnKey: "updatedAt" }) : undefined,
		keys.includes("deletedAt") ? computeDailySeriesOnColumn({
			payload, collectionSlug, column: "deleted_at", days, filters, filterColumnKey: "deletedAt",
			additionalWhere: sql`AND ${sql.identifier(resolveCollection(payload, collectionSlug).tableName)}.deleted_at IS NOT NULL`
		}) : undefined,
		keys.includes("reviewedAt") ? computeDailySeriesOnColumn({
			payload, collectionSlug, column: "reviewed_at", days, filters, filterColumnKey: "reviewedAt",
			additionalWhere: sql`AND ${sql.identifier(resolveCollection(payload, collectionSlug).tableName)}.reviewed_at IS NOT NULL`
		}) : undefined,
		keys.includes("topCreators") ? computeTopCreators({ payload, collectionSlug, limit: 10, filters }) : undefined
	]);
	const relations: StatRelationValues = {};
	if(topCreators != null)
		Object.assign(relations, await uwsa(resolveRelationUsers)({ payload, ids: topCreators.items.map(i => i.key) }));
	return { currentFiltered, reviewStatus, pendingReview, changeRequestType, createdAt, updatedAt, deletedAt, reviewedAt, topCreators, relations };
});

export const getCommonReviewableApproverStats = wsa(async (
	{ collectionSlug, days = 30, filters, keys }:
	{ collectionSlug: CollectionSlug, days?: number, filters: MenuFilterState[], keys: string[] }
) => {
	const payload = await getPayload({ config: payloadConfig });
	const [pendingReview, pendingChangeRequestType, pendingBacklogAge, pendingCreatedAt, pendingTopCreators] = await Promise.all([
		keys.includes("pendingReview") ? computePendingReview({ payload, collectionSlug, filters }) : undefined,
		keys.includes("pendingChangeRequestType") ? computeChangeRequestType({ payload, collectionSlug, filters, pendingOnly: true }) : undefined,
		keys.includes("pendingBacklogAge") ? computePendingBacklogAge({ payload, collectionSlug, filters }) : undefined,
		keys.includes("pendingCreatedAt") ? computeDailySeriesOnColumn({
			payload, collectionSlug, column: "created_at", days, filters, filterColumnKey: "createdAt",
			additionalWhere: sql`AND ${sql.identifier(resolveCollection(payload, collectionSlug).tableName)}._status = 'draft' AND ${sql.identifier(resolveCollection(payload, collectionSlug).tableName)}.reviewed_at IS NULL`
		}) : undefined,
		keys.includes("pendingTopCreators") ? computeTopCreators({ payload, collectionSlug, limit: 10, filters, pendingOnly: true }) : undefined
	]);
	const relations: StatRelationValues = {};
	if(pendingTopCreators != null)
		Object.assign(relations, await uwsa(resolveRelationUsers)({ payload, ids: pendingTopCreators.items.map(i => i.key) }));
	return { pendingReview, pendingChangeRequestType, pendingBacklogAge, pendingCreatedAt, pendingTopCreators, relations };
});

// === Log helpers ================================================================================

async function computeHourlyDistributionToday(
	{ payload, collectionSlug, filters }:
	{ payload: Payload, collectionSlug: CollectionSlug, filters?: MenuFilterState[] }
) {
	const joins: PayloadAggregateJoin[] = [];
	const whereSql = buildFilterClauseSql({ payload, collectionSlug, filters, joinsOut: joins });
	const { tableName } = resolveCollection(payload, collectionSlug);
	const colCreated = sql`${sql.identifier(tableName)}.created_at`;
	const rows = await executeAggregate<{ hour: number, count: number }>({
		payload: payload,
		sqlQuery: composeFilteredSql({
			tableName: tableName,
			joins: joins,
			whereSql: whereSql,
			selectClause: sql`SELECT EXTRACT(HOUR FROM ${colCreated})::int AS hour, COUNT(*)::int AS count`,
			additionalWhere: sql`AND ${colCreated} >= date_trunc('day', NOW()) AND ${colCreated} < date_trunc('day', NOW()) + interval '1 day'`,
			groupByClause: sql`GROUP BY hour`,
			orderByClause: sql`ORDER BY hour`
		})
	});
	const counts = new Map(rows.map(r => [r.hour, r.count] as const));
	const points: StatSeriesPoint[] = [];
	const todayKey = new Date(); todayKey.setHours(0, 0, 0, 0);
	for(let h = 0; h < 24; h++) {
		const start = new Date(todayKey); start.setHours(h);
		const end = new Date(todayKey); end.setHours(h + 1);
		points.push({
			bucket: h.toString().padStart(2, "0"),
			count: counts.get(h) ?? 0,
			bucketStart: start.toISOString(),
			bucketEnd: end.toISOString()
		});
	}
	return { points: points, intervalLabel: "hour", filterColumnKey: "createdAt" };
}

async function computeHourDayHeatmap(
	{ payload, collectionSlug, filters, days = 30 }:
	{ payload: Payload, collectionSlug: CollectionSlug, filters?: MenuFilterState[], days?: number }
) {
	const joins: PayloadAggregateJoin[] = [];
	const whereSql = buildFilterClauseSql({ payload, collectionSlug, filters, joinsOut: joins });
	const { tableName } = resolveCollection(payload, collectionSlug);
	const colCreated = sql`${sql.identifier(tableName)}.created_at`;
	const rows = await executeAggregate<{ dow: number, hour: number, count: number }>({
		payload: payload,
		sqlQuery: composeFilteredSql({
			tableName: tableName,
			joins: joins,
			whereSql: whereSql,
			selectClause: sql`SELECT EXTRACT(DOW FROM ${colCreated})::int AS dow, EXTRACT(HOUR FROM ${colCreated})::int AS hour, COUNT(*)::int AS count`,
			additionalWhere: sql`AND ${colCreated} >= NOW() - (${sql.raw(`'${days} days'`)})::interval`,
			groupByClause: sql`GROUP BY dow, hour`
		})
	});
	const xLabels: string[] = [];
	for(let h = 0; h < 24; h++)
		xLabels.push(h.toString().padStart(2, "0"));
	const yLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	return {
		cells: rows.map(r => ({ x: r.hour, y: r.dow, count: r.count })),
		xLabels: xLabels,
		yLabels: yLabels
	};
}

// === Log public actions =========================================================================

export const getCommonLogMonitoringStats = wsa(async (
	{ collectionSlug, filters, keys }:
	{ collectionSlug: CollectionSlug, filters: MenuFilterState[], keys: string[] }
) => {
	const payload = await getPayload({ config: payloadConfig });
	const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
	const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
	const todayWhere = { and: [
		{ createdAt: { greater_than_equal: todayStart.toISOString() } },
		{ createdAt: { less_than_equal: todayEnd.toISOString() } }
	] };
	const [currentFiltered, hourlyDistribution] = await Promise.all([
		keys.includes("currentFiltered") ?
			computeFilteredCount({ payload, collectionSlug, baseFilters: filters, additionalWhere: todayWhere }).then(value => ({ value })) :
			undefined,
		keys.includes("hourlyDistribution") ? computeHourlyDistributionToday({ payload, collectionSlug, filters }) : undefined
	]);
	return { currentFiltered, hourlyDistribution };
});

export const getCommonLogReportingStats = wsa(async (
	{ collectionSlug, days = 30, filters, keys }:
	{ collectionSlug: CollectionSlug, days?: number, filters: MenuFilterState[], keys: string[] }
) => {
	const payload = await getPayload({ config: payloadConfig });
	const [currentFiltered, dailySeries, hourDayHeatmap] = await Promise.all([
		keys.includes("currentFiltered") ?
			computeFilteredCount({ payload, collectionSlug, baseFilters: filters }).then(value => ({ value })) :
			undefined,
		keys.includes("dailySeries") ? computeDailySeriesOnColumn({ payload, collectionSlug, column: "created_at", days, filters, filterColumnKey: "createdAt" }) : undefined,
		keys.includes("hourDayHeatmap") ? computeHourDayHeatmap({ payload, collectionSlug, filters, days }) : undefined
	]);
	return { currentFiltered, dailySeries, hourDayHeatmap };
});

// === Generic helpers exposed for per-collection extras ==========================================

// Buckets the rows for a collection by an arbitrary SQL `columnExpression` (a column name or a
// CASE expression on the main table) and returns the top buckets by count.
// `extraWhere` is a Payload `Where` object that's ANDed in addition to `filters` — use it for
// menu-specific predicates like `{ _status: { equals: "draft" }, reviewedAt: { exists: false } }`
// so callers don't have to construct raw SQL fragments.
export const computeStatsBucketsBySql = wsa(async (
	{ collectionSlug, columnExpression, filters, extraWhere, limit = 10, alwaysExcludeDeleted = true, filterColumnKey }:
	{ collectionSlug: CollectionSlug, columnExpression: string, filters?: MenuFilterState[], extraWhere?: Where, limit?: number, alwaysExcludeDeleted?: boolean, filterColumnKey?: string }
) => {
	const payload = await getPayload({ config: payloadConfig });
	const joins: PayloadAggregateJoin[] = [];
	const whereSql = buildFilterClauseSql({ payload, collectionSlug, filters, extraWhere, alwaysExcludeDeleted, joinsOut: joins });
	const { tableName } = resolveCollection(payload, collectionSlug);
	const rows = await executeAggregate<{ bucket: string | null, count: number }>({
		payload: payload,
		sqlQuery: composeFilteredSql({
			tableName: tableName,
			joins: joins,
			whereSql: whereSql,
			selectClause: sql`SELECT ${sql.raw(columnExpression)} AS bucket, COUNT(*)::int AS count`,
			additionalWhere: sql`AND ${sql.raw(columnExpression)} IS NOT NULL`,
			groupByClause: sql`GROUP BY bucket`,
			orderByClause: sql`ORDER BY count DESC`,
			limitClause: sql`LIMIT ${sql.raw(`${limit}`)}`
		})
	});
	return {
		items: rows.map(r => ({
			key: r.bucket ?? "",
			count: r.count,
			filterValue: r.bucket ?? null
		})),
		filterColumnKey: filterColumnKey
	};
});

export const computeStatsHistogramBySql = wsa(async (
	{ collectionSlug, columnExpression, filters, extraWhere, binCount = 10, alwaysExcludeDeleted = true, filterColumnKey }:
	{ collectionSlug: CollectionSlug, columnExpression: string, filters?: MenuFilterState[], extraWhere?: Where, binCount?: number, alwaysExcludeDeleted?: boolean, filterColumnKey?: string }
) => {
	const payload = await getPayload({ config: payloadConfig });
	const joins: PayloadAggregateJoin[] = [];
	const whereSql = buildFilterClauseSql({ payload, collectionSlug, filters, extraWhere, alwaysExcludeDeleted, joinsOut: joins });
	const { tableName } = resolveCollection(payload, collectionSlug);
	const minMaxRows = await executeAggregate<{ min_v: number | null, max_v: number | null, total_count: number }>({
		payload: payload,
		sqlQuery: composeFilteredSql({
			tableName: tableName,
			joins: joins,
			whereSql: whereSql,
			selectClause: sql`SELECT MIN(${sql.raw(columnExpression)})::float8 AS min_v, MAX(${sql.raw(columnExpression)})::float8 AS max_v, COUNT(*)::int AS total_count`,
			additionalWhere: sql`AND ${sql.raw(columnExpression)} IS NOT NULL`
		})
	});
	const minV = minMaxRows[0]?.min_v ?? null;
	const maxV = minMaxRows[0]?.max_v ?? null;
	if(minV == null || maxV == null || minV == maxV)
		return { bins: minV != null && maxV != null ? [{ binStart: minV, binEnd: maxV, count: minMaxRows[0]?.total_count ?? 0 }] : [], filterColumnKey: filterColumnKey };
	const rows = await executeAggregate<{ bin_idx: number, count: number }>({
		payload: payload,
		sqlQuery: composeFilteredSql({
			tableName: tableName,
			joins: joins,
			whereSql: whereSql,
			selectClause: sql`SELECT width_bucket(${sql.raw(columnExpression)}::numeric, ${sql.raw(`${minV}`)}::numeric, ${sql.raw(`${maxV}`)}::numeric, ${sql.raw(`${binCount}`)})::int AS bin_idx, COUNT(*)::int AS count`,
			additionalWhere: sql`AND ${sql.raw(columnExpression)} IS NOT NULL`,
			groupByClause: sql`GROUP BY bin_idx`,
			orderByClause: sql`ORDER BY bin_idx`
		})
	});
	const bins: StatHistogramBin[] = [];
	const span = (maxV - minV) / binCount;
	for(let i = 1; i <= binCount; i++) {
		const binStart = minV + (i - 1) * span;
		const binEnd = i == binCount ? maxV : minV + i * span;
		const found = rows.find(r => r.bin_idx == i);
		bins.push({ binStart: binStart, binEnd: binEnd, count: found?.count ?? 0 });
	}
	const overflow = rows.find(r => r.bin_idx == binCount + 1);
	if(overflow != null && bins.length > 0)
		bins[bins.length - 1].count += overflow.count;
	return { bins: bins, filterColumnKey: filterColumnKey };
});

// Counts rows matching `filters` plus `extraWhere`.
export const computeStatsCountBySql = wsa(async (
	{ collectionSlug, filters, extraWhere, alwaysExcludeDeleted = true }:
	{ collectionSlug: CollectionSlug, filters?: MenuFilterState[], extraWhere?: Where, alwaysExcludeDeleted?: boolean }
) => {
	const payload = await getPayload({ config: payloadConfig });
	const joins: PayloadAggregateJoin[] = [];
	const whereSql = buildFilterClauseSql({ payload, collectionSlug, filters, extraWhere, alwaysExcludeDeleted, joinsOut: joins });
	const { tableName } = resolveCollection(payload, collectionSlug);
	const rows = await executeAggregate<{ count: number }>({
		payload: payload,
		sqlQuery: composeFilteredSql({
			tableName: tableName,
			joins: joins,
			whereSql: whereSql,
			selectClause: sql`SELECT COUNT(*)::int AS count`
		})
	});
	return { count: rows[0]?.count ?? 0 };
});

// Computes the AVG of an arbitrary numeric column expression across rows matching `filters` /
// `extraWhere`. Returns `{ avg: null }` when there are no rows.
export const computeStatsAvgBySql = wsa(async (
	{ collectionSlug, columnExpression, filters, extraWhere, alwaysExcludeDeleted = true }:
	{ collectionSlug: CollectionSlug, columnExpression: string, filters?: MenuFilterState[], extraWhere?: Where, alwaysExcludeDeleted?: boolean }
) => {
	const payload = await getPayload({ config: payloadConfig });
	const joins: PayloadAggregateJoin[] = [];
	const whereSql = buildFilterClauseSql({ payload, collectionSlug, filters, extraWhere, alwaysExcludeDeleted, joinsOut: joins });
	const { tableName } = resolveCollection(payload, collectionSlug);
	const rows = await executeAggregate<{ avg_v: number | null }>({
		payload: payload,
		sqlQuery: composeFilteredSql({
			tableName: tableName,
			joins: joins,
			whereSql: whereSql,
			selectClause: sql`SELECT AVG(${sql.raw(columnExpression)})::float8 AS avg_v`
		})
	});
	return { avg: rows[0]?.avg_v ?? null };
});

// Counts rows in a relation table grouped by `groupByColumn` (defaulting to `parent_id`), then
// returns the AVG of those counts. Used for "average <child> per <parent>" metrics where the
// parent collection's filters can't be applied because the relation table doesn't expose them.
//
// `extraSqlCondition.path`            — when set, restricts to rows where the relation's `path`
//                                       column equals this literal (used by polymorphic
//                                       `_rels` tables).
// `requireGroupByColumnNotNull`       — adds `<groupByColumn> IS NOT NULL` (default true).
// `requireDeletedAtIsNull`            — adds `deleted_at IS NULL` for use against soft-deleted
//                                       main tables that have a `deleted_at` column (default
//                                       false; relation tables don't have it).
export const computeStatsRelationAvgChildCountBySql = wsa(async (
	{ relationTableName, groupByColumn = "parent_id", extraSqlCondition, requireGroupByColumnNotNull = true, requireDeletedAtIsNull = false }:
	{
		relationTableName: string;
		groupByColumn?: string;
		extraSqlCondition?: { path?: string };
		requireGroupByColumnNotNull?: boolean;
		requireDeletedAtIsNull?: boolean;
	}
) => {
	const payload = await getPayload({ config: payloadConfig });
	const conditions: SQL[] = [];
	if(requireGroupByColumnNotNull)
		conditions.push(sql`${sql.identifier(groupByColumn)} IS NOT NULL`);
	if(requireDeletedAtIsNull)
		conditions.push(sql`deleted_at IS NULL`);
	if(extraSqlCondition?.path != null)
		conditions.push(sql`path = ${extraSqlCondition.path}`);
	const whereClause = conditions.length > 0 ?
		sql`WHERE ${sql.join(conditions, sql` AND `)}` :
		sql``;
	const rows = await executeAggregate<{ avg_count: number | null }>({
		payload: payload,
		sqlQuery: sql`
			SELECT AVG(child_count)::float8 AS avg_count FROM (
				SELECT ${sql.identifier(groupByColumn)}, COUNT(*) AS child_count FROM ${sql.identifier(relationTableName)}
				${whereClause}
				GROUP BY ${sql.identifier(groupByColumn)}
			) AS t
		`
	});
	return { avg: rows[0]?.avg_count ?? null };
});

// Buckets the rows for a collection by a column expression rendered against a JOINed table and
// returns the top buckets by count. Use this when the bucket key lives on a related table
// (e.g. "top officers" for a collection that doesn't have an `officer_id` column directly).
//
// The `columnExpression` is rendered as-is — callers should reference the joined table via the
// `joined` alias (e.g. `"joined.officer_id"`, or a CASE expression that references
// `joined.due_date`).
export const computeStatsBucketsByJoinedColumnSql = wsa(async (
	{ collectionSlug, filters, joinedTableName, joinLocalColumn, joinForeignColumn, columnExpression, extraWhere, limit = 10, alwaysExcludeDeleted = true, filterColumnKey }:
	{
		collectionSlug: CollectionSlug;
		filters?: MenuFilterState[];
		joinedTableName: string;
		joinLocalColumn: string;
		joinForeignColumn: string;
		columnExpression: string;
		extraWhere?: Where;
		limit?: number;
		alwaysExcludeDeleted?: boolean;
		filterColumnKey?: string;
	}
) => {
	const payload = await getPayload({ config: payloadConfig });
	const joins: PayloadAggregateJoin[] = [];
	const whereSql = buildFilterClauseSql({ payload, collectionSlug, filters, extraWhere, alwaysExcludeDeleted, joinsOut: joins });
	const { tableName } = resolveCollection(payload, collectionSlug);
	const filterJoinsSql = joins.map(j => {
		const joinType = j.type ?? "leftJoin";
		const keyword = joinType == "innerJoin" ? sql.raw("INNER JOIN") :
			joinType == "rightJoin" ? sql.raw("RIGHT JOIN") :
				sql.raw("LEFT JOIN");
		return sql` ${keyword} ${j.table} ON ${j.condition}`;
	});
	const rows = await executeAggregate<{ bucket: string | null, count: number }>({
		payload: payload,
		sqlQuery: sql`
			SELECT ${sql.raw(columnExpression)} AS bucket, COUNT(*)::int AS count
			FROM ${sql.identifier(tableName)}
			${sql.join(filterJoinsSql, sql``)}
			JOIN ${sql.identifier(joinedTableName)} joined ON ${sql.raw(`joined.${joinForeignColumn}`)} = ${sql.identifier(tableName)}.${sql.identifier(joinLocalColumn)}
			WHERE (${whereSql}) AND ${sql.raw(columnExpression)} IS NOT NULL
			GROUP BY bucket
			ORDER BY count DESC
			LIMIT ${sql.raw(`${limit}`)}
		`
	});
	return {
		items: rows.map(r => ({
			key: r.bucket ?? "",
			count: r.count,
			filterValue: r.bucket ?? null
		})),
		filterColumnKey: filterColumnKey
	};
});

// Bucketed-by-day raw series for a date column over the last `days` days. Returns padded points
// (one entry per day, `count: 0` for missing days) so callers don't have to fill gaps.
export const computeStatsRawSeriesByDateBucket = wsa(async (
	{ collectionSlug, dateColumn, days, filters, extraWhere, alwaysExcludeDeleted = true }:
	{ collectionSlug: CollectionSlug, dateColumn: string, days: number, filters?: MenuFilterState[], extraWhere?: Where, alwaysExcludeDeleted?: boolean }
) => {
	const payload = await getPayload({ config: payloadConfig });
	const joins: PayloadAggregateJoin[] = [];
	const whereSql = buildFilterClauseSql({ payload, collectionSlug, filters, extraWhere, alwaysExcludeDeleted, joinsOut: joins });
	const { tableName } = resolveCollection(payload, collectionSlug);
	const colExpr = sql`${sql.identifier(tableName)}.${sql.identifier(dateColumn)}`;
	const rows = await executeAggregate<{ bucket: string, count: number }>({
		payload: payload,
		sqlQuery: composeFilteredSql({
			tableName: tableName,
			joins: joins,
			whereSql: whereSql,
			selectClause: sql`SELECT to_char(date_trunc('day', ${colExpr}), 'YYYY-MM-DD') AS bucket, COUNT(*)::int AS count`,
			additionalWhere: sql`AND ${colExpr} >= NOW() - (${sql.raw(`'${days} days'`)})::interval AND ${colExpr} IS NOT NULL`,
			groupByClause: sql`GROUP BY bucket`,
			orderByClause: sql`ORDER BY bucket`
		})
	});
	const buckets = new Map(rows.map(r => [r.bucket, r.count] as const));
	const points: StatSeriesPoint[] = [];
	const today = new Date();
	for(let i = days - 1; i >= 0; i--) {
		const d = new Date(today);
		d.setDate(today.getDate() - i);
		const key = d.toISOString().slice(0, 10);
		const start = `${key}T00:00:00.000Z`;
		const next = new Date(d); next.setDate(d.getDate() + 1);
		const end = `${next.toISOString().slice(0, 10)}T00:00:00.000Z`;
		points.push({ bucket: key, count: buckets.get(key) ?? 0, bucketStart: start, bucketEnd: end });
	}
	return { points: points };
});

// Returns count + oldest age + average age (in milliseconds since `dateColumn`) for rows
// matching `filters` and `extraWhere`. Used for "pending settlement age" / "pending review age"
// summaries.
export const computeStatsAgeStatsBySql = wsa(async (
	{ collectionSlug, dateColumn, filters, extraWhere, alwaysExcludeDeleted = true }:
	{ collectionSlug: CollectionSlug, dateColumn: string, filters?: MenuFilterState[], extraWhere?: Where, alwaysExcludeDeleted?: boolean }
) => {
	const payload = await getPayload({ config: payloadConfig });
	const joins: PayloadAggregateJoin[] = [];
	const whereSql = buildFilterClauseSql({ payload, collectionSlug, filters, extraWhere, alwaysExcludeDeleted, joinsOut: joins });
	const { tableName } = resolveCollection(payload, collectionSlug);
	const colExpr = sql`${sql.identifier(tableName)}.${sql.identifier(dateColumn)}`;
	const rows = await executeAggregate<{ count: number, oldest_age_ms: number | null, avg_age_ms: number | null }>({
		payload: payload,
		sqlQuery: composeFilteredSql({
			tableName: tableName,
			joins: joins,
			whereSql: whereSql,
			selectClause: sql`SELECT COUNT(*)::int AS count,
				CASE WHEN COUNT(*) > 0 THEN (EXTRACT(EPOCH FROM (NOW() - MIN(${colExpr}))) * 1000)::float8 ELSE NULL END AS oldest_age_ms,
				CASE WHEN COUNT(*) > 0 THEN (EXTRACT(EPOCH FROM AVG(NOW() - ${colExpr})) * 1000)::float8 ELSE NULL END AS avg_age_ms`
		})
	});
	const row = rows[0];
	return {
		count: row?.count ?? 0,
		oldestAgeMs: row?.oldest_age_ms ?? null,
		avgAgeMs: row?.avg_age_ms ?? null
	};
});
