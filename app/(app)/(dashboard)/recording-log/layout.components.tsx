"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Drawer, DrawerTitle, DrawerFooter, DrawerHeader, DrawerContent, DrawerDescription } from "@/components/radix/Drawer";
import { Skeleton } from "@/components/radix/Skeleton";

import { MenuTableConfigColumn, MenuColumnConfigColumn, MenuFilterConfigColumn, useMenuRowValueRenderer, defaultRelationUserRenderer, MenuRowValueRendererContext, MenuRowValueRendererConfigColumn, defaultRelationCreditApplicationRenderer, defaultRelationRecordingLogAudioFileRenderer, defaultRelationRecordingLogTranscriptionRenderer } from "../layout.components";
import { searchRelationUsersAction, searchRelationRecordingLogsAction, searchRelationCreditApplicationsAction, searchRelationRecordingLogAudioFilesAction, searchRelationRecordingLogTranscriptionsAction } from "../relation-navigation.actions";
import { RelationValues, getDetailsAction, queryMonitoringAction } from "./layout.actions";

export type ColumnData = Awaited<ReturnType<typeof queryMonitoringAction>>["docs"][number];
export const filterConfigColumns = Object.freeze([
	{ key: "id", label: "Id", type: "relation", relationSearch: searchRelationRecordingLogsAction },
	{ key: "createdAt", label: "Created At", type: "date" },
	{ key: "creditApplication", label: "Credit Application", type: "relation", relationSearch: searchRelationCreditApplicationsAction },
	{ key: "officer", label: "Officer", type: "relation", relationSearch: searchRelationUsersAction },
	{ key: "phoneNumber", label: "Phone Number", type: "text" },
	{ key: "audioFile", label: "Audio File", type: "relation", relationSearch: searchRelationRecordingLogAudioFilesAction },
	{ key: "transcription", label: "Transcription", type: "relation", relationSearch: searchRelationRecordingLogTranscriptionsAction }
] as MenuFilterConfigColumn[]);
export const columnConfigColumns = Object.freeze([
	{ key: "id", label: "Id" },
	{ key: "createdAt", label: "Created At" },
	{ key: "creditApplication", label: "Credit Application" },
	{ key: "officer", label: "Officer" },
	{ key: "phoneNumber", label: "Phone Number" },
	{ key: "audioFile", label: "Audio File" },
	{ key: "transcription", label: "Transcription" }
] as MenuColumnConfigColumn[]);
export const tableConfigColumns = Object.freeze([
	{ key: "id", label: "Id", sortable: true, className: "text-xs" },
	{ key: "createdAt", label: "Created At", sortable: true },
	{ key: "creditApplication", label: "Credit Application", sortable: false },
	{ key: "officer", label: "Officer", sortable: false },
	{ key: "phoneNumber", label: "Phone Number", sortable: true },
	{ key: "audioFile", label: "Audio File", sortable: false },
	{ key: "transcription", label: "Transcription", sortable: false }
] as MenuTableConfigColumn[]);
export const rowValueRendererConfigColumns = Object.freeze([
	{ key: "id", type: "text", render: v => (<span className="font-mono">{v}</span>) },
	{ key: "createdAt", type: "date" },
	{ key: "creditApplication", type: "relation", render: defaultRelationCreditApplicationRenderer({ description: "Credit Application", relationSource: "recording-logs.creditApplication" }) },
	{ key: "officer", type: "relation", render: defaultRelationUserRenderer({ description: "Officer", relationSource: "recording-logs.officer" }) },
	{ key: "phoneNumber", type: "text" },
	{ key: "audioFile", type: "relation", render: defaultRelationRecordingLogAudioFileRenderer({ description: "Audio File", relationSource: "recording-logs.audioFile" }) },
	{ key: "transcription", type: "relation", render: defaultRelationRecordingLogTranscriptionRenderer({ description: "Transcription", relationSource: "recording-logs.transcription" }) }
] as MenuRowValueRendererConfigColumn<ColumnData, RowValueRendererContext>[]);
export type RowValueRendererContext = {
	relationValues?: RelationValues;
} & MenuRowValueRendererContext;
export const eligibleDetailsTriggerColumns = Object.freeze([
	"id",
	"createdAt",
	"phoneNumber"
]);
export const drawerValueRendererConfigColumns = rowValueRendererConfigColumns;
export const defaultColumnOrder = Object.freeze([
	"id",
	"createdAt",
	"creditApplication",
	"officer",
	"phoneNumber",
	"audioFile",
	"transcription"
]) as string[];
export const defaultColumnsShown = Object.freeze([
	"createdAt",
	"creditApplication",
	"officer",
	"phoneNumber",
	"audioFile",
	"transcription"
]) as string[];
export const defaultColumnsSort = Object.freeze([
	["createdAt", false]
]) as [string, boolean][];

export function DetailsDrawer(
	{ open, onOpenChange, row, rowValueRendererContext }:
	{ open: boolean, onOpenChange: (v: boolean) => void, row: ColumnData | null, rowValueRendererContext: RowValueRendererContext }
) {
	const query = useQuery({
		queryKey: ["recording-log", "details", row?.id ?? null],
		enabled: open && row != null,
		queryFn: async () => await getDetailsAction(row!.id),
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});
	const renderValue = useMenuRowValueRenderer({
		columns: drawerValueRendererConfigColumns,
		context: {
			...rowValueRendererContext,
			relationValues: { ...rowValueRendererContext.relationValues, ...query.data?.relations }
		}
	});
	const columnLabels = useMemo(() => Object.fromEntries(drawerValueRendererConfigColumns.map(column =>
		[column.key, tableConfigColumns.find(column2 => column2.key == column.key)!.label] as const)), []);
	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-2xl">
				<DrawerHeader>
					<DrawerTitle>Recording Log Details</DrawerTitle>
					<DrawerDescription>Review all available columns for this recording log entry.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
					{row == null ? (
						<p className="text-muted-foreground text-sm">
							No recording log selected.
						</p>
					) : query.isPending ? (
						<div className="space-y-2">
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
						</div>
					) : query.isError || query.data == null ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>
								{`${query.error?.name ?? "Error"}`}
							</AlertTitle>
							<AlertDescription>
								{`${query.error?.message ?? "Unable to load recording log details."}`}
							</AlertDescription>
						</Alert>
					) : (
						drawerValueRendererConfigColumns.map(column => (
							<div key={column.key} className="space-y-1 rounded-lg border p-3">
								<p className="text-muted-foreground text-xs font-medium">
									{columnLabels[column.key]}
								</p>
								{renderValue(query.data.row, column.key)}
							</div>
						))
					)}
				</div>
				<DrawerFooter className="border-t sm:flex-row sm:items-center sm:justify-end">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
						Close
					</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
