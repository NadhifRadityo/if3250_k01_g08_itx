"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload, type Where, type Payload } from "payload";

import payloadConfig from "@payload-config";
import type { User } from "@/payload-types";

const MAX_REPORT_DAYS = 31;
const REPORT_LIMIT = 500;

export type OfficerLocationPoint = {
	latitude: number;
	longitude: number;
	label?: string;
	recordedAt?: string | null;
};

export type OfficerTrackingTodayRow = {
	officerId: string;
	officerName: string;
	teamName: string;
	firstLoginTime: string | null;
	tracking: OfficerLocationPoint[];
};

export type OfficerTasklistRow = {
	officerId: string;
	officerName: string;
	teamName: string;
	assignDate: string;
	firstLoginTime: string | null;
	firstLoginLocation: OfficerLocationPoint | null;
	lastLogoutTime: string | null;
	lastLogoutLocation: OfficerLocationPoint | null;
	tasklistAccts: number;
	finishedSurvey: number;
	rescheduleAccts: number;
	untouchedAccts: number;
	draftAccts: number;
};

export type OfficerTaskDetailRow = {
	officerId: string;
	officerName: string;
	applyId: string;
	customerName: string;
	surveyDate: string | null;
	surveyResult: string;
	rescheduleDate: string | null;
	rescheduleTime: string | null;
	picture1: string | null;
	picture1Location: OfficerLocationPoint | null;
	picture12: string | null;
	picture12Location: OfficerLocationPoint | null;
};

export type QueryOfficerTrackingTodayInput = {
	keyword: string;
};

export type QueryOfficerTasklistInput = {
	keyword: string;
	dateFrom: string;
	dateUntil: string;
};

export type QueryOfficerTaskDetailsInput = QueryOfficerTasklistInput & {
	officerId: string;
};

type OfficerLite = {
	id: string;
	name: string;
	email: string;
};

type TeamLite = {
	id: string;
	name: string;
	officerIds: string[];
};

type AssignmentLite = {
	id: string;
	creditApplicationId: string | null;
	officerId: string | null;
	createdAt: string;
	updatedAt: string;
	reviewedAt: string | null;
	reviewApproved: boolean | null;
	status: string | null;
};

type CreditApplicationLite = {
	id: string;
	name: string;
	email: string;
	others: unknown;
	updatedAt: string;
	reviewedAt: string | null;
	reviewApproved: boolean | null;
	status: string | null;
};

type OfficerTaskAccessMenu = "officer-task-reporting-viewer" | "officer-task-monitoring-viewer";

function getRelationshipId(value: unknown): string | null {
	if(typeof value == "string")
		return value;
	if(value != null && typeof value == "object" && "id" in value && typeof value.id == "string")
		return value.id;
	return null;
}

function getRelationshipIds(value: unknown): string[] {
	if(!Array.isArray(value))
		return [];
	return value.map(getRelationshipId).filter((id): id is string => id != null);
}

function normalizeText(value: unknown): string {
	return typeof value == "string" ? value.trim() : "";
}

function normalizeDateValue(value: unknown): string | null {
	if(typeof value != "string")
		return null;
	const trimmed = value.trim();
	if(trimmed.length == 0)
		return null;
	const date = new Date(trimmed);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeRoleMenus(value: unknown): string[] {
	if(!Array.isArray(value))
		return [];
	return [...new Set(value
		.filter((menu): menu is string => typeof menu == "string")
		.map(menu => menu.trim().toLowerCase())
		.filter(menu => menu.length > 0)
	)];
}

async function resolveUserRoleMenus(payload: Payload, user: User): Promise<string[]> {
	const rawRole = user.role;
	if(rawRole != null && typeof rawRole == "object" && "menus" in rawRole)
		return normalizeRoleMenus(rawRole.menus);

	const roleId = getRelationshipId(rawRole);
	if(roleId == null)
		return [];

	const role = await payload.findByID({
		collection: "roles",
		id: roleId,
		user,
		overrideAccess: true,
		trash: true,
		depth: 0,
		select: {
			menus: true
		}
	});

	return normalizeRoleMenus(role.menus);
}

async function hasOfficerTaskAccess(payload: Payload, user: User, requiredMenu: OfficerTaskAccessMenu): Promise<boolean> {
	const roleMenus = await resolveUserRoleMenus(payload, user);
	return roleMenus.includes(requiredMenu);
}

function normalizeNumber(value: unknown): number | null {
	if(typeof value == "number" && Number.isFinite(value))
		return value;
	if(typeof value != "string")
		return null;
	const normalized = value.trim();
	if(normalized.length == 0)
		return null;
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
}

function dateOnlyKey(value: string): string {
	const date = new Date(value);
	if(Number.isNaN(date.getTime()))
		return value.slice(0, 10);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function parseDateOnlyInput(value: string, endOfDay = false): Date {
	const [rawYear, rawMonth, rawDay] = value.split("-");
	const year = Number(rawYear);
	const month = Number(rawMonth);
	const day = Number(rawDay);
	if(!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day))
		throw new Error("Date range must use YYYY-MM-DD format.");
	return new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
}

function normalizeReportDateRange(dateFrom: string, dateUntil: string): { start: Date, end: Date } {
	const start = parseDateOnlyInput(dateFrom);
	const end = parseDateOnlyInput(dateUntil, true);
	if(start.getTime() > end.getTime())
		throw new Error("Assignment date from cannot be later than until.");

	const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
	if(days > MAX_REPORT_DAYS)
		throw new Error("Assignment date range cannot be more than 1 month.");

	return { start, end };
}

function getObjectField(value: unknown, key: string): unknown {
	if(value == null || typeof value != "object" || Array.isArray(value))
		return undefined;
	return (value as Record<string, unknown>)[key];
}

function findFirstString(value: unknown, keys: string[]): string | null {
	if(value == null || typeof value != "object")
		return null;
	if(Array.isArray(value)) {
		for(const item of value) {
			const found = findFirstString(item, keys);
			if(found != null)
				return found;
		}
		return null;
	}

	const record = value as Record<string, unknown>;
	for(const key of keys) {
		const fieldValue = record[key];
		if(typeof fieldValue == "string" && fieldValue.trim().length > 0)
			return fieldValue.trim();
	}

	for(const fieldValue of Object.values(record)) {
		const found = findFirstString(fieldValue, keys);
		if(found != null)
			return found;
	}

	return null;
}

function extractLocation(value: unknown, label?: string): OfficerLocationPoint | null {
	if(value == null)
		return null;

	if(Array.isArray(value)) {
		if(value.length >= 2) {
			const latitude = normalizeNumber(value[0]);
			const longitude = normalizeNumber(value[1]);
			if(latitude != null && longitude != null)
				return { latitude, longitude, label };
		}
		for(const item of value) {
			const found = extractLocation(item, label);
			if(found != null)
				return found;
		}
		return null;
	}

	if(typeof value != "object")
		return null;

	const record = value as Record<string, unknown>;
	const latitude = normalizeNumber(record.latitude ?? record.lat);
	const longitude = normalizeNumber(record.longitude ?? record.lng ?? record.lon);
	if(latitude != null && longitude != null) {
		return {
			latitude,
			longitude,
			label: normalizeText(record.label).length > 0 ? normalizeText(record.label) : label,
			recordedAt: normalizeDateValue(record.recordedAt ?? record.time ?? record.timestamp)
		};
	}

	for(const fieldValue of Object.values(record)) {
		const found = extractLocation(fieldValue, label);
		if(found != null)
			return found;
	}

	return null;
}

function extractLocations(value: unknown): OfficerLocationPoint[] {
	if(value == null)
		return [];
	if(Array.isArray(value)) {
		return value.flatMap(item => {
			const direct = extractLocation(item);
			return direct == null ? extractLocations(item) : [direct];
		});
	}
	if(typeof value != "object")
		return [];

	const direct = extractLocation(value);
	const nested = Object.values(value as Record<string, unknown>).flatMap(extractLocations);
	const locations = direct == null ? nested : [direct, ...nested];
	const seen = new Set<string>();
	return locations.filter(location => {
		const key = `${location.latitude}:${location.longitude}:${location.recordedAt ?? ""}`;
		if(seen.has(key))
			return false;
		seen.add(key);
		return true;
	});
}

function uniqueLocations(locations: OfficerLocationPoint[]): OfficerLocationPoint[] {
	const seen = new Set<string>();
	return locations.filter(location => {
		const key = `${location.latitude}:${location.longitude}:${location.recordedAt ?? ""}`;
		if(seen.has(key))
			return false;
		seen.add(key);
		return true;
	});
}

function getPreferredLocation(others: unknown, keys: string[], fallbackLabel: string): OfficerLocationPoint | null {
	for(const key of keys) {
		const found = extractLocation(getObjectField(others, key), fallbackLabel);
		if(found != null)
			return found;
	}
	return null;
}

function getSurveyResult(assignment: AssignmentLite, application: CreditApplicationLite | null): string {
	const rawResult = findFirstString(application?.others, ["surveyResult", "result", "status", "surveyStatus"]);
	if(rawResult != null)
		return rawResult;
	if(assignment.reviewApproved == true || application?.reviewApproved == true)
		return "Finished";
	if(assignment.reviewedAt == null)
		return "Draft";
	return assignment.reviewApproved == false || application?.reviewApproved == false ? "Rejected" : "Pending";
}

function isRescheduled(application: CreditApplicationLite | null): boolean {
	if(application == null)
		return false;
	const rescheduleValue = findFirstString(application.others, ["rescheduleDate", "rescheduledDate", "rescheduleTime", "rescheduledTime"]);
	if(rescheduleValue != null)
		return true;
	const status = findFirstString(application.others, ["surveyResult", "result", "status", "surveyStatus"]);
	return status != null && status.toLowerCase().includes("resched");
}

function isFinished(assignment: AssignmentLite, application: CreditApplicationLite | null): boolean {
	const result = getSurveyResult(assignment, application).toLowerCase();
	return assignment.reviewApproved == true || application?.reviewApproved == true || result.includes("finish") || result.includes("complete") || result.includes("done");
}

function isDraft(assignment: AssignmentLite): boolean {
	return assignment.status == "draft" || assignment.reviewedAt == null;
}

async function resolveReportContext(requiredMenu: OfficerTaskAccessMenu) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();
	if(!(await hasOfficerTaskAccess(payload, user, requiredMenu)))
		throw new Error("You do not have access to this officer task menu.");
	return { payload, user };
}

async function findOfficers(payload: Payload, user: User): Promise<OfficerLite[]> {
	const result = await payload.find({
		collection: "users",
		user,
		overrideAccess: false,
		trash: true,
		pagination: false,
		depth: 1,
		limit: REPORT_LIMIT,
		where: {
			"role.level": {
				equals: "officer"
			}
		},
		select: {
			name: true,
			email: true
		}
	});

	return result.docs.map(doc => ({
		id: String(doc.id),
		name: normalizeText(doc.name),
		email: normalizeText(doc.email)
	}));
}

async function findTeams(payload: Payload, user: User): Promise<TeamLite[]> {
	const result = await payload.find({
		collection: "teams",
		user,
		overrideAccess: false,
		trash: true,
		draft: true,
		pagination: false,
		depth: 0,
		limit: REPORT_LIMIT,
		select: {
			name: true,
			officers: true
		}
	});

	return result.docs.map(doc => ({
		id: String(doc.id),
		name: normalizeText(doc.name),
		officerIds: getRelationshipIds(doc.officers)
	}));
}

async function findAssignments(
	payload: Payload,
	user: User,
	start: Date,
	end: Date
): Promise<AssignmentLite[]> {
	const where: Where = {
		and: [
			{ createdAt: { greater_than_equal: start.toISOString() } },
			{ createdAt: { less_than_equal: end.toISOString() } }
		]
	};
	const result = await payload.find({
		collection: "credit-application-assignments",
		user,
		overrideAccess: false,
		trash: true,
		draft: true,
		pagination: false,
		depth: 0,
		limit: REPORT_LIMIT,
		sort: "createdAt",
		where,
		select: {
			creditApplication: true,
			officer: true,
			createdAt: true,
			updatedAt: true,
			reviewedAt: true,
			reviewApproved: true,
			_status: true
		}
	});

	return result.docs.map(doc => ({
		id: String(doc.id),
		creditApplicationId: getRelationshipId(doc.creditApplication),
		officerId: getRelationshipId(doc.officer),
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
		reviewedAt: doc.reviewedAt ?? null,
		reviewApproved: doc.reviewApproved ?? null,
		status: normalizeText(doc._status)
	}));
}

async function findCreditApplicationsByIds(
	payload: Payload,
	user: User,
	ids: string[]
): Promise<Map<string, CreditApplicationLite>> {
	const normalizedIds = [...new Set(ids.map(id => id.trim()).filter(id => id.length > 0))];
	if(normalizedIds.length == 0)
		return new Map();

	const result = await payload.find({
		collection: "credit-applications",
		user,
		overrideAccess: false,
		trash: true,
		draft: true,
		pagination: false,
		depth: 0,
		limit: Math.max(normalizedIds.length, 1),
		where: {
			id: {
				in: normalizedIds
			}
		},
		select: {
			name: true,
			email: true,
			others: true,
			updatedAt: true,
			reviewedAt: true,
			reviewApproved: true,
			_status: true
		}
	});

	const map = new Map<string, CreditApplicationLite>();
	for(const doc of result.docs) {
		map.set(String(doc.id), {
			id: String(doc.id),
			name: normalizeText(doc.name),
			email: normalizeText(doc.email),
			others: doc.others,
			updatedAt: doc.updatedAt,
			reviewedAt: doc.reviewedAt ?? null,
			reviewApproved: doc.reviewApproved ?? null,
			status: normalizeText(doc._status)
		});
	}
	return map;
}

function buildOfficerTeamNames(teams: TeamLite[]): Map<string, string> {
	const teamNamesByOfficer = new Map<string, string[]>();
	for(const team of teams) {
		for(const officerId of team.officerIds) {
			const names = teamNamesByOfficer.get(officerId) ?? [];
			names.push(team.name);
			teamNamesByOfficer.set(officerId, names);
		}
	}

	const labelByOfficer = new Map<string, string>();
	for(const [officerId, names] of teamNamesByOfficer)
		labelByOfficer.set(officerId, [...new Set(names)].join(", "));
	return labelByOfficer;
}

function matchesKeyword(officer: OfficerLite, teamName: string, keyword: string): boolean {
	const normalizedKeyword = keyword.trim().toLowerCase();
	if(normalizedKeyword.length == 0)
		return true;
	return `${officer.name} ${officer.email} ${teamName}`.toLowerCase().includes(normalizedKeyword);
}

function firstDate(values: string[]): string | null {
	if(values.length == 0)
		return null;
	return [...values].sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;
}

function lastDate(values: string[]): string | null {
	if(values.length == 0)
		return null;
	return [...values].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
}

function createTaskDetailRow(
	assignment: AssignmentLite,
	officer: OfficerLite,
	application: CreditApplicationLite | null
): OfficerTaskDetailRow | null {
	if(application == null)
		return null;

	const rescheduleDateTime = normalizeDateValue(findFirstString(application.others, ["rescheduleDate", "rescheduledDate"]));
	const rescheduleTime = findFirstString(application.others, ["rescheduleTime", "rescheduledTime"]);

	return {
		officerId: officer.id,
		officerName: officer.name,
		applyId: application.id,
		customerName: application.name.length > 0 ? application.name : application.email.length > 0 ? application.email : application.id,
		surveyDate: normalizeDateValue(findFirstString(application.others, ["surveyDate", "surveyedAt"])) ?? assignment.reviewedAt ?? application.reviewedAt ?? null,
		surveyResult: getSurveyResult(assignment, application),
		rescheduleDate: rescheduleDateTime,
		rescheduleTime,
		picture1: findFirstString(application.others, ["picture1", "pic1", "photo1", "image1"]),
		picture1Location: getPreferredLocation(application.others, ["picture1Location", "pic1Location", "photo1Location", "image1Location"], "Picture 1"),
		picture12: findFirstString(application.others, ["picture12", "pic12", "photo12", "image12"]),
		picture12Location: getPreferredLocation(application.others, ["picture12Location", "pic12Location", "photo12Location", "image12Location"], "Picture 12")
	};
}

export async function queryOfficerTrackingTodayAction(input: QueryOfficerTrackingTodayInput): Promise<OfficerTrackingTodayRow[]> {
	const { payload, user } = await resolveReportContext("officer-task-monitoring-viewer");
	const today = new Date();
	const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
	const [officers, teams, assignments] = await Promise.all([
		findOfficers(payload, user),
		findTeams(payload, user),
		findAssignments(payload, user, start, end)
	]);
	const applicationsById = await findCreditApplicationsByIds(payload, user, assignments.map(assignment => assignment.creditApplicationId).filter((id): id is string => id != null));
	const teamNameByOfficer = buildOfficerTeamNames(teams);
	const assignmentsByOfficer = new Map<string, AssignmentLite[]>();
	for(const assignment of assignments) {
		if(assignment.officerId == null)
			continue;
		const rows = assignmentsByOfficer.get(assignment.officerId) ?? [];
		rows.push(assignment);
		assignmentsByOfficer.set(assignment.officerId, rows);
	}

	return officers
		.filter(officer => matchesKeyword(officer, teamNameByOfficer.get(officer.id) ?? "-", input.keyword) || assignmentsByOfficer.has(officer.id))
		.map(officer => {
			const officerAssignments = assignmentsByOfficer.get(officer.id) ?? [];
			const tracking = officerAssignments.flatMap(assignment => {
				const application = assignment.creditApplicationId == null ? null : applicationsById.get(assignment.creditApplicationId) ?? null;
				if(application == null)
					return [];
				const explicitTracking = uniqueLocations([
					...extractLocations(getObjectField(application.others, "tracking")),
					...extractLocations(getObjectField(application.others, "trackingLocations"))
				]);
				return explicitTracking.length > 0 ? explicitTracking : extractLocations(application.others);
			});

			return {
				officerId: officer.id,
				officerName: officer.name,
				teamName: teamNameByOfficer.get(officer.id) ?? "-",
				firstLoginTime: firstDate(officerAssignments.map(assignment => assignment.createdAt)),
				tracking
			};
		});
}

export async function queryOfficerTasklistAction(input: QueryOfficerTasklistInput): Promise<OfficerTasklistRow[]> {
	const { start, end } = normalizeReportDateRange(input.dateFrom, input.dateUntil);
	const { payload, user } = await resolveReportContext("officer-task-reporting-viewer");
	const [officers, teams, assignments] = await Promise.all([
		findOfficers(payload, user),
		findTeams(payload, user),
		findAssignments(payload, user, start, end)
	]);
	const applicationsById = await findCreditApplicationsByIds(payload, user, assignments.map(assignment => assignment.creditApplicationId).filter((id): id is string => id != null));
	const officersById = new Map(officers.map(officer => [officer.id, officer]));
	const teamNameByOfficer = buildOfficerTeamNames(teams);
	const grouped = new Map<string, AssignmentLite[]>();

	for(const assignment of assignments) {
		if(assignment.officerId == null)
			continue;
		const key = `${assignment.officerId}:${dateOnlyKey(assignment.createdAt)}`;
		const rows = grouped.get(key) ?? [];
		rows.push(assignment);
		grouped.set(key, rows);
	}

	const rows: OfficerTasklistRow[] = [];
	for(const [key, officerAssignments] of grouped) {
		const [officerId, assignDate] = key.split(":");
		const officer = officersById.get(officerId);
		if(officer == null)
			continue;
		const teamName = teamNameByOfficer.get(officer.id) ?? "-";
		if(!matchesKeyword(officer, teamName, input.keyword))
			continue;

		let finishedSurvey = 0;
		let rescheduleAccts = 0;
		let draftAccts = 0;
		for(const assignment of officerAssignments) {
			const application = assignment.creditApplicationId == null ? null : applicationsById.get(assignment.creditApplicationId) ?? null;
			if(isFinished(assignment, application))
				finishedSurvey += 1;
			if(isRescheduled(application))
				rescheduleAccts += 1;
			if(isDraft(assignment))
				draftAccts += 1;
		}

		const firstAssignment = [...officerAssignments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0] ?? null;
		const lastAssignment = [...officerAssignments].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] ?? null;
		const firstApplication = firstAssignment?.creditApplicationId == null ? null : applicationsById.get(firstAssignment.creditApplicationId) ?? null;
		const lastApplication = lastAssignment?.creditApplicationId == null ? null : applicationsById.get(lastAssignment.creditApplicationId) ?? null;

		rows.push({
			officerId: officer.id,
			officerName: officer.name,
			teamName,
			assignDate,
			firstLoginTime: firstDate(officerAssignments.map(assignment => assignment.createdAt)),
			firstLoginLocation: firstApplication == null ? null : getPreferredLocation(firstApplication.others, ["firstLoginLocation", "loginLocation", "location"], "First Login"),
			lastLogoutTime: lastDate(officerAssignments.map(assignment => assignment.updatedAt)),
			lastLogoutLocation: lastApplication == null ? null : getPreferredLocation(lastApplication.others, ["lastLogoutLocation", "logoutLocation", "location"], "Last Logout"),
			tasklistAccts: officerAssignments.length,
			finishedSurvey,
			rescheduleAccts,
			untouchedAccts: Math.max(0, officerAssignments.length - finishedSurvey - rescheduleAccts - draftAccts),
			draftAccts
		});
	}

	return rows.sort((a, b) => `${b.assignDate}:${a.officerName}`.localeCompare(`${a.assignDate}:${b.officerName}`));
}

export async function queryOfficerTaskDetailsAction(input: QueryOfficerTaskDetailsInput): Promise<OfficerTaskDetailRow[]> {
	const { start, end } = normalizeReportDateRange(input.dateFrom, input.dateUntil);
	const { payload, user } = await resolveReportContext("officer-task-reporting-viewer");
	const [officers, assignments] = await Promise.all([
		findOfficers(payload, user),
		findAssignments(payload, user, start, end)
	]);
	const officer = officers.find(candidate => candidate.id == input.officerId);
	if(officer == null)
		return [];

	const officerAssignments = assignments.filter(assignment => assignment.officerId == input.officerId);
	const applicationsById = await findCreditApplicationsByIds(payload, user, officerAssignments.map(assignment => assignment.creditApplicationId).filter((id): id is string => id != null));

	return officerAssignments
		.map(assignment => createTaskDetailRow(assignment, officer, assignment.creditApplicationId == null ? null : applicationsById.get(assignment.creditApplicationId) ?? null))
		.filter((row): row is OfficerTaskDetailRow => row != null);
}
