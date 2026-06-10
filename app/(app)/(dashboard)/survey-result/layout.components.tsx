"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";

import { rwsa, uwsa } from "@/utils/actions";
import Form, { type JsonFormDefinition } from "@/components/Form";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Dialog, DialogTitle, DialogHeader, DialogContent, DialogDescription } from "@/components/radix/Dialog";
import { Drawer, DrawerTitle, DrawerFooter, DrawerHeader, DrawerContent, DrawerDescription } from "@/components/radix/Drawer";
import { Skeleton } from "@/components/radix/Skeleton";

import { MenuTableConfigColumn, MenuColumnConfigColumn, MenuFilterConfigColumn, useMenuRowValueRenderer, MenuRowValueRendererContext, MenuRowValueRendererConfigColumn } from "../layout.components";
import { filterConfigColumns as officerTaskFilterConfigColumns } from "../officer-task/layout.components";
import { searchRelationSurveyResultsAction } from "../relation-navigation.actions";
import { defaultRelationUserRenderer, defaultRelationSurveyRenderer, defaultRelationOfficerTaskRenderer } from "../relation-navigation.components";
import { filterConfigColumns as surveyFilterConfigColumns } from "../survey-management/layout.components";
import { userFilterConfigColumns } from "../user-management/layout.components";
import { RelationValues, getDetailsAction, queryMonitoringAction } from "./layout.actions";

function isJsonFormDefinition(value: unknown): value is JsonFormDefinition {
	if(value == null || typeof value != "object")
		return false;
	if(!("slides" in value))
		return false;
	return Array.isArray((value as { slides?: unknown }).slides);
}
function sanitizeFormDefinitionForReadOnlyPreview(form: JsonFormDefinition): JsonFormDefinition {
	return {
		...form,
		settings: {
			...(form.settings ?? {}),
			getHeaders: undefined,
			postData: undefined,
			postHeaders: undefined,
			postSheetName: "",
			postUrl: "",
			restartButton: "hide",
			saveState: false,
			slideControls: "hide",
			submitButtonText: "Close"
		},
		slides: form.slides.map(slide => ({
			...slide,
			blocks: (slide.blocks ?? []).map(block => ({
				...block,
				disabled: true
			}))
		}))
	};
}
function getPreviewInitialValues(answers: unknown): Record<string, unknown> {
	if(answers == null || typeof answers != "object")
		return {};
	if("values" in answers && answers.values != null && typeof answers.values == "object" && !Array.isArray(answers.values))
		return answers.values as Record<string, unknown>;
	if("data" in answers && answers.data != null && typeof answers.data == "object" && !Array.isArray(answers.data))
		return answers.data as Record<string, unknown>;
	return {};
}
function SurveyResultAnswersDialog(
	{ buttonLabel, dialogTitle, value }:
	{ buttonLabel: string, dialogTitle: string, value: unknown }
) {
	const [open, setOpen] = useState(false);
	const formPreview = useMemo(() => {
		if(value == null || typeof value != "object") return null;
		const template = (value as any)._surveyTemplate;
		if(!isJsonFormDefinition(template?.content)) return null;
		return sanitizeFormDefinitionForReadOnlyPreview(template.content);
	}, [value]);
	const formPreviewInitialValues = useMemo(() => getPreviewInitialValues(value), [value]);
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<Button
				type="button"
				variant="outline"
				onClick={() => setOpen(true)}
				className="py-1 h-auto justify-start whitespace-normal text-left"
			>
				{buttonLabel}
			</Button>
			<DialogContent className="sm:max-w-[95vw] w-[95vw] max-h-[90vh] overflow-hidden p-0">
				<div className="flex h-[90vh] flex-col">
					<DialogHeader className="border-b px-4 py-3">
						<DialogTitle>{dialogTitle}</DialogTitle>
						<DialogDescription>Review the survey answers in a read-only view.</DialogDescription>
					</DialogHeader>
					<div className="flex-1 overflow-auto p-4 max-h-full">
						{formPreview != null ? (
							<div className="bg-muted/20 rounded-3xl p-4">
								<Form
									className="rounded-3xl"
									form={formPreview}
									initialValues={formPreviewInitialValues}
								/>
							</div>
						) : (
							<pre className="bg-muted/40 max-h-full overflow-auto rounded-lg border p-3 text-xs whitespace-pre-wrap wrap-break-word">
								{JSON.stringify(value, null, 2)}
							</pre>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
const defaultSurveyResultAnswersRenderer = ({ buttonLabel, dialogTitle }: { buttonLabel: string, dialogTitle: string }) =>
	(value: unknown) => (
		<SurveyResultAnswersDialog buttonLabel={buttonLabel} dialogTitle={dialogTitle} value={value} />
	);

export type ColumnData = rwsa<typeof queryMonitoringAction>["docs"][number];
export const filterConfigColumns = Object.freeze([
	{ key: "id", label: "Id", type: "relation", relationSearch: uwsa(searchRelationSurveyResultsAction) },
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
		queryFn: async () => await uwsa(getDetailsAction)(row!.id),
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
