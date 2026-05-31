"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";

import Form, { type JsonFormDefinition } from "@/components/Form";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Skeleton } from "@/components/radix/Skeleton";

import { appendGpsLogAction } from "../../../(dashboard)/officer-task/executor.actions";
import { submitAction, getContextAction, checkGeofenceAction, partialSubmitAction } from "./page.actions";
function isJsonFormDefinition(value: unknown): value is JsonFormDefinition {
	if(value == null || typeof value != "object")
		return false;
	if(!("slides" in value))
		return false;
	return Array.isArray((value as { slides?: unknown }).slides);
}

export default function Page() {
	const params = useParams<{ officerTaskId: string }>();
	const query = useQuery({
		queryKey: ["fill-survey", params.officerTaskId],
		queryFn: async () => await getContextAction({ officerTaskId: params.officerTaskId })
	});
	const geofenceQuery = useQuery({
		queryKey: ["fill-survey", "geofence", params.officerTaskId],
		queryFn: async () => await checkGeofenceAction({ officerTaskId: params.officerTaskId }),
		refetchInterval: 60000,
		refetchOnWindowFocus: true
	});
	const [locationError, setLocationError] = useState(null as any);
	useEffect(() => {
		const watchId = navigator.geolocation.watchPosition(
			async position => {
				setLocationError(null);
				if(!document.hasFocus()) return;
				try {
					await appendGpsLogAction({
						latitude: position.coords.latitude,
						longitude: position.coords.longitude,
						accuracy: position.coords.accuracy
					});
				} catch(error) {
					setLocationError(error);
				}
			},
			error => {
				setLocationError(error);
			},
			{ enableHighAccuracy: true, maximumAge: 5000, timeout: 60000 }
		);
		return () => {
			navigator.geolocation.clearWatch(watchId);
			setLocationError(null);
		};
	}, []);
	const formDefinition = useMemo(() => {
		const content = query.data?.surveyContent;
		if(isJsonFormDefinition(content))
			return content;
		return null;
	}, [query.data?.surveyContent]);
	const initialValues = useMemo(() => {
		const answers = query.data?.existingAnswers;
		if(answers != null && typeof answers == "object" && "values" in answers && (answers as any).values != null && typeof (answers as any).values == "object")
			return (answers as any).values as Record<string, unknown>;
		if(answers != null && typeof answers == "object" && "data" in answers && (answers as any).data != null && typeof (answers as any).data == "object")
			return (answers as any).data as Record<string, unknown>;
		return {};
	}, [query.data?.existingAnswers]);
	const [submissionError, setSubmissionError] = useState(null as any);

	if(query.isPending) {
		return (
			<div className="space-y-3 p-4">
				<Skeleton className="h-10 w-1/2" />
				<Skeleton className="h-40 w-full" />
				<Skeleton className="h-40 w-full" />
			</div>
		);
	}
	if(query.isError || query.data == null) {
		return (
			<Alert variant="destructive">
				<CircleAlertIcon />
				<AlertTitle>{`${query.error?.name ?? "Error"}`}</AlertTitle>
				<AlertDescription>{`${query.error?.message ?? "Unable to load survey."}`}</AlertDescription>
			</Alert>
		);
	}
	if(formDefinition == null) {
		return (
			<Alert variant="destructive">
				<CircleAlertIcon />
				<AlertTitle>Invalid survey</AlertTitle>
				<AlertDescription>The survey definition is invalid or missing.</AlertDescription>
			</Alert>
		);
	}
	return (
		<div className="space-y-3 p-4">
			<header className="space-y-1">
				<h1 className="text-xl font-semibold">{query.data.surveyTitle}</h1>
				<p className="text-muted-foreground text-sm">Officer task: <span className="font-mono">{params.officerTaskId}</span></p>
			</header>
			{locationError != null ? (
				<Alert variant="destructive">
					<CircleAlertIcon />
					<AlertTitle>{`${locationError?.name ?? "Location Error"}`}</AlertTitle>
					<AlertDescription>{`${locationError?.message ?? "An error occured while querying geolocation."}`}</AlertDescription>
				</Alert>
			) : null}
			{geofenceQuery.data?.isInsideGeofence == false ? (
				<Alert variant="destructive">
					<CircleAlertIcon />
					<AlertTitle>Out of geofence</AlertTitle>
					<AlertDescription>
						You appear to be outside the assigned geofence regions. Please activate your location and remain within the geofence to continue.
					</AlertDescription>
				</Alert>
			) : null}
			{locationError != null ? (
				<Alert variant="destructive">
					<CircleAlertIcon />
					<AlertTitle>Location error</AlertTitle>
					<AlertDescription>{locationError}</AlertDescription>
				</Alert>
			) : null}
			{submissionError != null ? (
				<Alert variant="destructive">
					<CircleAlertIcon />
					<AlertTitle>{`${submissionError?.name ?? "Error"}`}</AlertTitle>
					<AlertDescription>{`${submissionError?.message ?? "Unable to submit survey."}`}</AlertDescription>
				</Alert>
			) : null}
			<div className="bg-muted/20 rounded-3xl p-4">
				<Form
					className="rounded-3xl"
					form={formDefinition}
					initialValues={initialValues}
					onPartialSubmit={async payload => {
						setSubmissionError(null);
						try {
							await partialSubmitAction({
								officerTaskId: params.officerTaskId,
								answers: { values: payload.values }
							});
						} catch(error) {
							setSubmissionError(error);
						}
					}}
					onSubmit={async payload => {
						setSubmissionError(null);
						try {
							await submitAction({
								officerTaskId: params.officerTaskId,
								answers: { values: payload.values }
							});
						} catch(error) {
							setSubmissionError(error);
						}
					}}
				/>
			</div>
		</div>
	);
}
