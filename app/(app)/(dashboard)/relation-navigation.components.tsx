"use client";

import React, { useRef, useMemo, useState, useEffect, useContext, useCallback, createContext, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2Icon, CircleAlertIcon } from "lucide-react";

import { uwsa } from "@/utils/actions";
import cn from "@/utils/cn";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Drawer, DrawerTitle, DrawerFooter, DrawerHeader, DrawerContent, DrawerDescription } from "@/components/radix/Drawer";

import { MenuFilterState, useDashboardContext } from "./layout.components";
import { RelationSummary, getRelationSummaryAction } from "./relation-navigation.actions";
import { RelationRole, RelationTeam, RelationUser, RelationAccess, RelationGpsLog, RelationSurvey, RelationLoginLog, RelationMessageLog, RelationOfficerTask, RelationRecordingLog, RelationSurveyResult, RelationCreditApplication, RelationSatisfactionSurvey, RelationCreditApplicationImport, RelationSatisfactionSurveyResult, RelationCreditApplicationAssignment } from "./relation-navigation.shared";

type PendingRelationRedirectData = {
	relationType: string;
	relationSource?: string;
} & (
	{ relationId: string, relationIds?: never } |
	{ relationId?: never, relationIds: string[] }
);

declare global {
	interface Window {
		__dashboardPendingRelationRedirect?: PendingRelationRedirectData;
	}
}

function setPendingRelationNavigationRedirectData(value: PendingRelationRedirectData) {
	if(typeof window == "undefined")
		return;
	window.__dashboardPendingRelationRedirect = value;
}

export function consumePendingRelationNavigationRedirectData(relationType: string) {
	if(typeof window == "undefined")
		return null;
	const pending = window.__dashboardPendingRelationRedirect;
	if(pending == null || pending.relationType != relationType)
		return null;
	window.setTimeout(() => {
		if(window.__dashboardPendingRelationRedirect != pending)
			return;
		window.__dashboardPendingRelationRedirect = undefined;
	}, 100);
	return {
		relationId: pending.relationId,
		relationIds: pending.relationIds,
		relationSource: pending.relationSource
	};
}
export function relationNavigationFilterConfigProvider(relationType: string) {
	return () => {
		const redirectData = consumePendingRelationNavigationRedirectData(relationType);
		if(redirectData == null) return Symbol.unscopables;
		if(redirectData.relationId != null)
			return [{ columnKey: "id", operator: "equals", value: redirectData.relationId, combinator: "and" }] as MenuFilterState[];
		return [{ columnKey: "id", operator: "in", value: redirectData.relationIds!, combinator: "and" }] as MenuFilterState[];
	};
}

type RelationFallback = { title: React.ReactNode, description?: React.ReactNode, fields?: { label: React.ReactNode, value: React.ReactNode }[] };
function useRelationNavigationSummary() {
	const [_, _rerender] = useState(0);
	const rerender = useCallback(() => _rerender(v => v + 1), []);
	const intentOpen = useRef(false);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [pickerDrawerOpen, setPickerDrawerOpen] = useState(false);
	const [relationType, setRelationType] = useState(null as string | null);
	const [pickerTitle, setPickerTitle] = useState(null as React.ReactNode);
	const [pickerDescription, setPickerDescription] = useState(null as React.ReactNode);
	const [pickerChoices, setPickerChoices] = useState(null as { id: string, name: React.ReactNode, description?: React.ReactNode, fallback: RelationFallback }[] | null);
	const [pickedId, setPickedId] = useState(null as string | null);
	const [pickedFallback, setPickedFallback] = useState(null as RelationFallback | null);
	const [summary, setSummary] = useState(null as RelationSummary | null);
	const [error, setError] = useState(null as any);
	const [isLoading, startTransition] = useTransition();

	const openDrawer = useCallback((
		{ relationType, relationId, fallback }:
		{ relationType: string, relationId: string, fallback: RelationFallback }
	) => {
		intentOpen.current = true;
		setDrawerOpen(true);
		setPickerDrawerOpen(false);
		setRelationType(relationType);
		setPickerTitle(null);
		setPickerDescription(null);
		setPickerChoices(null);
		setPickedId(relationId);
		setPickedFallback(fallback);
		rerender();
	}, []);
	const openPickerDrawer = useCallback((
		{ relationType, pickerTitle, pickerDescription, relationChoices }:
		{ relationType: string, pickerTitle: React.ReactNode, pickerDescription?: React.ReactNode, relationChoices: { id: string, name: React.ReactNode, description?: React.ReactNode, fallback: RelationFallback }[] }
	) => {
		intentOpen.current = true;
		setDrawerOpen(false);
		setPickerDrawerOpen(true);
		setRelationType(relationType);
		setPickerTitle(pickerTitle);
		setPickerDescription(pickerDescription ?? null);
		setPickerChoices(relationChoices);
		setPickedId(null);
		setPickedFallback(null);
		rerender();
	}, []);
	useEffect(() => {
		if(!intentOpen.current || relationType == null || pickedId == null || pickedFallback == null)
			return;
		intentOpen.current = false;
		startTransition(async () => {
			setDrawerOpen(true);
			try {
				const summary = await uwsa(getRelationSummaryAction)({ relationType, relationId: pickedId });
				if(summary == null)
					throw new Error(`Cannot find relation ${JSON.stringify(relationType)} with id ${JSON.stringify(pickedId)}`);
				setSummary(summary);
			} catch(error) {
				setError(error);
			}
		});
	}, [intentOpen.current, relationType, pickedId, pickedFallback]);
	const closeDrawer = useCallback(() => { setDrawerOpen(false); }, []);
	const closePickerDrawer = useCallback(() => { setPickerDrawerOpen(false); }, []);

	const drawer = (
		<Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-lg">
				<DrawerHeader>
					<DrawerTitle>{summary?.title ?? pickedFallback?.title}</DrawerTitle>
					<DrawerDescription>{summary?.description ?? pickedFallback?.description}</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
					{isLoading ? (
						<div className="text-muted-foreground flex items-center gap-2 text-sm">
							<Loader2Icon className="size-4 animate-spin" />
							Loading details...
						</div>
					) : null}
					{error != null ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>{`${error?.name ?? "Error"}`}</AlertTitle>
							<AlertDescription>{`${error?.message ?? error}`}</AlertDescription>
						</Alert>
					) : null}
					{summary != null ? (
						<div className="space-y-2">
							{(summary?.fields ?? pickedFallback?.fields)?.map((field, i) => (
								<div key={i} className="grid gap-1 rounded-md border px-3 py-2">
									<p className="text-muted-foreground text-xs font-medium">
										{field.label}
									</p>
									<p className="wrap-break-word">
										{field.value}
									</p>
								</div>
							))}
						</div>
					) : null}
				</div>
				<DrawerFooter className="border-t">
					<Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>Close</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
	const pickerDrawer = (
		<Drawer open={pickerDrawerOpen} onOpenChange={setPickerDrawerOpen} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-lg">
				<DrawerHeader>
					<DrawerTitle>{pickerTitle}</DrawerTitle>
					<DrawerDescription>{pickerDescription}</DrawerDescription>
				</DrawerHeader>
				<div className="space-y-2 px-4 pb-4">
					{pickerChoices?.map(pickerChoice => (
						<Button
							key={pickerChoice.id}
							type="button"
							variant="outline"
							className="h-auto w-full whitespace-normal px-3 py-2 text-left"
							onClick={() => {
								intentOpen.current = true;
								setPickedId(pickerChoice.id);
								setPickedFallback(pickerChoice.fallback);
								rerender();
							}}
						>
							<span className="grid w-full gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3">
								<span className="max-h-11 overflow-hidden text-sm leading-snug wrap-break-word sm:max-h-none">
									{pickerChoice.name}
								</span>
								<span className="text-muted-foreground block font-mono text-xs wrap-break-word sm:text-right">
									{pickerChoice.description}
								</span>
							</span>
						</Button>
					))}
				</div>
				<DrawerFooter className="border-t">
					<Button type="button" variant="outline" onClick={() => setPickerDrawerOpen(false)}>Close</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);

	return {
		openDrawer,
		openPickerDrawer,
		closeDrawer,
		closePickerDrawer,
		drawer,
		pickerDrawer
	};
}
const relationToMenuMap = {
	// "users": "user-management",
	"staged-users": "user-management",
	"roles": "role-management",
	"teams": "team-management",
	"credit-applications": "credit-application-management",
	"credit-application-imports": "credit-application-management",
	"credit-application-assignments": "credit-application-assignment",
	"surveys": "survey-management",
	"satisfaction-surveys": "satisfaction-survey-management",
	// "": "officer-task",
	// "": "officer-tracking",
	"login-logs": "login-log",
	"gps-logs": "gps-log",
	"message-logs": "message-log",
	"recording-logs": "recording-log"
};
function useRelationNavigationRedirect() {
	const router = useRouter();
	const { menus } = useDashboardContext();
	const menusRef = useRef(menus);
	menusRef.current = menus;
	const getRedirectMenuLink = useCallback((redirectData: PendingRelationRedirectData) => {
		const searchParams = new URLSearchParams();
		searchParams.set("filters", JSON.stringify(redirectData.relationId != null ?
			[{ columnKey: "id", operator: "equals", value: redirectData.relationId, combinator: "and" }] as MenuFilterState[] :
			[{ columnKey: "id", operator: "in", value: redirectData.relationIds, combinator: "and" }] as MenuFilterState[]
		));
		if(redirectData.relationSource != null)
			searchParams.set("relationSource", redirectData.relationSource);
		const requiredMenu = relationToMenuMap[redirectData.relationType];
		const menu = menusRef.current.find(menu => menu.key == requiredMenu)!;
		return `${menu.modes[menu.defaultMode].href}?${searchParams.toString()}`;
	}, []);
	const redirectMenu = useCallback((redirectData: PendingRelationRedirectData) => {
		setPendingRelationNavigationRedirectData(redirectData);
		router.push(getRedirectMenuLink(redirectData));
	}, []);
	const hasAccessToRelationMenu = useCallback((relationType: string) => {
		const requiredMenu = relationToMenuMap[relationType];
		return menusRef.current.some(menu => menu.key == requiredMenu);
	}, []);
	return {
		getRedirectMenuLink,
		redirectMenu,
		hasAccessToRelationMenu
	};
}
const RelationNavigationContext = createContext<
	(
		Pick<ReturnType<typeof useRelationNavigationSummary>, "openDrawer" | "openPickerDrawer" | "closeDrawer"> &
		Pick<ReturnType<typeof useRelationNavigationRedirect>, "getRedirectMenuLink" | "redirectMenu" | "hasAccessToRelationMenu">
	) | null
>(null);
export function RelationNavigationProvider({ children }: { children: React.ReactNode }) {
	const summaryStates = useRelationNavigationSummary();
	const redirectStates = useRelationNavigationRedirect();
	const value = useMemo(() => ({
		openDrawer: summaryStates.openDrawer,
		openPickerDrawer: summaryStates.openPickerDrawer,
		closeDrawer: summaryStates.closeDrawer,
		getRedirectMenuLink: redirectStates.getRedirectMenuLink,
		redirectMenu: redirectStates.redirectMenu,
		hasAccessToRelationMenu: redirectStates.hasAccessToRelationMenu
	}), [summaryStates, redirectStates]);
	return (
		<RelationNavigationContext.Provider value={value}>
			{children}
			{summaryStates.drawer}
			{summaryStates.pickerDrawer}
		</RelationNavigationContext.Provider>
	);
}
export function useRelationNavigation() {
	return useContext(RelationNavigationContext)!;
}
export function RelationNavigationLink(
	{ relationType, relationSource, relationId, fallback, pickerTitle, pickerDescription, relationChoices, className, children, ...props }:
		{ relationType: string, relationSource?: string, children: React.ReactNode } & React.ComponentProps<typeof Link | typeof Button> &
		(
			{ relationId: string, fallback: RelationFallback, pickerTitle?: never, pickerDescription?: never, relationChoices?: never } |
			{ relationId?: never, fallback?: never, pickerTitle: React.ReactNode, pickerDescription?: React.ReactNode, relationChoices: { id: string, name: React.ReactNode, description?: React.ReactNode, fallback: RelationFallback }[] }
		)
) {
	const relationNavigation = useRelationNavigation();
	if(!relationNavigation.hasAccessToRelationMenu(relationType)) {
		return (
			<Button
				{...(props as any)}
				type="button"
				variant="link"
				onClick={() => {
					if(relationId != null) {
						relationNavigation.openDrawer({ relationType, relationId, fallback });
						return;
					}
					relationNavigation.openPickerDrawer({ relationType, pickerTitle, pickerDescription, relationChoices });
				}}
				className="h-auto p-0 text-primary select-auto"
			>
				{children}
			</Button>
		);
	}
	const redirectMenuLink = relationNavigation.getRedirectMenuLink(
		relationId != null ? { relationType, relationSource, relationId } :
			{ relationType, relationSource, relationIds: relationChoices.map(r => r.id) }
	);
	return (
		<Link
			{...(props as any)}
			href={redirectMenuLink}
			onClick={event => {
				event.preventDefault();
				if(!event.altKey) {
					relationNavigation.redirectMenu(
						relationId != null ? { relationType, relationSource, relationId } :
							{ relationType, relationSource, relationIds: relationChoices.map(r => r.id) }
					);
					return;
				}
				if(relationId != null) {
					relationNavigation.openDrawer({ relationType, relationId, fallback });
					return;
				}
				relationNavigation.openPickerDrawer({ relationType, pickerTitle, pickerDescription, relationChoices });
				return;
			}}
			className={cn("text-primary underline underline-offset-2 hover:opacity-80", className)}
		>
			{children}
		</Link>
	);
}

export const defaultRelationUserRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(userId: string | null, row: { id: string }, context: { relationValues?: Record<`users:${string}`, RelationUser> }) => userId == null ? "-" : (userRelation => (
		<RelationNavigationLink
			relationType={userRelation != null && userRelation.stagedUserId != null ? "staged-users" : "users"}
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			relationId={userRelation != null && userRelation.stagedUserId != null ? userRelation.stagedUserId : userId}
			fallback={{
				title: userRelation?.name ?? (<>User <span className="font-mono">{userRelation != null && userRelation.stagedUserId != null ? userRelation.stagedUserId : userId}</span></>),
				description: description,
				fields: [
					{ label: "Id", value: (<span className="font-mono">{userRelation != null && userRelation.stagedUserId != null ? userRelation.stagedUserId : userId}</span>) },
					...(userRelation != null ? [{ label: "Email", value: userRelation.email }] : []),
					...(userRelation != null ? [{ label: "Name", value: userRelation.name }] : [])
				]
			}}
		>
			{userRelation?.name ?? (<>User <span className="font-mono">{userRelation != null && userRelation.stagedUserId != null ? userRelation.stagedUserId : userId}</span></>)}
		</RelationNavigationLink>
	))(context?.relationValues?.[`users:${userId}`]);
export const defaultRelationUsersRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(userIds: string[] | null, row: { id: string }, context: { relationValues?: Record<`users:${string}`, RelationUser> }) => userIds == null || userIds.length == 0 ? "-" : (
		<RelationNavigationLink
			relationType="staged-users"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			pickerTitle="Select users"
			pickerDescription={description}
			relationChoices={userIds.map(userId => (userRelation => userRelation == null || userRelation.stagedUserId == null ? null : ({
				id: userRelation.stagedUserId,
				name: userRelation.name,
				description: userRelation.email,
				fallback: {
					title: userRelation.name,
					description: userRelation.email,
					fields: [
						{ label: "Id", value: (<span className="font-mono">{userRelation.stagedUserId}</span>) },
						{ label: "Email", value: userRelation.email },
						{ label: "Name", value: userRelation.name }
					]
				}
			}))(context?.relationValues?.[`users:${userId}`])).filter(choice => choice != null)}
		>
			{userIds.map((userId, i) => (userRelation => (
				<React.Fragment key={userId}>
					{userRelation?.name ?? (<>User <span className="font-mono">{userId}</span></>)}
					{i != userIds.length - 1 ? ", " : ""}
				</React.Fragment>
			))(context?.relationValues?.[`users:${userId}`]))}
		</RelationNavigationLink>
	);
export const defaultRelationRoleRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(roleId: string | null, row: { id: string }, context: { relationValues?: Record<`roles:${string}`, RelationRole> }) => roleId == null ? "-" : (roleRelation => (
		<RelationNavigationLink
			relationType="roles"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			relationId={roleId}
			fallback={{
				title: roleRelation?.name ?? (<>Role <span className="font-mono">{roleId}</span></>),
				description: description,
				fields: [
					{ label: "Id", value: (<span className="font-mono">{roleId}</span>) },
					...(roleRelation != null ? [{ label: "Name", value: roleRelation.name }] : [])
				]
			}}
		>
			{roleRelation?.name ?? (<>Role <span className="font-mono">{roleId}</span></>)}
		</RelationNavigationLink>
	))(context?.relationValues?.[`roles:${roleId}`]);
export const defaultRelationRolesRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(roleIds: string[] | null, row: { id: string }, context: { relationValues?: Record<`roles:${string}`, RelationRole> }) => roleIds == null || roleIds.length == 0 ? "-" : (
		<RelationNavigationLink
			relationType="roles"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			pickerTitle="Select roles"
			pickerDescription={description}
			relationChoices={roleIds.map(roleId => (roleRelation => ({
				id: roleId,
				name: roleRelation?.name ?? (<>Role <span className="font-mono">{roleId}</span></>),
				fallback: {
					title: roleRelation?.name ?? (<>Role <span className="font-mono">{roleId}</span></>),
					description: description,
					fields: [
						{ label: "Id", value: (<span className="font-mono">{roleId}</span>) },
						...(roleRelation != null ? [{ label: "Name", value: roleRelation.name }] : [])
					]
				}
			}))(context?.relationValues?.[`roles:${roleId}`]))}
		>
			{roleIds.map((roleId, i) => (roleRelation => (
				<React.Fragment key={roleId}>
					{roleRelation?.name ?? (<>Role <span className="font-mono">{roleId}</span></>)}
					{i != roleIds.length - 1 ? ", " : ""}
				</React.Fragment>
			))(context?.relationValues?.[`roles:${roleId}`]))}
		</RelationNavigationLink>
	);
export const defaultRelationTeamRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(teamId: string | null, row: { id: string }, context: { relationValues?: Record<`teams:${string}`, RelationTeam> }) => teamId == null ? "-" : (teamRelation => (
		<RelationNavigationLink
			relationType="teams"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			relationId={teamId}
			fallback={{
				title: teamRelation?.name ?? (<>Team <span className="font-mono">{teamId}</span></>),
				description: description,
				fields: [
					{ label: "Id", value: (<span className="font-mono">{teamId}</span>) },
					...(teamRelation != null ? [{ label: "Name", value: teamRelation.name }] : [])
				]
			}}
		>
			{teamRelation?.name ?? (<>Team <span className="font-mono">{teamId}</span></>)}
		</RelationNavigationLink>
	))(context?.relationValues?.[`teams:${teamId}`]);
export const defaultRelationTeamsRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(teamIds: string[] | null, row: { id: string }, context: { relationValues?: Record<`teams:${string}`, RelationTeam> }) => teamIds == null || teamIds.length == 0 ? "-" : (
		<RelationNavigationLink
			relationType="teams"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			pickerTitle="Select teams"
			pickerDescription={description}
			relationChoices={teamIds.map(teamId => (teamRelation => ({
				id: teamId,
				name: teamRelation?.name ?? (<>Team <span className="font-mono">{teamId}</span></>),
				fallback: {
					title: teamRelation?.name ?? (<>Team <span className="font-mono">{teamId}</span></>),
					description: description,
					fields: [
						{ label: "Id", value: (<span className="font-mono">{teamId}</span>) },
						...(teamRelation != null ? [{ label: "Name", value: teamRelation.name }] : [])
					]
				}
			}))(context?.relationValues?.[`teams:${teamId}`]))}
		>
			{teamIds.map((teamId, i) => (teamRelation => (
				<React.Fragment key={teamId}>
					{teamRelation?.name ?? (<>Team <span className="font-mono">{teamId}</span></>)}
					{i != teamIds.length - 1 ? ", " : ""}
				</React.Fragment>
			))(context?.relationValues?.[`teams:${teamId}`]))}
		</RelationNavigationLink>
	);
export const defaultRelationAccessRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(accessId: string | null, row: { id: string }, context: { relationValues?: Record<`accesses:${string}`, RelationAccess> }) => accessId == null ? "-" : (accessRelation => (
		<RelationNavigationLink
			relationType="accesses"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			relationId={accessId}
			fallback={{
				title: accessRelation?.name ?? (<>Access <span className="font-mono">{accessId}</span></>),
				description: description,
				fields: [
					{ label: "Id", value: (<span className="font-mono">{accessId}</span>) },
					...(accessRelation != null ? [{ label: "Name", value: accessRelation.name }] : [])
				]
			}}
		>
			{accessRelation?.name ?? (<>Access <span className="font-mono">{accessId}</span></>)}
		</RelationNavigationLink>
	))(context?.relationValues?.[`accesses:${accessId}`]);
export const defaultRelationAccessesRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(accessIds: string[] | null, row: { id: string }, context: { relationValues?: Record<`accesses:${string}`, RelationAccess> }) => accessIds == null || accessIds.length == 0 ? "-" : (
		<RelationNavigationLink
			relationType="accesses"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			pickerTitle="Select accesses"
			pickerDescription={description}
			relationChoices={accessIds.map(accessId => (accessRelation => ({
				id: accessId,
				name: accessRelation?.name ?? (<>Access <span className="font-mono">{accessId}</span></>),
				fallback: {
					title: accessRelation?.name ?? (<>Access <span className="font-mono">{accessId}</span></>),
					description: description,
					fields: [
						{ label: "Id", value: (<span className="font-mono">{accessId}</span>) },
						...(accessRelation != null ? [{ label: "Name", value: accessRelation.name }] : [])
					]
				}
			}))(context?.relationValues?.[`accesses:${accessId}`]))}
		>
			{accessIds.map((accessId, i) => (accessRelation => (
				<React.Fragment key={accessId}>
					{accessRelation?.name ?? (<>Access <span className="font-mono">{accessId}</span></>)}
					{i != accessIds.length - 1 ? ", " : ""}
				</React.Fragment>
			))(context?.relationValues?.[`accesses:${accessId}`]))}
		</RelationNavigationLink>
	);
export const defaultRelationCreditApplicationRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(creditApplicationId: string | null, row: { id: string }, context: { relationValues?: Record<`credit-applications:${string}`, RelationCreditApplication> }) => creditApplicationId == null ? "-" : (creditApplicationRelation => (
		<RelationNavigationLink
			relationType="credit-applications"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			relationId={creditApplicationId}
			fallback={{
				title: creditApplicationRelation?.name ?? (<>Credit Application <span className="font-mono">{creditApplicationId}</span></>),
				description: description,
				fields: [
					{ label: "Id", value: (<span className="font-mono">{creditApplicationId}</span>) },
					...(creditApplicationRelation != null ? [{ label: "Name", value: creditApplicationRelation.name }] : []),
					...(creditApplicationRelation != null ? [{ label: "Email", value: creditApplicationRelation.email }] : [])
				]
			}}
		>
			{creditApplicationRelation?.name ?? (<>Credit Application <span className="font-mono">{creditApplicationId}</span></>)}
		</RelationNavigationLink>
	))(context?.relationValues?.[`credit-applications:${creditApplicationId}`]);
export const defaultRelationCreditApplicationsRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(creditApplicationIds: string[] | null, row: { id: string }, context: { relationValues?: Record<`credit-applications:${string}`, RelationCreditApplication> }) => creditApplicationIds == null || creditApplicationIds.length == 0 ? "-" : (
		<RelationNavigationLink
			relationType="credit-applications"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			pickerTitle="Select credit applications"
			pickerDescription={description}
			relationChoices={creditApplicationIds.map(creditApplicationId => (creditApplicationRelation => ({
				id: creditApplicationId,
				name: creditApplicationRelation?.name ?? (<>Credit Application <span className="font-mono">{creditApplicationId}</span></>),
				description: creditApplicationRelation?.email,
				fallback: {
					title: creditApplicationRelation?.name ?? (<>Credit Application <span className="font-mono">{creditApplicationId}</span></>),
					description: description,
					fields: [
						{ label: "Id", value: (<span className="font-mono">{creditApplicationId}</span>) },
						...(creditApplicationRelation != null ? [{ label: "Name", value: creditApplicationRelation.name }] : []),
						...(creditApplicationRelation != null ? [{ label: "Email", value: creditApplicationRelation.email }] : [])
					]
				}
			}))(context?.relationValues?.[`credit-applications:${creditApplicationId}`]))}
		>
			{creditApplicationIds.map((creditApplicationId, i) => (creditApplicationRelation => (
				<React.Fragment key={creditApplicationId}>
					{creditApplicationRelation?.name ?? (<>Credit Application <span className="font-mono">{creditApplicationId}</span></>)}
					{i != creditApplicationIds.length - 1 ? ", " : ""}
				</React.Fragment>
			))(context?.relationValues?.[`credit-applications:${creditApplicationId}`]))}
		</RelationNavigationLink>
	);
export const defaultRelationCreditApplicationImportRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(creditApplicationImportId: string | null, row: { id: string }, context: { relationValues?: Record<`credit-application-imports:${string}`, RelationCreditApplicationImport> }) => creditApplicationImportId == null ? "-" : (creditApplicationImportRelation => (
		<RelationNavigationLink
			relationType="credit-application-imports"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			relationId={creditApplicationImportId}
			fallback={{
				title: creditApplicationImportRelation?.filename ?? (<>Credit Application Import <span className="font-mono">{creditApplicationImportId}</span></>),
				description: description,
				fields: [
					{ label: "Id", value: (<span className="font-mono">{creditApplicationImportId}</span>) },
					...(creditApplicationImportRelation != null ? [{ label: "File Name", value: creditApplicationImportRelation.filename }] : []),
					...(creditApplicationImportRelation != null ? [{ label: "File Size", value: creditApplicationImportRelation.filesize }] : []),
					...(creditApplicationImportRelation != null ? [{ label: "Mime Type", value: creditApplicationImportRelation.mimeType }] : [])
				]
			}}
		>
			{creditApplicationImportRelation?.filename ?? (<>Credit Application Import <span className="font-mono">{creditApplicationImportId}</span></>)}
		</RelationNavigationLink>
	))(context?.relationValues?.[`credit-application-imports:${creditApplicationImportId}`]);
export const defaultRelationCreditApplicationImportsRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(creditApplicationImportIds: string[] | null, row: { id: string }, context: { relationValues?: Record<`credit-application-imports:${string}`, RelationCreditApplicationImport> }) => creditApplicationImportIds == null || creditApplicationImportIds.length == 0 ? "-" : (
		<RelationNavigationLink
			relationType="credit-application-imports"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			pickerTitle="Select credit application imports"
			pickerDescription={description}
			relationChoices={creditApplicationImportIds.map(creditApplicationImportId => (creditApplicationImportRelation => ({
				id: creditApplicationImportId,
				name: creditApplicationImportRelation?.filename ?? (<>Credit Application Import <span className="font-mono">{creditApplicationImportId}</span></>),
				fallback: {
					title: creditApplicationImportRelation?.filename ?? (<>Credit Application Import <span className="font-mono">{creditApplicationImportId}</span></>),
					description: description,
					fields: [
						{ label: "Id", value: (<span className="font-mono">{creditApplicationImportId}</span>) },
						...(creditApplicationImportRelation != null ? [{ label: "File Name", value: creditApplicationImportRelation.filename }] : []),
						...(creditApplicationImportRelation != null ? [{ label: "File Size", value: creditApplicationImportRelation.filesize }] : []),
						...(creditApplicationImportRelation != null ? [{ label: "Mime Type", value: creditApplicationImportRelation.mimeType }] : [])
					]
				}
			}))(context?.relationValues?.[`credit-application-imports:${creditApplicationImportId}`]))}
		>
			{creditApplicationImportIds.map((creditApplicationImportId, i) => (creditApplicationImportRelation => (
				<React.Fragment key={creditApplicationImportId}>
					{creditApplicationImportRelation?.filename ?? (<>Credit Application Import <span className="font-mono">{creditApplicationImportId}</span></>)}
					{i != creditApplicationImportIds.length - 1 ? ", " : ""}
				</React.Fragment>
			))(context?.relationValues?.[`credit-application-imports:${creditApplicationImportId}`]))}
		</RelationNavigationLink>
	);
export const defaultRelationCreditApplicationAssignmentRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(creditApplicationAssignmentId: string | null, row: { id: string }, context: { relationValues?: Record<`credit-application-assignments:${string}`, RelationCreditApplicationAssignment> }) => creditApplicationAssignmentId == null ? "-" : (creditApplicationAssignmentRelation => (
		<RelationNavigationLink
			relationType="credit-application-assignments"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			relationId={creditApplicationAssignmentId}
			fallback={{
				title: creditApplicationAssignmentRelation?._ ?? (<>Credit Application Assignment <span className="font-mono">{creditApplicationAssignmentId}</span></>),
				description: description,
				fields: [
					{ label: "Id", value: (<span className="font-mono">{creditApplicationAssignmentId}</span>) }
				]
			}}
		>
			{creditApplicationAssignmentRelation?._ ?? (<>Credit Application Assignment <span className="font-mono">{creditApplicationAssignmentId}</span></>)}
		</RelationNavigationLink>
	))(context?.relationValues?.[`credit-application-assignments:${creditApplicationAssignmentId}`]);
export const defaultRelationCreditApplicationAssignmentsRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(creditApplicationAssignmentIds: string[] | null, row: { id: string }, context: { relationValues?: Record<`credit-application-assignments:${string}`, RelationCreditApplicationAssignment> }) => creditApplicationAssignmentIds == null || creditApplicationAssignmentIds.length == 0 ? "-" : (
		<RelationNavigationLink
			relationType="credit-application-assignments"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			pickerTitle="Select credit application assignments"
			pickerDescription={description}
			relationChoices={creditApplicationAssignmentIds.map(creditApplicationAssignmentId => (creditApplicationAssignmentRelation => ({
				id: creditApplicationAssignmentId,
				name: creditApplicationAssignmentRelation?._ ?? (<>Credit Application Assignment <span className="font-mono">{creditApplicationAssignmentId}</span></>),
				fallback: {
					title: creditApplicationAssignmentRelation?._ ?? (<>Credit Application Assignment <span className="font-mono">{creditApplicationAssignmentId}</span></>),
					description: description,
					fields: [
						{ label: "Id", value: (<span className="font-mono">{creditApplicationAssignmentId}</span>) }
					]
				}
			}))(context?.relationValues?.[`credit-application-assignments:${creditApplicationAssignmentId}`]))}
		>
			{creditApplicationAssignmentIds.map((creditApplicationAssignmentId, i) => (creditApplicationAssignmentRelation => (
				<React.Fragment key={creditApplicationAssignmentId}>
					{creditApplicationAssignmentRelation?._ ?? (<>Credit Application Assignment <span className="font-mono">{creditApplicationAssignmentId}</span></>)}
					{i != creditApplicationAssignmentIds.length - 1 ? ", " : ""}
				</React.Fragment>
			))(context?.relationValues?.[`credit-application-assignments:${creditApplicationAssignmentId}`]))}
		</RelationNavigationLink>
	);
export const defaultRelationOfficerTaskRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(officerTaskId: string | null, row: { id: string }, context: { relationValues?: Record<`officer-tasks:${string}`, RelationOfficerTask> }) => officerTaskId == null ? "-" : (officerTaskRelation => (
		<RelationNavigationLink
			relationType="officer-tasks"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			relationId={officerTaskId}
			fallback={{
				title: officerTaskRelation?._ ?? (<>Officer Task <span className="font-mono">{officerTaskId}</span></>),
				description: description,
				fields: [
					{ label: "Id", value: (<span className="font-mono">{officerTaskId}</span>) }
				]
			}}
		>
			{officerTaskRelation?._ ?? (<>Officer Task <span className="font-mono">{officerTaskId}</span></>)}
		</RelationNavigationLink>
	))(context?.relationValues?.[`officer-tasks:${officerTaskId}`]);
export const defaultRelationOfficerTasksRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(officerTaskIds: string[] | null, row: { id: string }, context: { relationValues?: Record<`officer-tasks:${string}`, RelationOfficerTask> }) => officerTaskIds == null || officerTaskIds.length == 0 ? "-" : (
		<RelationNavigationLink
			relationType="officer-tasks"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			pickerTitle="Select officer tasks"
			pickerDescription={description}
			relationChoices={officerTaskIds.map(officerTaskId => (officerTaskRelation => ({
				id: officerTaskId,
				name: officerTaskRelation?._ ?? (<>Officer Task <span className="font-mono">{officerTaskId}</span></>),
				fallback: {
					title: officerTaskRelation?._ ?? (<>Officer Task <span className="font-mono">{officerTaskId}</span></>),
					description: description,
					fields: [
						{ label: "Id", value: (<span className="font-mono">{officerTaskId}</span>) }
					]
				}
			}))(context?.relationValues?.[`officer-tasks:${officerTaskId}`]))}
		>
			{officerTaskIds.map((officerTaskId, i) => (officerTaskRelation => (
				<React.Fragment key={officerTaskId}>
					{officerTaskRelation?._ ?? (<>Officer Task <span className="font-mono">{officerTaskId}</span></>)}
					{i != officerTaskIds.length - 1 ? ", " : ""}
				</React.Fragment>
			))(context?.relationValues?.[`officer-tasks:${officerTaskId}`]))}
		</RelationNavigationLink>
	);
export const defaultRelationSurveyRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(surveyId: string | null, row: { id: string }, context: { relationValues?: Record<`surveys:${string}`, RelationSurvey> }) => surveyId == null ? "-" : (surveyRelation => (
		<RelationNavigationLink
			relationType="surveys"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			relationId={surveyId}
			fallback={{
				title: surveyRelation?.title ?? (<>Survey <span className="font-mono">{surveyId}</span></>),
				description: description,
				fields: [
					{ label: "Id", value: (<span className="font-mono">{surveyId}</span>) },
					...(surveyRelation != null ? [{ label: "Title", value: surveyRelation.title }] : [])
				]
			}}
		>
			{surveyRelation?.title ?? (<>Survey <span className="font-mono">{surveyId}</span></>)}
		</RelationNavigationLink>
	))(context?.relationValues?.[`surveys:${surveyId}`]);
export const defaultRelationSurveysRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(surveyIds: string[] | null, row: { id: string }, context: { relationValues?: Record<`surveys:${string}`, RelationSurvey> }) => surveyIds == null || surveyIds.length == 0 ? "-" : (
		<RelationNavigationLink
			relationType="surveys"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			pickerTitle="Select surveys"
			pickerDescription={description}
			relationChoices={surveyIds.map(surveyId => (surveyRelation => ({
				id: surveyId,
				name: surveyRelation?.title ?? (<>Survey <span className="font-mono">{surveyId}</span></>),
				fallback: {
					title: surveyRelation?.title ?? (<>Survey <span className="font-mono">{surveyId}</span></>),
					description: description,
					fields: [
						{ label: "Id", value: (<span className="font-mono">{surveyId}</span>) },
						...(surveyRelation != null ? [{ label: "Title", value: surveyRelation.title }] : [])
					]
				}
			}))(context?.relationValues?.[`surveys:${surveyId}`]))}
		>
			{surveyIds.map((surveyId, i) => (surveyRelation => (
				<React.Fragment key={surveyId}>
					{surveyRelation?.title ?? (<>Survey <span className="font-mono">{surveyId}</span></>)}
					{i != surveyIds.length - 1 ? ", " : ""}
				</React.Fragment>
			))(context?.relationValues?.[`surveys:${surveyId}`]))}
		</RelationNavigationLink>
	);
export const defaultRelationSurveyResultRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(surveyResultId: string | null, row: { id: string }, context: { relationValues?: Record<`survey-results:${string}`, RelationSurveyResult> }) => surveyResultId == null ? "-" : (surverResultRelation => (
		<RelationNavigationLink
			relationType="survey-results"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			relationId={surveyResultId}
			fallback={{
				title: surverResultRelation?._ ?? (<>Survey Result <span className="font-mono">{surveyResultId}</span></>),
				description: description,
				fields: [
					{ label: "Id", value: (<span className="font-mono">{surveyResultId}</span>) }
				]
			}}
		>
			{surverResultRelation?._ ?? (<>Survey Result <span className="font-mono">{surveyResultId}</span></>)}
		</RelationNavigationLink>
	))(context?.relationValues?.[`survey-results:${surveyResultId}`]);
export const defaultRelationSurveyResultsRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(surveyResultIds: string[] | null, row: { id: string }, context: { relationValues?: Record<`survey-results:${string}`, RelationSurveyResult> }) => surveyResultIds == null || surveyResultIds.length == 0 ? "-" : (
		<RelationNavigationLink
			relationType="survey-results"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			pickerTitle="Select survey results"
			pickerDescription={description}
			relationChoices={surveyResultIds.map(surveyResultId => (surverResultRelation => ({
				id: surveyResultId,
				name: surverResultRelation?._ ?? (<>Survey Result <span className="font-mono">{surveyResultId}</span></>),
				fallback: {
					title: surverResultRelation?._ ?? (<>Survey Result <span className="font-mono">{surveyResultId}</span></>),
					description: description,
					fields: [
						{ label: "Id", value: (<span className="font-mono">{surveyResultId}</span>) }
					]
				}
			}))(context?.relationValues?.[`survey-results:${surveyResultId}`]))}
		>
			{surveyResultIds.map((surveyResultId, i) => (surverResultRelation => (
				<React.Fragment key={surveyResultId}>
					{surverResultRelation?._ ?? (<>Survey Result <span className="font-mono">{surveyResultId}</span></>)}
					{i != surveyResultIds.length - 1 ? ", " : ""}
				</React.Fragment>
			))(context?.relationValues?.[`survey-results:${surveyResultId}`]))}
		</RelationNavigationLink>
	);
export const defaultRelationSatisfactionSurveyRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(satisfactionSurveyId: string | null, row: { id: string }, context: { relationValues?: Record<`satisfaction-surveys:${string}`, RelationSatisfactionSurvey> }) => satisfactionSurveyId == null ? "-" : (satisfactionSurveyRelation => (
		<RelationNavigationLink
			relationType="satisfaction-surveys"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			relationId={satisfactionSurveyId}
			fallback={{
				title: satisfactionSurveyRelation?.title ?? (<>Satisfaction Survey <span className="font-mono">{satisfactionSurveyId}</span></>),
				description: description,
				fields: [
					{ label: "Id", value: (<span className="font-mono">{satisfactionSurveyId}</span>) },
					...(satisfactionSurveyRelation != null ? [{ label: "Title", value: satisfactionSurveyRelation.title }] : [])
				]
			}}
		>
			{satisfactionSurveyRelation?.title ?? (<>Satisfaction Survey <span className="font-mono">{satisfactionSurveyId}</span></>)}
		</RelationNavigationLink>
	))(context?.relationValues?.[`satisfaction-surveys:${satisfactionSurveyId}`]);
export const defaultRelationSatisfactionSurveysRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(satisfactionSurveyIds: string[] | null, row: { id: string }, context: { relationValues?: Record<`satisfaction-surveys:${string}`, RelationSatisfactionSurvey> }) => satisfactionSurveyIds == null || satisfactionSurveyIds.length == 0 ? "-" : (
		<RelationNavigationLink
			relationType="satisfaction-surveys"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			pickerTitle="Select satisfaction surveys"
			pickerDescription={description}
			relationChoices={satisfactionSurveyIds.map(satisfactionSurveyId => (satisfactionSurveyRelation => ({
				id: satisfactionSurveyId,
				name: satisfactionSurveyRelation?.title ?? (<>Satisfaction Survey <span className="font-mono">{satisfactionSurveyId}</span></>),
				fallback: {
					title: satisfactionSurveyRelation?.title ?? (<>Satisfaction Survey <span className="font-mono">{satisfactionSurveyId}</span></>),
					description: description,
					fields: [
						{ label: "Id", value: (<span className="font-mono">{satisfactionSurveyId}</span>) },
						...(satisfactionSurveyRelation != null ? [{ label: "Title", value: satisfactionSurveyRelation.title }] : [])
					]
				}
			}))(context?.relationValues?.[`satisfaction-surveys:${satisfactionSurveyId}`]))}
		>
			{satisfactionSurveyIds.map((satisfactionSurveyId, i) => (satisfactionSurveyRelation => (
				<React.Fragment key={satisfactionSurveyId}>
					{satisfactionSurveyRelation?.title ?? (<>Satisfaction Survey <span className="font-mono">{satisfactionSurveyId}</span></>)}
					{i != satisfactionSurveyIds.length - 1 ? ", " : ""}
				</React.Fragment>
			))(context?.relationValues?.[`satisfaction-surveys:${satisfactionSurveyId}`]))}
		</RelationNavigationLink>
	);
export const defaultRelationSatisfactionSurveyResultRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(satisfactionSurveyResultId: string | null, row: { id: string }, context: { relationValues?: Record<`survey-results:${string}`, RelationSatisfactionSurveyResult> }) => satisfactionSurveyResultId == null ? "-" : (surverResultRelation => (
		<RelationNavigationLink
			relationType="satisfaction-survey-results"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			relationId={satisfactionSurveyResultId}
			fallback={{
				title: surverResultRelation?._ ?? (<>Satisfaction Survey Result <span className="font-mono">{satisfactionSurveyResultId}</span></>),
				description: description,
				fields: [
					{ label: "Id", value: (<span className="font-mono">{satisfactionSurveyResultId}</span>) }
				]
			}}
		>
			{surverResultRelation?._ ?? (<>Satisfaction Survey Result <span className="font-mono">{satisfactionSurveyResultId}</span></>)}
		</RelationNavigationLink>
	))(context?.relationValues?.[`satisfaction-survey-results:${satisfactionSurveyResultId}`]);
export const defaultRelationSatisfactionSurveyResultsRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(satisfactionSurveyResultIds: string[] | null, row: { id: string }, context: { relationValues?: Record<`satisfaction-survey-results:${string}`, RelationSatisfactionSurveyResult> }) => satisfactionSurveyResultIds == null || satisfactionSurveyResultIds.length == 0 ? "-" : (
		<RelationNavigationLink
			relationType="satisfaction-survey-results"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			pickerTitle="Select satisfaction survey results"
			pickerDescription={description}
			relationChoices={satisfactionSurveyResultIds.map(satisfactionSurveyResultId => (surverResultRelation => ({
				id: satisfactionSurveyResultId,
				name: surverResultRelation?._ ?? (<>Satisfaction Survey Result <span className="font-mono">{satisfactionSurveyResultId}</span></>),
				fallback: {
					title: surverResultRelation?._ ?? (<>Satisfaction Survey Result <span className="font-mono">{satisfactionSurveyResultId}</span></>),
					description: description,
					fields: [
						{ label: "Id", value: (<span className="font-mono">{satisfactionSurveyResultId}</span>) }
					]
				}
			}))(context?.relationValues?.[`satisfaction-survey-results:${satisfactionSurveyResultId}`]))}
		>
			{satisfactionSurveyResultIds.map((satisfactionSurveyResultId, i) => (surverResultRelation => (
				<React.Fragment key={satisfactionSurveyResultId}>
					{surverResultRelation?._ ?? (<>Satisfaction Survey Result <span className="font-mono">{satisfactionSurveyResultId}</span></>)}
					{i != satisfactionSurveyResultIds.length - 1 ? ", " : ""}
				</React.Fragment>
			))(context?.relationValues?.[`satisfaction-survey-results:${satisfactionSurveyResultId}`]))}
		</RelationNavigationLink>
	);
export const defaultRelationLoginLogRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(loginLogId: string | null, row: { id: string }, context: { relationValues?: Record<`login-logs:${string}`, RelationLoginLog> }) => loginLogId == null ? "-" : (loginLogRelation => (
		<RelationNavigationLink
			relationType="login-logs"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			relationId={loginLogId}
			fallback={{
				title: loginLogRelation?.createdAt ?? (<>Login Log <span className="font-mono">{loginLogId}</span></>),
				description: description,
				fields: [
					{ label: "Id", value: (<span className="font-mono">{loginLogId}</span>) },
					...(loginLogRelation != null ? [{ label: "Created At", value: loginLogRelation.createdAt }] : [])
				]
			}}
		>
			{loginLogRelation?.createdAt ?? (<>Login Log <span className="font-mono">{loginLogId}</span></>)}
		</RelationNavigationLink>
	))(context?.relationValues?.[`login-logs:${loginLogId}`]);
export const defaultRelationLoginLogsRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(loginLogIds: string[] | null, row: { id: string }, context: { relationValues?: Record<`login-logs:${string}`, RelationLoginLog> }) => loginLogIds == null || loginLogIds.length == 0 ? "-" : (
		<RelationNavigationLink
			relationType="login-logs"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			pickerTitle="Select login logs"
			pickerDescription={description}
			relationChoices={loginLogIds.map(loginLogId => (loginLogRelation => ({
				id: loginLogId,
				name: loginLogRelation?.createdAt ?? (<>Login Log <span className="font-mono">{loginLogId}</span></>),
				description: loginLogRelation?.createdAt,
				fallback: {
					title: loginLogRelation?.createdAt ?? (<>Login Log <span className="font-mono">{loginLogId}</span></>),
					description: description,
					fields: [
						{ label: "Id", value: (<span className="font-mono">{loginLogId}</span>) },
						...(loginLogRelation != null ? [{ label: "Created At", value: loginLogRelation.createdAt }] : [])
					]
				}
			}))(context?.relationValues?.[`login-logs:${loginLogId}`]))}
		>
			{loginLogIds.map((loginLogId, i) => (loginLogRelation => (
				<React.Fragment key={loginLogId}>
					{loginLogRelation?.createdAt ?? (<>Login Log <span className="font-mono">{loginLogId}</span></>)}
					{i != loginLogIds.length - 1 ? ", " : ""}
				</React.Fragment>
			))(context?.relationValues?.[`login-logs:${loginLogId}`]))}
		</RelationNavigationLink>
	);
export const defaultRelationGpsLogRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(gpsLogId: string | null, row: { id: string }, context: { relationValues?: Record<`gps-logs:${string}`, RelationGpsLog> }) => gpsLogId == null ? "-" : (gpsLogRelation => (
		<RelationNavigationLink
			relationType="gps-logs"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			relationId={gpsLogId}
			fallback={{
				title: gpsLogRelation?.createdAt ?? (<>GPS Log <span className="font-mono">{gpsLogId}</span></>),
				description: description,
				fields: [
					{ label: "Id", value: (<span className="font-mono">{gpsLogId}</span>) },
					...(gpsLogRelation != null ? [{ label: "Created At", value: gpsLogRelation.createdAt }] : [])
				]
			}}
		>
			{gpsLogRelation?.createdAt ?? (<>GPS Log <span className="font-mono">{gpsLogId}</span></>)}
		</RelationNavigationLink>
	))(context?.relationValues?.[`gps-logs:${gpsLogId}`]);
export const defaultRelationGpsLogsRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(gpsLogIds: string[] | null, row: { id: string }, context: { relationValues?: Record<`gps-logs:${string}`, RelationGpsLog> }) => gpsLogIds == null || gpsLogIds.length == 0 ? "-" : (
		<RelationNavigationLink
			relationType="gps-logs"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			pickerTitle="Select GPS logs"
			pickerDescription={description}
			relationChoices={gpsLogIds.map(gpsLogId => (gpsLogRelation => ({
				id: gpsLogId,
				name: gpsLogRelation?.createdAt ?? (<>GPS Log <span className="font-mono">{gpsLogId}</span></>),
				description: gpsLogRelation?.createdAt,
				fallback: {
					title: gpsLogRelation?.createdAt ?? (<>GPS Log <span className="font-mono">{gpsLogId}</span></>),
					description: description,
					fields: [
						{ label: "Id", value: (<span className="font-mono">{gpsLogId}</span>) },
						...(gpsLogRelation != null ? [{ label: "Created At", value: gpsLogRelation.createdAt }] : [])
					]
				}
			}))(context?.relationValues?.[`gps-logs:${gpsLogId}`]))}
		>
			{gpsLogIds.map((gpsLogId, i) => (gpsLogRelation => (
				<React.Fragment key={gpsLogId}>
					{gpsLogRelation?.createdAt ?? (<>GPS Log <span className="font-mono">{gpsLogId}</span></>)}
					{i != gpsLogIds.length - 1 ? ", " : ""}
				</React.Fragment>
			))(context?.relationValues?.[`gps-logs:${gpsLogId}`]))}
		</RelationNavigationLink>
	);
export const defaultRelationMessageLogRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(messageLogId: string | null, row: { id: string }, context: { relationValues?: Record<`message-logs:${string}`, RelationMessageLog> }) => messageLogId == null ? "-" : (messageLogRelation => (
		<RelationNavigationLink
			relationType="message-logs"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			relationId={messageLogId}
			fallback={{
				title: messageLogRelation?.createdAt ?? (<>Message Log <span className="font-mono">{messageLogId}</span></>),
				description: description,
				fields: [
					{ label: "Id", value: (<span className="font-mono">{messageLogId}</span>) },
					...(messageLogRelation != null ? [{ label: "Created At", value: messageLogRelation.createdAt }] : [])
				]
			}}
		>
			{messageLogRelation?.createdAt ?? (<>Message Log <span className="font-mono">{messageLogId}</span></>)}
		</RelationNavigationLink>
	))(context?.relationValues?.[`message-logs:${messageLogId}`]);
export const defaultRelationMessageLogsRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(messageLogIds: string[] | null, row: { id: string }, context: { relationValues?: Record<`message-logs:${string}`, RelationMessageLog> }) => messageLogIds == null || messageLogIds.length == 0 ? "-" : (
		<RelationNavigationLink
			relationType="message-logs"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			pickerTitle="Select message logs"
			pickerDescription={description}
			relationChoices={messageLogIds.map(messageLogId => (messageLogRelation => ({
				id: messageLogId,
				name: messageLogRelation?.createdAt ?? (<>Message Log <span className="font-mono">{messageLogId}</span></>),
				description: messageLogRelation?.createdAt,
				fallback: {
					title: messageLogRelation?.createdAt ?? (<>Message Log <span className="font-mono">{messageLogId}</span></>),
					description: description,
					fields: [
						{ label: "Id", value: (<span className="font-mono">{messageLogId}</span>) },
						...(messageLogRelation != null ? [{ label: "Created At", value: messageLogRelation.createdAt }] : [])
					]
				}
			}))(context?.relationValues?.[`message-logs:${messageLogId}`]))}
		>
			{messageLogIds.map((messageLogId, i) => (messageLogRelation => (
				<React.Fragment key={messageLogId}>
					{messageLogRelation?.createdAt ?? (<>Message Log <span className="font-mono">{messageLogId}</span></>)}
					{i != messageLogIds.length - 1 ? ", " : ""}
				</React.Fragment>
			))(context?.relationValues?.[`message-logs:${messageLogId}`]))}
		</RelationNavigationLink>
	);
export const defaultRelationRecordingLogRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(recordingLogId: string | null, row: { id: string }, context: { relationValues?: Record<`recording-logs:${string}`, RelationRecordingLog> }) => recordingLogId == null ? "-" : (recordingLogRelation => (
		<RelationNavigationLink
			relationType="recording-logs"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			relationId={recordingLogId}
			fallback={{
				title: recordingLogRelation?.createdAt ?? (<>Recording Log <span className="font-mono">{recordingLogId}</span></>),
				description: description,
				fields: [
					{ label: "Id", value: (<span className="font-mono">{recordingLogId}</span>) },
					...(recordingLogRelation != null ? [{ label: "Created At", value: recordingLogRelation.createdAt }] : [])
				]
			}}
		>
			{recordingLogRelation?.createdAt ?? (<>Recording Log <span className="font-mono">{recordingLogId}</span></>)}
		</RelationNavigationLink>
	))(context?.relationValues?.[`recording-logs:${recordingLogId}`]);
export const defaultRelationRecordingLogsRenderer = ({ description, relationSource }: { description: React.ReactNode, relationSource?: string }) =>
	(recordingLogIds: string[] | null, row: { id: string }, context: { relationValues?: Record<`recording-logs:${string}`, RelationRecordingLog> }) => recordingLogIds == null || recordingLogIds.length == 0 ? "-" : (
		<RelationNavigationLink
			relationType="recording-logs"
			relationSource={relationSource != null ? `${relationSource}:${row.id}` : undefined}
			pickerTitle="Select recording logs"
			pickerDescription={description}
			relationChoices={recordingLogIds.map(recordingLogId => (recordingLogRelation => ({
				id: recordingLogId,
				name: recordingLogRelation?.createdAt ?? (<>Recording Log <span className="font-mono">{recordingLogId}</span></>),
				description: recordingLogRelation?.createdAt,
				fallback: {
					title: recordingLogRelation?.createdAt ?? (<>Recording Log <span className="font-mono">{recordingLogId}</span></>),
					description: description,
					fields: [
						{ label: "Id", value: (<span className="font-mono">{recordingLogId}</span>) },
						...(recordingLogRelation != null ? [{ label: "Created At", value: recordingLogRelation.createdAt }] : [])
					]
				}
			}))(context?.relationValues?.[`recording-logs:${recordingLogId}`]))}
		>
			{recordingLogIds.map((recordingLogId, i) => (recordingLogRelation => (
				<React.Fragment key={recordingLogId}>
					{recordingLogRelation?.createdAt ?? (<>Recording Log <span className="font-mono">{recordingLogId}</span></>)}
					{i != recordingLogIds.length - 1 ? ", " : ""}
				</React.Fragment>
			))(context?.relationValues?.[`recording-logs:${recordingLogId}`]))}
		</RelationNavigationLink>
	);
