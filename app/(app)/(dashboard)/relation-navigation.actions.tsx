"use server";

import type { ReactNode } from "react";
import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { Payload, getPayload } from "payload";

import { getRelationshipId } from "@/utils/payload";
import payloadConfig from "@/payload.config";

import { dashboardRoleLabels } from "./layout.shared";
import { RelationUser, RelationCreditApplication } from "./relation-navigation.shared";

export async function resolveRelationUsers(
	{ payload, ids }:
	{ payload?: Payload, ids: string[] }
): Promise<Record<`users:${string}`, RelationUser>> {
	payload ??= await getPayload({ config: payloadConfig });
	const result = await payload.find({
		overrideAccess: true,
		collection: "users",
		pagination: false,
		where: { id: { in: ids } },
		select: { name: true, email: true, stagedUser: true }
	});
	return Object.fromEntries(result.docs.map(doc => [`users:${doc.id}`, {
		name: doc.name,
		email: doc.email,
		stagedUserId: getRelationshipId(doc.stagedUser)
	}]));
}

export async function resolveRelationCreditApplications(
	{ payload, ids }:
	{ payload?: Payload, ids: string[] }
): Promise<Record<`credit-applications:${string}`, RelationCreditApplication>> {
	payload ??= await getPayload({ config: payloadConfig });
	const result = await payload.find({
		overrideAccess: true,
		collection: "credit-applications",
		pagination: false,
		where: { id: { in: ids } },
		select: { name: true, email: true }
	});
	return Object.fromEntries(result.docs.map(doc => [`credit-applications:${doc.id}`, {
		name: doc.name,
		email: doc.email
	}]));
}

export type RelationSummary = Awaited<ReturnType<typeof getRelationSummaryAction>>;
export async function getRelationSummaryAction({ relationType, relationId }: { relationType: string, relationId: string }) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return null;
	if(relationType == "user") {
		const doc = await payload.findByID({
			collection: "users",
			id: relationId,
			user,
			overrideAccess: false,
			depth: 0,
			select: {
				name: true,
				email: true,
				employeeId: true,
				role: true,
				supervisor: true,
				deletedAt: true
			}
		});
		const roleId = getRelationshipId(doc.role);
		const roleName = roleId != null ? (await payload.findByID({
			collection: "roles",
			id: roleId,
			user,
			overrideAccess: true,
			trash: true,
			depth: 0,
			select: { name: true }
		})).name : "-";
		return {
			relationType: relationType,
			relationId: String(doc.id),
			title: doc.name,
			description: doc.email,
			fields: [
				{ label: "ID", value: doc.id, className: "text-xs font-mono" },
				{ label: "Employee ID", value: doc.employeeId },
				{ label: "Role", value: roleName },
				{ label: "Deleted At", value: doc.deletedAt != null ? new Date(doc.deletedAt).toLocaleString() : "-" }
			]
		};
	}
	if(relationType == "role") {
		const doc = await payload.findByID({
			collection: "roles",
			id: relationId,
			user,
			overrideAccess: true,
			trash: true,
			depth: 0,
			select: {
				name: true,
				level: true,
				menus: true,
				deletedAt: true
			}
		});
		const menuLabels = doc.menus.map(menu => dashboardRoleLabels[menu]);
		const levelLabel = {
			"admin": "Admin",
			"manager": "Manager",
			"supervisor": "Supervisor",
			"officer": "Officer"
		}[doc.level];
		return {
			relationType: relationType,
			relationId: String(doc.id),
			title: doc.name,
			description: `${levelLabel} role`,
			fields: [
				{ label: "ID", value: (<span className="text-xs font-mono">{doc.id}</span>) },
				{ label: "Level", value: levelLabel },
				{ label: "Menus", value: menuLabels.length > 0 ? menuLabels.join(", ") : "-" },
				{ label: "Deleted At", value: doc.deletedAt != null ? new Date(doc.deletedAt).toLocaleString() : "-" }
			]
		};
	}
	if(relationType == "teams") {
		const doc = await payload.findByID({
			user,
			overrideAccess: true,
			collection: "teams",
			id: relationId,
			trash: true,
			depth: 0,
			select: {
				name: true,
				supervisor: true,
				officers: true,
				deletedAt: true
			}
		});
		return {
			relationType: relationType,
			relationId: String(doc.id),
			title: doc.name,
			description: "Team entry",
			fields: [
				{ label: "ID", value: doc.id, className: "text-xs font-mono" },
				{ label: "Deleted At", value: doc.deletedAt != null ? new Date(doc.deletedAt).toLocaleString() : null }
			]
		};
	}
	if(relationType == "credit-application") {
		const doc = await payload.findByID({
			user: user,
			overrideAccess: false,
			collection: "credit-applications",
			id: relationId,
			trash: true,
			depth: 0,
			select: {
				name: true,
				email: true,
				_status: true,
				deletedAt: true
			}
		});
		return {
			relationType: relationType,
			relationId: String(doc.id),
			title: doc.name,
			description: doc.email ?? "",
			fields: [
				{ label: "Id", value: (<span className="text-xs font-mono">{doc.id}</span>) },
				{ label: "Name", value: doc.name },
				{ label: "Email", value: doc.email ?? "-" },
				{ label: "Deleted At", value: doc.deletedAt != null ? new Date(doc.deletedAt) : "-" }
			]
		};
	}
	return null;
}

const RELATION_SEARCH_LIMIT = 20;

export async function searchRelationRolesAction(keyword: string, selectedIds: string[] = []) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const result = await payload.find({
		user,
		overrideAccess: false,
		collection: "roles",
		draft: true,
		trash: true,
		pagination: false,
		depth: 0,
		limit: RELATION_SEARCH_LIMIT + selectedIds.length,
		sort: "-updatedAt",
		where: { or: [
			{ id: { in: selectedIds } },
			{ id: { like: keyword } },
			{ name: { like: keyword } }
		] },
		select: { name: true, level: true }
	});
	return result.docs.map(doc => ({
		id: doc.id,
		label: <>(<span className="font-mono">{doc.id}</span>) {doc.name}</>
	}));
}

export async function searchRelationUsersAction(keyword: string, selectedIds: string[] = []) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const result = await payload.find({
		user,
		overrideAccess: false,
		collection: "users",
		draft: true,
		trash: true,
		pagination: false,
		depth: 0,
		limit: RELATION_SEARCH_LIMIT + selectedIds.length,
		sort: "-updatedAt",
		where: { or: [
			{ id: { in: selectedIds } },
			{ id: { like: keyword } },
			{ name: { like: keyword } }
		] },
		select: { name: true, email: true }
	});
	return result.docs.map(doc => ({
		id: doc.id,
		label: (<>(<span className="font-mono">{doc.id}</span>) {`${doc.name} ${doc.email}`}</>)
	}));
}

export async function searchRelationUsersByRoleLevelAction(roleLevel: "admin" | "manager" | "supervisor" | "officer", keyword: string, selectedIds: string[] = []) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const result = await payload.find({
		user,
		overrideAccess: false,
		collection: "users",
		draft: true,
		trash: true,
		pagination: false,
		depth: 0,
		limit: RELATION_SEARCH_LIMIT + selectedIds.length,
		sort: "-updatedAt",
		where: { and: [
			{ "role.level": { equals: roleLevel } },
			{ or: [
				{ id: { in: selectedIds } },
				{ id: { like: keyword } },
				{ name: { like: keyword } }
			] }
		] },
		select: { name: true, email: true }
	});
	return result.docs.map(doc => ({
		id: doc.id,
		label: (<>(<span className="font-mono">{doc.id}</span>) {`${doc.name} ${doc.email}`}</>)
	}));
}

export async function searchRelationTeamsAction(keyword: string, selectedIds: string[] = []) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const result = await payload.find({
		user,
		overrideAccess: false,
		collection: "teams",
		draft: true,
		trash: true,
		pagination: false,
		depth: 0,
		limit: RELATION_SEARCH_LIMIT + selectedIds.length,
		sort: "-updatedAt",
		where: { or: [
			{ id: { in: selectedIds } },
			{ id: { like: keyword } },
			{ name: { like: keyword } }
		] },
		select: { name: true }
	});
	return result.docs.map(doc => ({
		id: doc.id,
		label: <>(<span className="font-mono">{doc.id}</span>) {doc.name}</>
	}));
}

export async function searchRelationCreditApplicationsAction(keyword: string, selectedIds: string[] = []) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const result = await payload.find({
		user: user,
		overrideAccess: false,
		collection: "credit-applications",
		pagination: false,
		depth: 0,
		limit: RELATION_SEARCH_LIMIT + selectedIds.length,
		sort: "-updatedAt",
		where: { and: [
			{ _status: { equals: "published" } },
			{ deletedAt: { exists: false } },
			{ or: [
				{ id: { in: selectedIds } },
				{ id: { like: keyword } },
				{ name: { like: keyword } },
				{ email: { like: keyword } }
			] }
		] },
		select: { name: true, email: true }
	});
	return result.docs.map(doc => ({
		id: doc.id,
		label: <>(<span className="font-mono">{doc.id}</span>) {`${doc.name} ${doc.email ?? ""}`}</>
	}));
}

export async function searchAvailableRelationCreditApplicationsAction(keyword: string, selectedIds: string[] = []) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const result = await payload.find({
		user: user,
		overrideAccess: false,
		collection: "credit-applications",
		pagination: false,
		depth: 0,
		limit: RELATION_SEARCH_LIMIT * 5 + selectedIds.length,
		sort: "-updatedAt",
		where: { and: [
			{ _status: { equals: "published" } },
			{ deletedAt: { exists: false } },
			{ or: [
				{ id: { in: selectedIds } },
				{ id: { like: keyword } },
				{ name: { like: keyword } },
				{ email: { like: keyword } }
			] }
		] },
		select: { name: true, email: true }
	});
	const selectedCreditApplications = await (async () => {
		if(selectedIds.length == 0)
			return new Map<string, RelationCreditApplication>();
		const creditApplications = await payload.find({
			user: user,
			overrideAccess: false,
			collection: "credit-applications",
			pagination: false,
			depth: 0,
			limit: selectedIds.length,
			where: { and: [
				{ id: { in: selectedIds } },
				{ _status: { equals: "published" } },
				{ deletedAt: { exists: false } }
			] },
			select: { name: true, email: true }
		});
		return new Map(creditApplications.docs.map(doc => [String(doc.id), {
			name: doc.name,
			email: doc.email
		}] as const));
	})();
	const assignmentsByCreditApplication = await (async () => {
		if(result.docs.length == 0)
			return new Map<string, { id: string, deletedAt: string | null }>();
		const creditApplicationAssignments = await payload.find({
			user: user,
			overrideAccess: false,
			collection: "credit-application-assignments",
			draft: true,
			trash: true,
			pagination: false,
			depth: 0,
			limit: result.docs.length,
			where: { creditApplication: { in: result.docs.map(doc => doc.id) } },
			select: { creditApplication: true, deletedAt: true }
		});
		return new Map(creditApplicationAssignments.docs.flatMap(doc => {
			const creditApplication = getRelationshipId(doc.creditApplication);
			return creditApplication != null ? [[creditApplication, {
				id: doc.id,
				deletedAt: doc.deletedAt
			}] as const] : [];
		}));
	})();
	const selectedIdSet = new Set(selectedIds);
	const optionsById = new Map<string, { id: string, label: ReactNode }>();
	for(const doc of result.docs) {
		const creditApplication = String(doc.id);
		const assignment = assignmentsByCreditApplication.get(creditApplication);
		if(!selectedIdSet.has(creditApplication) && assignment != null && assignment.deletedAt == null)
			continue;
		optionsById.set(creditApplication, {
			id: creditApplication,
			label: <>(<span className="font-mono">{doc.id}</span>) {`${doc.name} ${doc.email ?? ""}`}</>
		});
	}
	for(const selectedId of selectedIds) {
		if(optionsById.has(selectedId))
			continue;
		const selectedCreditApplication = selectedCreditApplications.get(selectedId);
		if(selectedCreditApplication == null)
			continue;
		optionsById.set(selectedId, {
			id: selectedId,
			label: <>(<span className="font-mono">{selectedId}</span>) {`${selectedCreditApplication.name} ${selectedCreditApplication.email}`}</>
		});
	}
	return [...optionsById.values()].slice(0, RELATION_SEARCH_LIMIT + selectedIds.length);
}

export async function searchRelationCreditApplicationAssignmentsAction(keyword: string, selectedIds: string[] = []) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const result = await payload.find({
		user: user,
		overrideAccess: false,
		collection: "credit-application-assignments",
		draft: true,
		trash: true,
		pagination: false,
		depth: 0,
		limit: RELATION_SEARCH_LIMIT + selectedIds.length,
		sort: "-updatedAt",
		where: { or: [
			{ id: { in: selectedIds } },
			{ id: { like: keyword } }
		] },
		select: {}
	});
	return result.docs.map(doc => ({
		id: doc.id,
		label: <span className="font-mono">{doc.id}</span>
	}));
}
