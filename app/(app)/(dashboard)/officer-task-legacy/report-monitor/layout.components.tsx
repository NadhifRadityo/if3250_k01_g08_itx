"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RouteIcon, MapPinIcon, SearchIcon, Loader2Icon, CalendarIcon, ListChecksIcon, CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Badge } from "@/components/radix/Badge";
import { Button } from "@/components/radix/Button";
import { Card, CardContent } from "@/components/radix/Card";
import { Drawer, DrawerTitle, DrawerHeader, DrawerContent, DrawerDescription } from "@/components/radix/Drawer";
import { Input } from "@/components/radix/Input";
import { Table, TableRow, TableBody, TableCell, TableHead, TableHeader } from "@/components/radix/Table";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "@/components/radix/Tabs";

import { MenuPage } from "../../layout.components";
import * as reportActions from "./layout.actions";

type TasklistRow = reportActions.OfficerTasklistRow;
type LocationPoint = reportActions.OfficerLocationPoint;
type OfficerTaskViewMode = "combined" | "monitoring" | "reporting";
const MAX_MAPS_URL_ROUTE_POINTS = 11;

function formatDateInput(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function getDefaultDateFrom(): string {
	const date = new Date();
	date.setDate(date.getDate() - 30);
	return formatDateInput(date);
}

function formatDateTime(value: string | null): string {
	if(value == null)
		return "-";
	const date = new Date(value);
	if(Number.isNaN(date.getTime()))
		return "-";
	return `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

function formatDate(value: string | null): string {
	if(value == null)
		return "-";
	const date = new Date(value);
	if(Number.isNaN(date.getTime()))
		return value;
	return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function mapsHref(location: LocationPoint): string {
	return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
}

function sampleRouteLocations(locations: LocationPoint[]): LocationPoint[] {
	if(locations.length <= MAX_MAPS_URL_ROUTE_POINTS)
		return locations;

	const sampledLocations: LocationPoint[] = [];
	for(let index = 0; index < MAX_MAPS_URL_ROUTE_POINTS; index++) {
		const sourceIndex = Math.round((index * (locations.length - 1)) / (MAX_MAPS_URL_ROUTE_POINTS - 1));
		const location = locations[sourceIndex];
		if(location != null && sampledLocations[sampledLocations.length - 1] != location)
			sampledLocations.push(location);
	}
	return sampledLocations;
}

function mapsRouteHref(locations: LocationPoint[]): string {
	const validLocations = sampleRouteLocations(locations.filter(location => Number.isFinite(location.latitude) && Number.isFinite(location.longitude)));
	if(validLocations.length == 0)
		return "https://www.google.com/maps";
	if(validLocations.length == 1)
		return mapsHref(validLocations[0]);

	const origin = validLocations[0];
	const destination = validLocations[validLocations.length - 1];
	const waypoints = validLocations.slice(1, -1).map(location => `${location.latitude},${location.longitude}`).join("|");
	const params = new URLSearchParams({
		api: "1",
		origin: `${origin.latitude},${origin.longitude}`,
		destination: `${destination.latitude},${destination.longitude}`,
		travelmode: "driving"
	});
	if(waypoints.length > 0)
		params.set("waypoints", waypoints);
	return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function LocationButton({ location, label = "Location" }: { location: LocationPoint | null, label?: string }) {
	if(location == null) {
		return (
			<Button type="button" variant="outline" size="icon-sm" disabled title="Location unavailable">
				<MapPinIcon />
			</Button>
		);
	}

	return (
		<Button type="button" variant="outline" size="icon-sm" asChild title={`${label}: ${location.latitude}, ${location.longitude}`}>
			<a href={mapsHref(location)} target="_blank" rel="noreferrer">
				<MapPinIcon />
			</a>
		</Button>
	);
}

function TrackingRouteButton({ points }: { points: LocationPoint[] }) {
	if(points.length == 0) {
		return (
			<div className="flex items-center gap-2">
				<Button type="button" variant="outline" size="sm" disabled title="Tracking unavailable">
					<RouteIcon />
					Open Route
				</Button>
				<Badge variant="outline">0 point(s)</Badge>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2">
			<Button type="button" variant="outline" size="sm" asChild title={`${points.length} tracking point(s)`}>
				<a href={mapsRouteHref(points)} target="_blank" rel="noreferrer">
					<RouteIcon />
					Open Route
				</a>
			</Button>
			<Badge variant="outline">{points.length} point(s)</Badge>
		</div>
	);
}

function ErrorAlert({ message }: { message: string | null }) {
	if(message == null)
		return null;
	return (
		<Alert variant="destructive">
			<CircleAlertIcon />
			<AlertTitle>Error</AlertTitle>
			<AlertDescription>{message}</AlertDescription>
		</Alert>
	);
}

function LoadingRow({ colSpan }: { colSpan: number }) {
	return (
		<TableRow>
			<TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
				<span className="inline-flex items-center gap-2">
					<Loader2Icon className="size-4 animate-spin" />
					Loading
				</span>
			</TableCell>
		</TableRow>
	);
}

function EmptyRow({ colSpan }: { colSpan: number }) {
	return (
		<TableRow>
			<TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
				No records found.
			</TableCell>
		</TableRow>
	);
}

export function OfficerTaskReportMonitorPage({ mode = "combined" }: { mode?: OfficerTaskViewMode }) {
	const todayInput = useMemo(() => formatDateInput(new Date()), []);
	const showMonitoring = mode == "combined" || mode == "monitoring";
	const showReporting = mode == "combined" || mode == "reporting";
	const defaultTab = showMonitoring ? "tracking" : "tasklist";
	let pageTitle = "Officer Task Report Monitor";
	let pageDescription = "Monitor officer movement for today and review officer tasklist completion by assignment date.";
	if(mode == "reporting") {
		pageTitle = "Officer Task Reporting";
		pageDescription = "Review officer tasklist completion by assignment date.";
	}
	if(mode == "monitoring") {
		pageTitle = "Officer Task Monitoring";
		pageDescription = "Monitor officer movement for today.";
	}
	const [trackingKeyword, setTrackingKeyword] = useState("");
	const [appliedTrackingKeyword, setAppliedTrackingKeyword] = useState("");
	const [taskKeyword, setTaskKeyword] = useState("");
	const [dateFrom, setDateFrom] = useState(getDefaultDateFrom);
	const [dateUntil, setDateUntil] = useState(todayInput);
	const [taskQuery, setTaskQuery] = useState({
		keyword: "",
		dateFrom: getDefaultDateFrom(),
		dateUntil: todayInput
	});
	const [selectedTasklistRow, setSelectedTasklistRow] = useState<TasklistRow | null>(null);

	const trackingQuery = useQuery({
		queryKey: ["officer-task-report-monitor", "tracking-today", appliedTrackingKeyword],
		queryFn: () => reportActions.queryOfficerTrackingTodayAction({ keyword: appliedTrackingKeyword }),
		enabled: showMonitoring,
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});

	const tasklistQuery = useQuery({
		queryKey: ["officer-task-report-monitor", "tasklist", taskQuery],
		queryFn: () => reportActions.queryOfficerTasklistAction(taskQuery),
		enabled: showReporting,
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});

	const detailQuery = useQuery({
		enabled: showReporting && selectedTasklistRow != null,
		queryKey: ["officer-task-report-monitor", "task-details", selectedTasklistRow?.officerId, taskQuery],
		queryFn: () => reportActions.queryOfficerTaskDetailsAction({
			...taskQuery,
			officerId: selectedTasklistRow?.officerId ?? ""
		})
	});

	const trackingError = trackingQuery.error instanceof Error ? trackingQuery.error.message : trackingQuery.error != null ? "Failed to load officer tracking." : null;
	const tasklistError = tasklistQuery.error instanceof Error ? tasklistQuery.error.message : tasklistQuery.error != null ? "Failed to load officer tasklist." : null;

	return (
		<>
			<MenuPage
				title={pageTitle}
				description={pageDescription}
			>
				<Tabs defaultValue={defaultTab} className="gap-4">
					{mode == "combined" ? (
						<TabsList>
							<TabsTrigger value="tracking">
								<RouteIcon />
								Tracking Today
							</TabsTrigger>
							<TabsTrigger value="tasklist">
								<ListChecksIcon />
								Tasklist
							</TabsTrigger>
						</TabsList>
					) : null}

					{showMonitoring ? (
						<TabsContent value="tracking" className="space-y-4">
							<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
								<div className="relative w-full sm:max-w-xl">
									<SearchIcon className="text-muted-foreground absolute top-2 left-2.5 size-4" />
									<Input
										value={trackingKeyword}
										onChange={event => setTrackingKeyword(event.target.value)}
										placeholder="Search by team or officer"
										className="pl-8"
										onKeyDown={event => {
											if(event.key == "Enter")
												setAppliedTrackingKeyword(trackingKeyword.trim());
										}}
									/>
								</div>
								<Button type="button" onClick={() => setAppliedTrackingKeyword(trackingKeyword.trim())} disabled={trackingQuery.isFetching}>
									<SearchIcon />
									Search
								</Button>
							</div>

							<ErrorAlert message={trackingError} />

							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Officer Name</TableHead>
										<TableHead>Team Name</TableHead>
										<TableHead>First Login Time</TableHead>
										<TableHead>Tracking</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{trackingQuery.isPending ? <LoadingRow colSpan={4} /> : null}
									{!trackingQuery.isPending && (trackingQuery.data?.length ?? 0) == 0 ? <EmptyRow colSpan={4} /> : null}
									{trackingQuery.data?.map(row => (
										<TableRow key={row.officerId}>
											<TableCell className="font-medium">{row.officerName}</TableCell>
											<TableCell>{row.teamName}</TableCell>
											<TableCell>{formatDateTime(row.firstLoginTime)}</TableCell>
											<TableCell>
												<TrackingRouteButton points={row.tracking} />
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TabsContent>
					) : null}

					{showReporting ? (
						<TabsContent value="tasklist" className="space-y-4">
							<Card>
								<CardContent>
									<div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto] lg:items-end">
										<div className="space-y-1.5">
											<label className="text-sm font-medium">Officer or Team</label>
											<div className="relative">
												<SearchIcon className="text-muted-foreground absolute top-2 left-2.5 size-4" />
												<Input
													value={taskKeyword}
													onChange={event => setTaskKeyword(event.target.value)}
													placeholder="Search by officer or team"
													className="pl-8"
												/>
											</div>
										</div>
										<div className="space-y-1.5">
											<label className="text-sm font-medium">From</label>
											<div className="relative">
												<CalendarIcon className="text-muted-foreground absolute top-2 left-2.5 size-4" />
												<Input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} className="pl-8" />
											</div>
										</div>
										<div className="space-y-1.5">
											<label className="text-sm font-medium">Until</label>
											<div className="relative">
												<CalendarIcon className="text-muted-foreground absolute top-2 left-2.5 size-4" />
												<Input type="date" value={dateUntil} onChange={event => setDateUntil(event.target.value)} className="pl-8" />
											</div>
										</div>
										<Button
											type="button"
											onClick={() => setTaskQuery({ keyword: taskKeyword.trim(), dateFrom, dateUntil })}
											disabled={tasklistQuery.isFetching || dateFrom.length == 0 || dateUntil.length == 0}
										>
											<SearchIcon />
											Search
										</Button>
									</div>
								</CardContent>
							</Card>

							<ErrorAlert message={tasklistError} />

							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Assign Date</TableHead>
										<TableHead>Officer Name</TableHead>
										<TableHead>Team Name</TableHead>
										<TableHead>First Login</TableHead>
										<TableHead>First Login Location</TableHead>
										<TableHead>Last Logout</TableHead>
										<TableHead>Last Logout Location</TableHead>
										<TableHead>Tasklist Accts</TableHead>
										<TableHead>Finished Survey</TableHead>
										<TableHead>Reschedule Accts</TableHead>
										<TableHead>Untouched Accts</TableHead>
										<TableHead>Draft Accts</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{tasklistQuery.isPending ? <LoadingRow colSpan={12} /> : null}
									{!tasklistQuery.isPending && (tasklistQuery.data?.length ?? 0) == 0 ? <EmptyRow colSpan={12} /> : null}
									{tasklistQuery.data?.map(row => (
										<TableRow key={`${row.officerId}:${row.assignDate}`}>
											<TableCell>{formatDate(row.assignDate)}</TableCell>
											<TableCell className="font-medium">{row.officerName}</TableCell>
											<TableCell>{row.teamName}</TableCell>
											<TableCell>{formatDateTime(row.firstLoginTime)}</TableCell>
											<TableCell><LocationButton location={row.firstLoginLocation} label="First Login" /></TableCell>
											<TableCell>{formatDateTime(row.lastLogoutTime)}</TableCell>
											<TableCell><LocationButton location={row.lastLogoutLocation} label="Last Logout" /></TableCell>
											<TableCell>
												<Button type="button" variant="link" className="h-auto p-0" onClick={() => setSelectedTasklistRow(row)}>
													{row.tasklistAccts}
												</Button>
											</TableCell>
											<TableCell>{row.finishedSurvey}</TableCell>
											<TableCell>{row.rescheduleAccts}</TableCell>
											<TableCell>{row.untouchedAccts}</TableCell>
											<TableCell>{row.draftAccts}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TabsContent>
					) : null}
				</Tabs>
			</MenuPage>

			<Drawer
				open={selectedTasklistRow != null}
				onOpenChange={open => {
					if(!open)
						setSelectedTasklistRow(null);
				}}
				direction="right"
			>
				<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-5xl">
					<DrawerHeader>
						<DrawerTitle>{selectedTasklistRow?.officerName ?? "Tasklist Accounts"}</DrawerTitle>
						<DrawerDescription>
							{selectedTasklistRow == null ? "Tasklist account details." : `${formatDate(selectedTasklistRow.assignDate)} - ${selectedTasklistRow.teamName}`}
						</DrawerDescription>
					</DrawerHeader>
					<div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Officer Name</TableHead>
									<TableHead>Apply ID</TableHead>
									<TableHead>Customer Name</TableHead>
									<TableHead>Survey Date</TableHead>
									<TableHead>Survey Result</TableHead>
									<TableHead>Reschedule Date</TableHead>
									<TableHead>Reschedule Time</TableHead>
									<TableHead>Picture 1</TableHead>
									<TableHead>Pic1 Location</TableHead>
									<TableHead>Picture 12</TableHead>
									<TableHead>Pic12 Location</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{detailQuery.isPending && selectedTasklistRow != null ? <LoadingRow colSpan={11} /> : null}
								{!detailQuery.isPending && (detailQuery.data?.length ?? 0) == 0 ? <EmptyRow colSpan={11} /> : null}
								{detailQuery.data?.map(row => (
									<TableRow key={row.applyId}>
										<TableCell className="font-medium">{row.officerName}</TableCell>
										<TableCell className="font-mono text-xs">{row.applyId}</TableCell>
										<TableCell>{row.customerName}</TableCell>
										<TableCell>{formatDateTime(row.surveyDate)}</TableCell>
										<TableCell><Badge variant="outline">{row.surveyResult}</Badge></TableCell>
										<TableCell>{formatDate(row.rescheduleDate)}</TableCell>
										<TableCell>{row.rescheduleTime ?? "-"}</TableCell>
										<TableCell>
											{row.picture1 == null ? "-" : (
												<Button type="button" variant="link" className="h-auto p-0" asChild>
													<a href={row.picture1} target="_blank" rel="noreferrer">Open</a>
												</Button>
											)}
										</TableCell>
										<TableCell><LocationButton location={row.picture1Location} label="Picture 1" /></TableCell>
										<TableCell>
											{row.picture12 == null ? "-" : (
												<Button type="button" variant="link" className="h-auto p-0" asChild>
													<a href={row.picture12} target="_blank" rel="noreferrer">Open</a>
												</Button>
											)}
										</TableCell>
										<TableCell><LocationButton location={row.picture12Location} label="Picture 12" /></TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</DrawerContent>
			</Drawer>
		</>
	);
}
