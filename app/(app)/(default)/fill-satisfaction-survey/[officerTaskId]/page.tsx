"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";

import { uwsa } from "@/utils/actions";
import Form, { type JsonFormDefinition } from "@/components/Form";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Skeleton } from "@/components/radix/Skeleton";

import { submitAction, getContextAction, partialSubmitAction } from "./page.actions";

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
		queryKey: ["fill-satisfaction-survey", params.officerTaskId],
		queryFn: async () => await uwsa(getContextAction)({ officerTaskId: params.officerTaskId })
	});
	const formDefinition = useMemo(() => {
		const content = query.data?.satisfactionSurveyContent;
		if(isJsonFormDefinition(content))
			return content;
		return null;
	}, [query.data?.satisfactionSurveyContent]);
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
				<AlertDescription>{`${query.error?.message ?? "Unable to load satisfaction survey."}`}</AlertDescription>
			</Alert>
		);
	}
	if(formDefinition == null) {
		return (
			<Alert variant="destructive">
				<CircleAlertIcon />
				<AlertTitle>Invalid satisfaction survey</AlertTitle>
				<AlertDescription>The satisfaction survey definition is invalid or missing.</AlertDescription>
			</Alert>
		);
	}
	return (
		<div className="space-y-3 p-4">
			<header className="space-y-1">
				<h1 className="text-xl font-semibold">{query.data.satisfactionSurveyTitle}</h1>
				<p className="text-muted-foreground text-sm">Officer task: <span className="font-mono">{params.officerTaskId}</span></p>
			</header>
			{submissionError != null ? (
				<Alert variant="destructive">
					<CircleAlertIcon />
					<AlertTitle>{`${submissionError?.name ?? "Error"}`}</AlertTitle>
					<AlertDescription>{`${submissionError?.message ?? "Unable to submit satisfaction survey."}`}</AlertDescription>
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
							await uwsa(partialSubmitAction)({
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
							await uwsa(submitAction)({
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
