"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DownloadIcon, CircleAlertIcon } from "lucide-react";
import { toast } from "sonner";

import { SurveyResultPreviewerDialog } from "@/components/SurveyResultPreviewerDialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Drawer, DrawerTitle, DrawerFooter, DrawerHeader, DrawerContent, DrawerDescription } from "@/components/radix/Drawer";
import { Skeleton } from "@/components/radix/Skeleton";

import { MenuFilterState, MenuTableConfigColumn, MenuColumnConfigColumn, MenuFilterConfigColumn, useMenuRowValueRenderer, MenuRowValueRendererContext, MenuRowValueRendererConfigColumn } from "../layout.components";
import { filterConfigColumns as officerTaskFilterConfigColumns } from "../officer-task/layout.components";
import { searchRelationSurveyResultsAction } from "../relation-navigation.actions";
import { defaultRelationUserRenderer, defaultRelationSurveyRenderer, defaultRelationOfficerTaskRenderer } from "../relation-navigation.components";
import { filterConfigColumns as surveyFilterConfigColumns } from "../survey-management/layout.components";
import { userFilterConfigColumns } from "../user-management/layout.components";
import { RelationValues, getDetailsAction, queryMonitoringAction, exportReportingCsvAction, exportMonitoringCsvAction } from "./layout.actions";

const defaultSurveyResultAnswersRenderer = ({ buttonLabel, dialogTitle }: { buttonLabel: string, dialogTitle: string }) =>
	(value: unknown) => (
		<SurveyResultPreviewerDialog buttonLabel={buttonLabel} dialogTitle={dialogTitle} value={value} />
	);

export type ColumnData = Awaited<ReturnType<typeof queryMonitoringAction>>["docs"][number];
export const filterConfigColumns = Object.freeze([
	{ key: "id", label: "Id", type: "relation", relationSearch: searchRelationSurveyResultsAction },
	{ key: "createdAt", label: "Created At", type: "date" },
	{ key: "createdBy", label: "Created By", type: "relation", relationFilterConfigColumn: () => ["User", userFilterConfigColumns] },
	{ key: "updatedAt", label: "Updated At", type: "date" },
	{ key: "updatedBy", label: "Updated By", type: "relation", relationFilterConfigColumn: () => ["User", userFilterConfigColumns] },
	{ key: "deletedAt", label: "Deleted At", type: "date" },
	{ key: "deletedBy", label: "Deleted By", type: "relation", relationFilterConfigColumn: () => ["User", userFilterConfigColumns] },
	{ key: "survey", label: "Survey", type: "relation", relationFilterConfigColumn: () => ["Survey", surveyFilterConfigColumns] },
	{ key: "surveyVersion", label: "Survey Version", type: "text" },
	{ key: "officerTask", label: "Officer Task", type: "relation", relationFilterConfigColumn: () => ["Officer Task", officerTaskFilterConfigColumns] }
] as MenuFilterConfigColumn[]);
export const columnConfigColumns = Object.freeze([
	{ key: "id", label: "Id" },
	{ key: "createdAt", label: "Created At" },
	{ key: "createdBy", label: "Created By" },
	{ key: "updatedAt", label: "Updated At" },
	{ key: "updatedBy", label: "Updated By" },
	{ key: "deletedAt", label: "Deleted At" },
	{ key: "deletedBy", label: "Deleted By" },
	{ key: "survey", label: "Survey" },
	{ key: "surveyVersion", label: "Survey Version" },
	{ key: "officerTask", label: "Officer Task" },
	{ key: "answers", label: "Answers" }
] as MenuColumnConfigColumn[]);
export const tableConfigColumns = Object.freeze([
	{ key: "id", label: "Id", sortable: true, className: "text-xs" },
	{ key: "createdAt", label: "Created At", sortable: true },
	{ key: "createdBy", label: "Created By", sortable: false },
	{ key: "updatedAt", label: "Updated At", sortable: true },
	{ key: "updatedBy", label: "Updated By", sortable: false },
	{ key: "deletedAt", label: "Deleted At", sortable: true },
	{ key: "deletedBy", label: "Deleted By", sortable: false },
	{ key: "survey", label: "Survey", sortable: false },
	{ key: "surveyVersion", label: "Survey Version", sortable: true },
	{ key: "officerTask", label: "Officer Task", sortable: false },
	{ key: "answers", label: "Answers", sortable: false }
] as MenuTableConfigColumn[]);
export const rowValueRendererConfigColumns = Object.freeze([
	{ key: "id", type: "text", render: v => (<span className="font-mono">{v}</span>) },
	{ key: "createdAt", type: "date" },
	{ key: "createdBy", type: "relation", render: defaultRelationUserRenderer({ description: "Created By", relationSource: "survey-results.createdBy" }) },
	{ key: "updatedAt", type: "date" },
	{ key: "updatedBy", type: "relation", render: defaultRelationUserRenderer({ description: "Updated By", relationSource: "survey-results.updatedBy" }) },
	{ key: "deletedAt", type: "date" },
	{ key: "deletedBy", type: "relation", render: defaultRelationUserRenderer({ description: "Deleted By", relationSource: "survey-results.deletedBy" }) },
	{ key: "survey", type: "relation", render: defaultRelationSurveyRenderer({ description: "Survey", relationSource: "survey-results.survey" }) },
	{ key: "surveyVersion", type: "text" },
	{ key: "officerTask", type: "relation", render: defaultRelationOfficerTaskRenderer({ description: "Officer Task", relationSource: "survey-results.officerTask" }) },
	{ key: "answers", type: "text", render: defaultSurveyResultAnswersRenderer({ buttonLabel: "View answers", dialogTitle: "Survey Result Answers" }) }
] as MenuRowValueRendererConfigColumn<ColumnData, RowValueRendererContext>[]);
export type RowValueRendererContext = {
	relationValues?: RelationValues;
} & MenuRowValueRendererContext;
export const eligibleDetailsTriggerColumns = Object.freeze([
	"id",
	"createdAt",
	"updatedAt",
	"deletedAt",
	"surveyVersion"
]);
export const drawerValueRendererConfigColumns = rowValueRendererConfigColumns;
export const defaultColumnOrder = Object.freeze([
	"id",
	"createdBy",
	"updatedBy",
	"deletedBy",
	"createdAt",
	"updatedAt",
	"deletedAt",
	"survey",
	"surveyVersion",
	"officerTask",
	"answers"
]) as string[];
export const defaultColumnsShown = Object.freeze([
	"updatedAt",
	"survey",
	"surveyVersion",
	"officerTask",
	"answers"
]) as string[];
export const defaultColumnsSort = Object.freeze([
	["updatedAt", false]
]) as [string, boolean][];

export function DetailsDrawer(
	{ open, onOpenChange, row, rowValueRendererContext }:
	{ open: boolean, onOpenChange: (v: boolean) => void, row: ColumnData | null, rowValueRendererContext: RowValueRendererContext }
) {
	const query = useQuery({
		queryKey: ["survey-result", "details", row?.id ?? null],
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
					<DrawerTitle>Survey Result Details</DrawerTitle>
					<DrawerDescription>Review all available columns for this survey result entry.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
					{row == null ? (
						<p className="text-muted-foreground text-sm">
							No survey result selected.
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
								{`${query.error?.message ?? "Unable to load survey result details."}`}
							</AlertDescription>
						</Alert>
					) : (
						drawerValueRendererConfigColumns.map(column => (
							<div key={column.key} className="space-y-1 rounded-lg border p-3">
								<p className="text-muted-foreground text-xs font-medium">
									{columnLabels[column.key]}
								</p>
								{renderValue(query.data.row as any, column.key)}
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

export function ExportCsvButton(
	{ mode, keyword, filters, columnsSort, disabled = false }:
	{ mode: "monitoring" | "reporting", keyword: string, filters: MenuFilterState[], columnsSort: [string, boolean][], disabled?: boolean }
) {
	const [exporting, setExporting] = useState(false);
	const handleExport = async () => {
		if(exporting) return;
		setExporting(true);
		try {
			const action = mode == "monitoring" ? exportMonitoringCsvAction : exportReportingCsvAction;
			const result = await action({ keyword, filters, columnsSort });
			if(result == null) {
				toast.error("Export failed");
				return;
			}
			const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = result.filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
			toast.success(`Exported ${result.count} survey result(s)`);
		} catch(e: unknown) {
			const message = e instanceof Error ? e.message : "Unable to export survey results.";
			toast.error(message);
		} finally {
			setExporting(false);
		}
	};
	return (
		<Button
			type="button"
			variant="outline"
			onClick={handleExport}
			disabled={disabled || exporting}
		>
			<DownloadIcon />
			{exporting ? "Exporting..." : "Export CSV"}
		</Button>
	);
}
