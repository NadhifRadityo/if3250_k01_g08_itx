import crypto from "crypto";
import zlib from "zlib";
import { Payload, getPayload, createLocalReq, TypeWithVersion } from "payload";

import payloadConfig from "@/payload.config";

type CreateLocalReqOptions = Parameters<typeof createLocalReq>[0];
export type PaginationScroll = ({ next: number, previous?: never } | { next?: never, previous: number }) & { includeCurrent?: boolean };

export function payloadSign(
	{ payload, data }:
	{ payload: Payload, data: Buffer }
) {
	return crypto.createHmac("sha256", payload.secret).update(data).digest();
}
export function payloadVerify(
	{ payload, data, signature }:
	{ payload: Payload, data: Buffer, signature: Buffer }
) {
	return crypto.timingSafeEqual(payloadSign({ payload, data }), signature);
}
export function payloadEncrypt(
	{ payload, data }:
	{ payload: Payload, data: Buffer }
) {
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv("aes-256-gcm", payload.secret, iv);
	return Buffer.concat([iv, cipher.update(data), cipher.final(), cipher.getAuthTag()]);
}
export function payloadDecrypt(
	{ payload, hash }:
	{ payload: Payload, hash: Buffer }
) {
	const decipher = crypto.createDecipheriv("aes-256-gcm", payload.secret, hash.subarray(0, 12));
	decipher.setAuthTag(hash.subarray(-16));
	return Buffer.concat([decipher.update(hash.subarray(12, -16)), decipher.final()]);
}

export const stagedUserPaginationSortMap = Object.freeze({
	createdAt: { path: "createdAt", get: s => s.createdAt },
	updatedAt: { path: "updatedAt", get: s => s.updatedAt },
	deletedAt: { path: "deletedAt", get: s => s.deletedAt },
	email: { path: "email", get: s => s.email },
	name: { path: "name", get: s => s.name },
	reviewedAt: { path: "reviewedAt", get: s => s.reviewedAt }
} as Record<string, { path: string, get: (s: any) => any }>);
export function stagedUserPaginationDecodeCursor(
	{ payload, cursor }:
	{ payload: Payload, cursor: string }
) {
	let decoded: ["staged-user-pagination-cursor", string, string[], string[], ...any[]];
	try {
		const decrypted = payloadDecrypt({ payload, hash: Buffer.from(cursor, "base64") });
		decoded = JSON.parse(zlib.gunzipSync(decrypted).toString("utf-8"));
	} catch(_) {
		return null;
	}
	if(!Array.isArray(decoded) || decoded[0] != "staged-user-pagination-cursor")
		return null;
	return {
		keyword: decoded[1], sort: decoded[2],
		data: Object.fromEntries(decoded[2].map((s, i) => [s.slice(1), decoded[3 + i]]))
	};
}
export function stagedUserPaginationEncodeCursor(
	{ payload, collection, keyword, sort }:
	{ payload: Payload, collection: any, keyword: string, sort: string[] }
) {
	const cursor = ["staged-user-pagination-cursor", keyword, sort, ...sort.map(s => stagedUserPaginationSortMap[s.slice(1)].get(collection))];
	return payloadEncrypt({ payload, data: zlib.gzipSync(Buffer.from(JSON.stringify(cursor), "utf-8")) }).toString("base64");
}
export function stagedUserPaginationNormalizeSort({ sort }: { sort: string[] }) {
	if(sort.every(s => s.slice(1) != "createdAt"))
		sort = [...sort, "-createdAt"];
	sort = sort.map(s => !s.startsWith("+") && !s.startsWith("-") ? `+${s}` : s).filter(s => s.slice(1) in stagedUserPaginationSortMap);
	sort = [...new Set(sort.map(s1 => sort.find(s2 => s2.slice(1) == s1.slice(1))!))];
	return sort;
}
export function stagedUserPaginationGenerateCursorQuery(
	{ fieldPrefix = "", decodedCursor, scroll }:
	{ fieldPrefix?: string, decodedCursor: NonNullable<ReturnType<typeof stagedUserPaginationDecodeCursor>>, scroll: PaginationScroll }
) {
	const queryWhere = { or: [
		...(scroll.includeCurrent == true ? [{ and: decodedCursor.sort.map(s =>
			({ [fieldPrefix + stagedUserPaginationSortMap[s.slice(1)].path]:
				{ equals: decodedCursor.data[s.slice(1)] } })) }] : []),
		...decodedCursor.sort.map((s, i) => ({ and: [
			...decodedCursor.sort.slice(0, i).map(s2 => ({
				[fieldPrefix + stagedUserPaginationSortMap[s2.slice(1)].path]:
					{ equals: decodedCursor.data[s2.slice(1)] }
			})),
			{ [fieldPrefix + stagedUserPaginationSortMap[s.slice(1)].path]: {
				["next" in scroll ?
					s.charAt(0) == "-" ? "less_than" : "greater_than" :
					s.charAt(0) == "-" ? "greater_than" : "less_than"
				]: decodedCursor.data[s.slice(1)]
			} }
		] }))
	] };
	const querySort = decodedCursor.sort.map(s => `${s.charAt(0) == "-" ? "-" : ""}${fieldPrefix}${stagedUserPaginationSortMap[s.slice(1)].path}`);
	const queryLimit = (scroll.next != null ? scroll.next : scroll.previous) + (scroll.includeCurrent == true ? 1 : 0);
	return { where: queryWhere, sort: querySort, limit: queryLimit };
}

export async function searchStagedUsers(
	{ payload, keyword, sort, where, trash, excludeIds, itemLimit, cacheTag, ...createLocalReqOptions }:
	{ payload?: Payload, keyword: string, sort: string[], where?: Where, trash?: boolean, excludeIds?: string[], itemLimit: number, cacheTag?: (...tags: string[]) => void } & CreateLocalReqOptions
) {
	payload ??= await getPayload({ config: payloadConfig });
	const req = await createLocalReq(createLocalReqOptions, payload);
	cacheTag?.("payload", "payload.staged-users[*]");
	sort = stagedUserPaginationNormalizeSort({ sort });
	const searchFindResult = await payload.find({
		req: req,
		overrideAccess: false,
		collection: "staged-users",
		trash: true,
		where: { and: [
			...(trash != true ? [{ deletedAt: { exists: false } }] : []),
			...(where != null ? [where] : []),
			...(keyword.length > 0 ? [{ or: [
				{ email: { contains: keyword } },
				{ name: { contains: keyword } },
				{ employeeId: { contains: keyword } }
			] }] : []),
			...((excludeIds?.length ?? 0) > 0 ? [{ id: { not_in: excludeIds } }] : [])
		] },
		select: {},
		sort: sort.map(s => `${s.charAt(0) == "-" ? "-" : ""}${stagedUserPaginationSortMap[s.slice(1)].path}`),
		limit: itemLimit
	});
	type SearchData = PayloadNeed<PayloadType<"collection:staged-users">>;
	const search = searchFindResult.docs as SearchData[];
	cacheTag?.(...[...new Set(search.map(s => s.id))].map(id => `payload.staged-users[${id}]`));
	const stagedUserFindVersionsResult = await payload.findVersions({
		req: req,
		overrideAccess: false,
		collection: "staged-users",
		pagination: false,
		draft: true,
		trash: true,
		where: { parent: { in: [...new Set(search.map(s => s.id))] } },
		select: {
			createdAt: true,
			updatedAt: true,
			parent: true,
			version: {
				createdAt: true,
				createdBy: true,
				updatedAt: true,
				updatedBy: true,
				deletedAt: true,
				deletedBy: true,
				email: true,
				role: true,
				name: true,
				employeeId: true,
				supervisor: true,
				reviewedAt: true,
				reviewedBy: true,
				reviewApproved: true,
				reviewComment: true
			}
		},
		sort: "-updatedAt",
		populate: {
			"users": {
				createdAt: true,
				createdBy: true,
				updatedAt: true,
				updatedBy: true,
				deletedAt: true,
				deletedBy: true,
				email: true,
				role: true,
				name: true,
				employeeId: true,
				supervisor: true
			}
		}
	});
	type StagedUserVersionData = PayloadNeed<TypeWithVersion<PayloadType<"collection:staged-users">>, "version.supervisor">;
	const stagedUserVersions = stagedUserFindVersionsResult.docs.filter((v, i, a) => i == a.findIndex(v2 => v2.parent == v.parent)) as StagedUserVersionData[];
	cacheTag?.(...[...new Set(stagedUserVersions.map(v => v.version.supervisor?.id))].filter(id => id != null).map(id => `payload.users[${id}]`));
	console.log(stagedUserFindVersionsResult.docs)
	return {
		total: searchFindResult.totalDocs,
		resultRemaining: searchFindResult.totalDocs - search.length,
		result: stagedUserVersions.map(v => ({
			...v.version,
			id: v.parent,
			paginationCursor: stagedUserPaginationEncodeCursor({ payload, collection: v.version, keyword, sort })
		}))
	};
}
export async function scrollStagedUsers(
	{ payload, cursor, scroll, where, trash, excludeIds, itemLimit, withTotalCount, cacheTag, ...createLocalReqOptions }:
	{ payload?: Payload, cursor: string, scroll: PaginationScroll, where?: Where, trash?: boolean, excludeIds?: string[], itemLimit: number, withTotalCount?: boolean, cacheTag?: (...tags: string[]) => void } & CreateLocalReqOptions
) {
	payload ??= await getPayload({ config: payloadConfig });
	const req = await createLocalReq(createLocalReqOptions, payload);
	cacheTag?.("payload", "payload.staged-users[*]");
	const decodedCursor = stagedUserPaginationDecodeCursor({ payload, cursor });
	if(decodedCursor == null) return { total: 0, resultRemaining: 0, result: [] };
	const paginationQuery = stagedUserPaginationGenerateCursorQuery({ decodedCursor, scroll });
	const searchFindResult = await payload.find({
		req: req,
		overrideAccess: false,
		collection: "staged-users",
		trash: true,
		where: { and: [
			...(trash != true ? [{ deletedAt: { exists: false } }] : []),
			...(where != null ? [where] : []),
			...(decodedCursor.keyword.length > 0 ? [{ or: [
				{ email: { contains: decodedCursor.keyword } },
				{ name: { contains: decodedCursor.keyword } },
				{ employeeId: { contains: decodedCursor.keyword } }
			] }] : []),
			...((excludeIds?.length ?? 0) > 0 ? [{ id: { not_in: excludeIds } }] : []),
			...(paginationQuery.where != null ? [paginationQuery.where] : [])
		] },
		select: {},
		sort: paginationQuery.sort,
		limit: Math.min(itemLimit, paginationQuery.limit)
	});
	const searchCountResult = withTotalCount == true ? await payload.count({
		req: req,
		overrideAccess: false,
		collection: "staged-users",
		trash: true,
		where: { and: [
			...(trash != true ? [{ deletedAt: { exists: false } }] : []),
			...(where != null ? [where] : []),
			...(decodedCursor.keyword.length > 0 ? [{ or: [
				{ email: { contains: decodedCursor.keyword } },
				{ name: { contains: decodedCursor.keyword } },
				{ employeeId: { contains: decodedCursor.keyword } }
			] }] : [])
		] }
	}) : null;
	type SearchData = PayloadNeed<PayloadType<"collection:staged-users">>;
	const search = searchFindResult.docs as SearchData[];
	cacheTag?.(...[...new Set(search.map(s => s.id))].map(id => `payload.staged-users[${id}]`));
	const stagedUserFindVersionsResult = await payload.findVersions({
		req: req,
		overrideAccess: false,
		collection: "staged-users",
		pagination: false,
		draft: true,
		trash: true,
		where: { parent: { in: [...new Set(search.map(s => s.id))] } },
		select: {
			createdAt: true,
			updatedAt: true,
			parent: true,
			version: {
				createdAt: true,
				createdBy: true,
				updatedAt: true,
				updatedBy: true,
				deletedAt: true,
				deletedBy: true,
				email: true,
				role: true,
				name: true,
				employeeId: true,
				supervisor: true,
				reviewedAt: true,
				reviewedBy: true,
				reviewApproved: true,
				reviewComment: true
			}
		},
		sort: "-updatedAt",
		populate: {
			"users": {
				createdAt: true,
				createdBy: true,
				updatedAt: true,
				updatedBy: true,
				deletedAt: true,
				deletedBy: true,
				email: true,
				role: true,
				name: true,
				employeeId: true,
				supervisor: true
			}
		}
	});
	type StagedUserVersionData = PayloadNeed<TypeWithVersion<PayloadType<"collection:staged-users">>, "version.supervisor">;
	const stagedUserVersions = stagedUserFindVersionsResult.docs.filter((v, i, a) => i == a.findIndex(v2 => v2.parent == v.parent)) as StagedUserVersionData[];
	cacheTag?.(...[...new Set(stagedUserVersions.map(v => v.version.supervisor?.id))].filter(id => id != null).map(id => `payload.users[${id}]`));
	return {
		total: searchCountResult?.totalDocs ?? 0,
		resultRemaining: searchFindResult.totalDocs,
		result: stagedUserVersions.map(v => ({
			...v.version,
			id: v.parent,
			paginationCursor: stagedUserPaginationEncodeCursor({
				payload,
				collection: v.version,
				keyword: decodedCursor.keyword,
				sort: decodedCursor.sort
			})
		}))
	};
}
