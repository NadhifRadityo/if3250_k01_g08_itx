"use client";

import { useRef, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Skeleton } from "@/components/radix/Skeleton";

import { getContextAction, appendRecordingLogsAction } from "./page.actions";

type CallStatus = "idle" | "rejected" | "processing" | "available" | "error";

export default function Page() {
	const params = useParams<{ officerTaskId: string }>();
	const query = useQuery({
		queryKey: ["call", params.officerTaskId],
		queryFn: async () => await getContextAction({ officerTaskId: params.officerTaskId })
	});
	const iframeRef = useRef(null as HTMLIFrameElement | null);
	const [status, setStatus] = useState("idle" as CallStatus);
	const [statusError, setStatusError] = useState(null as any);

	useEffect(() => {
		const messagingEndpoint = query.data?.messagingEndpoint;
		if(messagingEndpoint == null)
			return;
		const expectedOrigin = new URL(messagingEndpoint).origin;
		const handler = async (event: MessageEvent) => {
			if(event.origin != expectedOrigin)
				return;
			if(event.source != iframeRef.current?.contentWindow)
				return;
			const data: any = event.data;
			if(data == null || typeof data != "object" || typeof data.event != "string")
				return;
			if(data.event == "callRejected") {
				setStatus("rejected");
				window.setTimeout(() => window.close(), 10000);
				return;
			}
			if(data.event == "callEnded") {
				setStatus("processing");
				return;
			}
			if(data.event == "recordingsAvailable") {
				const recordings = Array.isArray(data.recordings) ? data.recordings : [];
				const recordingUrls = recordings
					.map((r: any) => r?.download_path)
					.filter((p: any): p is string => typeof p == "string" && p.length > 0)
					.map((p: string) => new URL(p, messagingEndpoint).href);
				try {
					await appendRecordingLogsAction({
						officerTaskId: params.officerTaskId,
						recordingUrls: recordingUrls
					});
					setStatus("available");
					window.setTimeout(() => window.close(), 10000);
				} catch(error) {
					setStatusError(error);
					setStatus("error");
				}
				return;
			}
		};
		window.addEventListener("message", handler);
		return () => window.removeEventListener("message", handler);
	}, [query.data?.messagingEndpoint, params.officerTaskId]);

	if(query.isPending) {
		return (
			<div className="space-y-3 p-4">
				<Skeleton className="h-10 w-1/2" />
				<Skeleton className="h-[80vh] w-full" />
			</div>
		);
	}
	if(query.isError || query.data == null) {
		return (
			<Alert variant="destructive">
				<CircleAlertIcon />
				<AlertTitle>{`${query.error?.name ?? "Error"}`}</AlertTitle>
				<AlertDescription>{`${query.error?.message ?? "Unable to load call context."}`}</AlertDescription>
			</Alert>
		);
	}
	const iframeSrc = (() => {
		const url = new URL("/iframe/call", query.data.messagingEndpoint);
		url.searchParams.set("api_key", query.data.messagingApiKey);
		url.searchParams.set("to", query.data.whatsappNumber);
		url.searchParams.set("type", "audio");
		return url.href;
	})();
	return (
		<div className="space-y-3 p-4">
			<header className="space-y-1">
				<h1 className="text-xl font-semibold">Call</h1>
				<p className="text-muted-foreground text-sm">Officer task: <span className="font-mono">{params.officerTaskId}</span></p>
			</header>
			{status == "rejected" ? (
				<Alert variant="destructive">
					<CircleAlertIcon />
					<AlertTitle>Call rejected</AlertTitle>
					<AlertDescription>This window will close automatically in 10 seconds.</AlertDescription>
				</Alert>
			) : null}
			{status == "processing" ? (
				<Alert>
					<CircleAlertIcon />
					<AlertTitle>Call ended</AlertTitle>
					<AlertDescription>The server is currently processing the recorded calls.</AlertDescription>
				</Alert>
			) : null}
			{status == "available" ? (
				<Alert>
					<CircleAlertIcon />
					<AlertTitle>Recordings available</AlertTitle>
					<AlertDescription>Recordings have been saved to recording logs. This window will close automatically in 10 seconds.</AlertDescription>
				</Alert>
			) : null}
			{status == "error" ? (
				<Alert variant="destructive">
					<CircleAlertIcon />
					<AlertTitle>{`${statusError?.name ?? "Error"}`}</AlertTitle>
					<AlertDescription>{`${statusError?.message ?? "Unable to save recordings."}`}</AlertDescription>
				</Alert>
			) : null}
			<iframe
				ref={iframeRef}
				src={iframeSrc}
				allow="camera; microphone; display-capture; autoplay"
				className="h-[80vh] w-full rounded-3xl border"
			/>
		</div>
	);
}
