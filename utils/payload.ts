import { sql, PostgresAdapter } from "@payloadcms/db-postgres";
import { SQL } from "@payloadcms/db-postgres/drizzle";
import { buildQuery } from "@payloadcms/drizzle";
import { Payload, type CollectionSlug, Where } from "payload";

export function getRelationshipId(value: unknown): string | null {
	if(typeof value == "string")
		return value;
	if(value != null && typeof value == "object" && "id" in value && typeof value.id == "string")
		return value.id;
	return null;
}

export const buildFilterWhere = (filters: { columnKey: string, operator: string, combinator: "and" | "or", value: any }[]) => ({ or:
	filters.map(filter => ([{ [filter.columnKey]: { [filter.operator]: filter.value } }, filter.combinator ?? "and"] as const))
		.reduce((termGroups, [unit, combinator], i) => i == 0 || combinator == "and" ?
			[...termGroups.slice(0, -1), [...termGroups.at(-1)!, unit]] :
			[...termGroups, [unit]], [[]] as Where[][])
		.filter(termGroups => termGroups.length > 0)
		.map(termGroups => ({ and: termGroups }))
});

const negateOperatorMap: Record<string, string> = {
	equals: "not_equals",
	not_equals: "equals",
	in: "not_in",
	not_in: "in",
	greater_than: "less_than_equal",
	greater_than_equal: "less_than",
	less_than: "greater_than_equal",
	less_than_equal: "greater_than",
	like: "not_like",
	not_like: "like",
	contains: "not_contains",
	not_contains: "contains"
};
export function negateWhere(where: Where): Where {
	if("and" in where && where.and != null)
		return { or: where.and.map(w => negateWhere(w)) };
	if("or" in where && where.or != null)
		return { and: where.or.map(w => negateWhere(w)) };
	const result = {} as Where;
	for(const [field, condition] of Object.entries(where)) {
		const negatedCondition = result[field] = {} as Record<string, any>;
		for(const [operator, value] of Object.entries(condition)) {
			if(operator == "exists") {
				negatedCondition.exists = !(value as boolean);
				continue;
			}
			const negated = negateOperatorMap[operator];
			if(negated == null)
				throw new Error(`Unsupported operator: ${operator}`);
			negatedCondition[negated] = value;
		}
	}
	return result;
}

export function leixcalPreprendPlainText(state: any, value: string) {
	value = value.trim();
	state = structuredClone(state);
	if(value.length == 0)
		return state;
	const paragraphNode = {
		type: "paragraph",
		version: 1,
		direction: null,
		format: "",
		indent: 0,
		children: [
			{
				type: "text",
				version: 1,
				text: value,
				detail: 0,
				format: 0,
				mode: "normal",
				style: ""
			}
		]
	};
	state.root.children.unshift(paragraphNode);
	return state;
}
export function lexicalPlainText(value: string): any {
	value = value.trim();
	return {
		root: {
			type: "root",
			version: 1,
			format: "",
			indent: 0,
			direction: null,
			children: [
				{
					type: "paragraph",
					version: 1,
					format: "",
					indent: 0,
					direction: null,
					children: value.length > 0 ?
						[{
							type: "text",
							version: 1,
							text: value,
							format: 0,
							detail: 0,
							mode: "normal",
							style: ""
						}] :
						[]
				}
			]
		}
	};
}


// Generic Payload/Postgres helpers used across server actions ----------------------------------

export function payloadToSnakeCase(value: string) {
	return value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").replace(/[\W_]+/g, " ").trim().toLowerCase().replace(/\s+/g, "_");
}

// Mirrors Payload's internal getTransaction logic: when there was a recent write, read from
// the primary instead of the replica so we don't observe stale data.
export function getReadDrizzle(adapter: PostgresAdapter) {
	return adapter.primaryDrizzle != null && adapter.lastWriteTimestamp != null && (Date.now() - adapter.lastWriteTimestamp < adapter.readReplicasAfterWriteInterval) ? adapter.primaryDrizzle : adapter.drizzle;
}

export function resolveCollection(payload: Payload, collectionSlug: CollectionSlug) {
	const adapter = payload.db as PostgresAdapter;
	const collectionConfig = payload.config.collections.find(c => c.slug == collectionSlug);
	if(collectionConfig == null)
		throw new Error(`Collection ${collectionSlug} not found in the payload config.`);
	const tableName = adapter.tableNameMap.get(payloadToSnakeCase(collectionConfig.slug));
	if(tableName == null)
		throw new Error(`Could not resolve database table for collection ${collectionSlug}.`);
	return { adapter: adapter, collectionConfig: collectionConfig, tableName: tableName, table: adapter.tables[tableName] };
}


// SQL aggregate building blocks ----------------------------------------------------------------

export type PayloadAggregateJoin = { type?: string, table: any, condition: SQL };

// Builds an SQL fragment representing the combined filter / base where clause and appends any
// joins required by the filter to `joinsOut` so the caller can splice them into its FROM list.
// `extraWhere` is an optional Payload `Where` object that's AND-merged with `filters` —
// callers can use it to express predicates like `{ _status: { equals: "draft" } }` in JSON
// form rather than constructing raw SQL.
export function buildFilterClauseSql(
	{ payload, collectionSlug, filters, extraWhere, alwaysExcludeDeleted = false, joinsOut = [] }:
	{
		payload: Payload;
		collectionSlug: CollectionSlug;
		filters?: { columnKey: string, operator: string, combinator: "and" | "or", value: any }[] | null;
		extraWhere?: Where | null;
		alwaysExcludeDeleted?: boolean;
		joinsOut?: PayloadAggregateJoin[];
	}
) {
	const conditions: Where[] = [];
	if(alwaysExcludeDeleted)
		conditions.push({ deletedAt: { exists: false } });
	if(filters != null && filters.length > 0)
		conditions.push(buildFilterWhere(filters));
	if(extraWhere != null)
		conditions.push(extraWhere);
	if(conditions.length == 0)
		return sql`TRUE`;
	const { adapter, collectionConfig, tableName } = resolveCollection(payload, collectionSlug);
	const built = buildQuery({
		adapter: adapter,
		fields: collectionConfig.flattenedFields,
		tableName: tableName,
		where: { and: conditions }
	});
	for(const join of built.joins)
		joinsOut.push(join);
	return built.where ?? sql`TRUE`;
}

export async function executeAggregate<R extends Record<string, any>>(
	{ payload, sqlQuery }:
	{ payload: Payload, sqlQuery: SQL }
) {
	const adapter = payload.db as PostgresAdapter;
	const db = getReadDrizzle(adapter);
	const result = await payload.db.execute({ db: db, sql: sqlQuery }) as { rows: R[] } | R[];
	if(Array.isArray(result))
		return result;
	return result.rows;
}

// Composes "SELECT ... FROM <tableName> [JOINs] WHERE (<filter>) [additional] [GROUP BY] [...]"
// where joins/filter come from buildFilterClauseSql.
export function composeFilteredSql(
	{ tableName, joins, whereSql, selectClause, additionalWhere = sql``, groupByClause = sql``, orderByClause = sql``, limitClause = sql`` }:
	{
		tableName: string;
		joins: PayloadAggregateJoin[];
		whereSql: SQL;
		selectClause: SQL;
		additionalWhere?: SQL;
		groupByClause?: SQL;
		orderByClause?: SQL;
		limitClause?: SQL;
	}
) {
	const joinsSql = joins.map(j => {
		const joinType = j.type ?? "leftJoin";
		const keyword = joinType == "innerJoin" ? sql.raw("INNER JOIN")
			: joinType == "rightJoin" ? sql.raw("RIGHT JOIN")
				: sql.raw("LEFT JOIN");
		return sql` ${keyword} ${j.table} ON ${j.condition}`;
	});
	return sql`
		${selectClause}
		FROM ${sql.identifier(tableName)}
		${sql.join(joinsSql, sql``)}
		WHERE (${whereSql}) ${additionalWhere}
		${groupByClause}
		${orderByClause}
		${limitClause}
	`;
}
