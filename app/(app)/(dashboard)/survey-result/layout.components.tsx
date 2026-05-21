"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";

import { DatetimeInput } from "@/components/DatetimeInput";
import Form, { type JsonFormDefinition } from "@/components/Form";
import { SearchableSelect, type SearchableSelectOption } from "@/components/SearchableSelect";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Card, CardTitle, CardHeader, CardContent, CardDescription } from "@/components/radix/Card";
import { Checkbox } from "@/components/radix/Checkbox";
import { Collapsible, CollapsibleContent } from "@/components/radix/Collapsible";
import { Drawer, DrawerTitle, DrawerFooter, DrawerHeader, DrawerContent, DrawerDescription } from "@/components/radix/Drawer";
import { Skeleton } from "@/components/radix/Skeleton";
import { Table, TableRow, TableBody, TableCell, TableHead, TableHeader } from "@/components/radix/Table";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "@/components/radix/Tabs";

import { DashboardManagementToolbar, DashboardManagementPageFrame, DashboardManagementPagination } from "../layout.components";
import * as surveyResultActions from "./layout.actions";

export const PAGE_SIZE = 20;

export type SurveyResultTableColumnId = "createdAt" |
	"creditApplicationId" |
	"customerName" |
	"officerName" |
	"productCode";

export type SurveyResultTableColumnConfig = {
	id: SurveyResultTableColumnId;
	label: string;
	headClassName?: string;
	cellClassName?: string;
};

const monitoringColumns: SurveyResultTableColumnConfig[] = [
	{ id: "creditApplicationId", label: "Apply ID", cellClassName: "font-mono text-xs" },
	{ id: "customerName", label: "Customer Name", cellClassName: "font-medium" },
	{ id: "officerName", label: "Officer Name" },
	{ id: "productCode", label: "Product Code", cellClassName: "font-mono text-xs" }
];

const reportingColumns: SurveyResultTableColumnConfig[] = [
	{ id: "createdAt", label: "Date", cellClassName: "font-mono text-xs whitespace-nowrap" },
	...monitoringColumns
];

function parseColumnPreference(value: unknown, allColumnIds: SurveyResultTableColumnId[]): SurveyResultTableColumnId[] | null {
	if(typeof value != "string")
		return null;
	try {
		const parsed = JSON.parse(value) as unknown;
		if(!Array.isArray(parsed))
			return null;
		const normalized = parsed
			.filter((item): item is SurveyResultTableColumnId => typeof item == "string" && allColumnIds.includes(item as SurveyResultTableColumnId));
		return [...new Set(normalized)];
	} catch{
		return null;
	}
}

function formatListDate(value: string): string {
	const parsed = new Date(value);
	if(Number.isNaN(parsed.getTime()))
		return value;
	return `${parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${parsed.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

function triggerBase64Download(file: surveyResultActions.ExportFileOutput) {
	const binary = atob(file.base64);
	const bytes = new Uint8Array(binary.length);
	for(let i = 0; i < binary.length; i++)
		bytes[i] = binary.charCodeAt(i);
	const blob = new Blob([bytes], { type: file.mimeType });
	const blobUrl = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = blobUrl;
	anchor.download = file.fileName;
	anchor.style.display = "none";
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(blobUrl);
}

function safeJsonStringify(value: unknown): string {
	try {
		return JSON.stringify(value, null, 2);
	} catch{
		return String(value);
	}
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if(value == null || typeof value != "object")
		return false;
	return Object.getPrototypeOf(value) == Object.prototype;
}

type LexicalNode = {
	type?: string;
	text?: string;
	children?: LexicalNode[];
};

function extractLexicalPlainText(value: unknown): string | null {
	if(value == null || typeof value != "object")
		return null;
	if(!("root" in value))
		return null;

	const root = (value as any).root as LexicalNode | undefined;
	if(root == null || typeof root != "object")
		return null;

	const pieces: string[] = [];
	const walk = (node: LexicalNode) => {
		if(typeof node.text == "string" && node.text.trim().length > 0)
			pieces.push(node.text);
		if(Array.isArray(node.children)) {
			for(const child of node.children)
				walk(child);
		}
	};

	walk(root);
	const text = pieces.join(" ").replace(/\s+/g, " ").trim();
	return text.length > 0 ? text : null;
}

function formatUnknownValue(value: unknown): string {
	if(value == null)
		return "-";
	if(typeof value == "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : "-";
	}
	if(typeof value == "number" || typeof value == "boolean")
		return String(value);
	if(Array.isArray(value))
		return value.length > 0 ? value.map(item => formatUnknownValue(item)).join(", ") : "-";
	const lexicalText = extractLexicalPlainText(value);
	if(lexicalText != null)
		return lexicalText;
	return safeJsonStringify(value);
}

type SurveyQuestionDefinition = {
	id: string;
	question: string;
	type: string;
};

function DetailField({ label, value, mono = false }: { label: string, value: unknown, mono?: boolean }) {
	const className = mono ? "font-mono text-xs whitespace-pre-wrap break-words" : "text-sm whitespace-pre-wrap break-words";
	return (
		<div className="space-y-1 rounded-lg border p-3">
			<p className="text-muted-foreground text-xs font-medium">{label}</p>
			<p className={className}>{formatUnknownValue(value)}</p>
		</div>
	);
}

function extractSurveyQuestions(content: unknown): SurveyQuestionDefinition[] {
	if(content == null || typeof content != "object")
		return [];
	if(!("questions" in content))
		return [];
	const questions = (content as any).questions as unknown;
	if(!Array.isArray(questions))
		return [];
	return questions
		.map(question => {
			const id = typeof question?.id == "string" ? question.id.trim() : "";
			const questionText = typeof question?.question == "string" ? question.question.trim() : "";
			const type = typeof question?.type == "string" ? question.type.trim() : "";
			if(id.length == 0)
				return null;
			return {
				id,
				question: questionText.length > 0 ? questionText : id,
				type: type.length > 0 ? type : "-"
			} satisfies SurveyQuestionDefinition;
		})
		.filter((question): question is SurveyQuestionDefinition => question != null);
}

function extractSurveyAnswerMap(answers: unknown): Map<string, unknown> {
	const map = new Map<string, unknown>();
	if(answers == null || typeof answers != "object")
		return map;

	const items = (answers as any).items as unknown;
	if(Array.isArray(items)) {
		for(const item of items) {
			const candidate = item != null && typeof item == "object" && "questionId" in item ? (item as { questionId?: unknown }).questionId : undefined;
			const questionId = typeof candidate == "string" ? candidate.trim() : "";
			if(questionId.length == 0)
				continue;
			const value = item != null && typeof item == "object" && "value" in item ? (item as { value?: unknown }).value : undefined;
			map.set(questionId, value);
		}
		return map;
	}

	if(items != null && typeof items == "object") {
		for(const [key, value] of Object.entries(items as Record<string, unknown>)) {
			const normalizedKey = key.trim();
			if(normalizedKey.length == 0)
				continue;
			map.set(normalizedKey, value);
		}
	}

	return map;
}

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
	if("values" in answers && isPlainObject((answers as { values?: unknown }).values))
		return (answers as { values: Record<string, unknown> }).values;
	if("data" in answers && isPlainObject((answers as { data?: unknown }).data))
		return (answers as { data: Record<string, unknown> }).data;

	const map = extractSurveyAnswerMap(answers);
	return Object.fromEntries(map.entries());
}

function SurveyAnswerPreview({
	template,
	answers
}: {
	template: surveyResultActions.SurveyResultDetailOutput["surveyTemplate"] | null;
	answers: unknown;
}) {
	const submittedAt = typeof (answers as any)?.submittedAt == "string" ? String((answers as any).submittedAt) : null;
	const templateTitle = template != null ? template.title.trim() : "";
	const templateContent = template?.content;

	const formPreview = useMemo(() => {
		if(!isJsonFormDefinition(templateContent))
			return null;
		return sanitizeFormDefinitionForReadOnlyPreview(templateContent);
	}, [templateContent]);
	const formPreviewInitialValues = useMemo(() => getPreviewInitialValues(answers), [answers]);

	const questions = useMemo(() => extractSurveyQuestions(templateContent), [templateContent]);
	const answersMap = useMemo(() => extractSurveyAnswerMap(answers), [answers]);

	return (
		<Card className="h-full">
			<CardHeader>
				<CardTitle className="text-base">Survey Preview</CardTitle>
				<CardDescription className="space-y-1">
					<p className="text-sm">{templateTitle.length > 0 ? templateTitle : "Survey template unavailable."}</p>
					{submittedAt != null && submittedAt.trim().length > 0 ? (
						<p className="text-muted-foreground text-xs">Submitted at: {formatListDate(submittedAt)}</p>
					) : null}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				{formPreview != null ? (
					<div className="bg-muted/20 rounded-3xl p-4">
						<Form
							className="rounded-3xl"
							form={formPreview}
							initialValues={formPreviewInitialValues}
						/>
					</div>
				) : questions.length > 0 ? (
					<div className="space-y-3">
						{questions.map(question => (
							<div key={question.id} className="space-y-1 rounded-lg border p-3">
								<div className="flex items-start justify-between gap-2">
									<p className="text-sm font-medium leading-snug">{question.question}</p>
									<p className="text-muted-foreground shrink-0 text-xs">{question.type}</p>
								</div>
								<p className="text-sm whitespace-pre-wrap break-words">{formatUnknownValue(answersMap.get(question.id))}</p>
							</div>
						))}
					</div>
				) : (
					<div className="space-y-2">
						<p className="text-muted-foreground text-sm">No structured questions detected. Showing raw answers JSON.</p>
						<pre className="bg-muted/40 max-h-[40vh] overflow-auto rounded-lg border p-3 text-xs whitespace-pre-wrap break-words">
							{safeJsonStringify(answers)}
						</pre>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

type SurveyResultFilters = {
	officerId: string;
	surveyId: string;
	creditApplicationId: string;
	from: string;
	to: string;
};

function getFilterCount(filters: SurveyResultFilters, includeDateRange: boolean): number {
	let count = 0;
	if(filters.officerId.trim().length > 0)
		count += 1;
	if(filters.surveyId.trim().length > 0)
		count += 1;
	if(filters.creditApplicationId.trim().length > 0)
		count += 1;
	if(includeDateRange) {
		if(filters.from.trim().length > 0)
			count += 1;
		if(filters.to.trim().length > 0)
			count += 1;
	}
	return count;
}

function mapOfficerOptionsToSelectOptions(options: surveyResultActions.SurveyResultOfficerOption[]): SearchableSelectOption[] {
	return options.map(option => ({
		value: option.id,
		label: option.name.length > 0 ? option.name : option.email,
		keywords: `${option.name} ${option.email}`.trim()
	}));
}

function mapSurveyOptionsToSelectOptions(options: surveyResultActions.SurveyResultSurveyOption[]): SearchableSelectOption[] {
	return options.map(option => ({
		value: option.id,
		label: option.title.length > 0 ? option.title : option.id
	}));
}

function mapCreditApplicationOptionsToSelectOptions(options: surveyResultActions.SurveyResultCreditApplicationOption[]): SearchableSelectOption[] {
	return options.map(option => ({
		value: option.id,
		label: option.name.length > 0 ? option.name : option.id,
		keywords: `${option.id} ${option.email} ${option.assetId ?? ""}`.trim()
	}));
}

function resolveUserName(relations: surveyResultActions.SurveyResultRelationValues, id: string | null): string {
	if(id == null || id.length == 0)
		return "-";
	const relation = relations[`users:${id}`];
	const name = typeof relation?.name == "string" ? relation.name.trim() : "";
	return name.length > 0 ? name : id;
}

function resolveCreditApplicationName(relations: surveyResultActions.SurveyResultRelationValues, id: string | null): string {
	if(id == null || id.length == 0)
		return "-";
	const relation = relations[`credit-applications:${id}`];
	if(relation == null)
		return id;
	return relation.name.trim().length > 0 ? relation.name : id;
}

function resolveCreditApplicationProductCode(relations: surveyResultActions.SurveyResultRelationValues, id: string | null): string {
	if(id == null || id.length == 0)
		return "-";
	const relation = relations[`credit-applications:${id}`];
	if(relation == null)
		return "-";
	const assetId = typeof relation.assetId == "string" ? relation.assetId.trim() : "";
	return assetId.length > 0 ? assetId : "-";
}

export type SurveyResultListVariant = "monitoring" | "reporting";

export default function SurveyResultListPage({ variant }: { variant: SurveyResultListVariant }) {
	const isReporting = variant == "reporting";
	const [keyword, setKeyword] = useState("");
	const [debouncedKeyword, setDebouncedKeyword] = useState("");
	const [pageIndex, setPageIndex] = useState(1);
	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const [isColumnOpen, setIsColumnOpen] = useState(false);
	const [detailId, setDetailId] = useState<string | null>(null);
	const [isDetailOpen, setIsDetailOpen] = useState(false);
	const [isDetailDownloading, setIsDetailDownloading] = useState(false);
	const [detailDownloadErrorMessage, setDetailDownloadErrorMessage] = useState<string | null>(null);
	const [filters, setFilters] = useState<SurveyResultFilters>({
		officerId: "",
		surveyId: "",
		creditApplicationId: "",
		from: "",
		to: ""
	});

	const columns = isReporting ? reportingColumns : monitoringColumns;
	const allColumnIds = useMemo(() => columns.map(column => column.id), [columns]);
	const columnPreferenceKey = isReporting ? "survey-result-reporting-columns-v1" : "survey-result-monitoring-columns-v1";
	const [hiddenColumnIds, setHiddenColumnIds] = useState<SurveyResultTableColumnId[]>([]);

	useEffect(() => {
		const timeout = window.setTimeout(() => {
			setDebouncedKeyword(keyword.trim());
		}, 250);
		return () => {
			window.clearTimeout(timeout);
		};
	}, [keyword]);

	useEffect(() => {
		const storedValue = typeof window == "undefined" ? null : window.localStorage.getItem(columnPreferenceKey);
		const parsedHidden = parseColumnPreference(storedValue, allColumnIds);
		if(parsedHidden != null)
			setHiddenColumnIds(parsedHidden);
	}, [allColumnIds, columnPreferenceKey]);

	useEffect(() => {
		if(typeof window == "undefined")
			return;
		window.localStorage.setItem(columnPreferenceKey, JSON.stringify(hiddenColumnIds));
	}, [columnPreferenceKey, hiddenColumnIds]);

	useEffect(() => {
		setPageIndex(1);
	}, [debouncedKeyword, filters]);

	const filterCount = useMemo(() => getFilterCount(filters, isReporting), [filters, isReporting]);
	const appliedHiddenSet = useMemo(() => new Set(hiddenColumnIds), [hiddenColumnIds]);
	const visibleColumns = useMemo(() => columns.filter(column => !appliedHiddenSet.has(column.id)), [appliedHiddenSet, columns]);

	const openDetail = (surveyResultId: string) => {
		setDetailId(surveyResultId);
		setIsDetailOpen(true);
	};

	const handleDetailOpenChange = (open: boolean) => {
		setIsDetailOpen(open);
		if(!open) {
			setDetailId(null);
			setIsDetailDownloading(false);
			setDetailDownloadErrorMessage(null);
		}
	};

	const listQuery = useQuery({
		queryKey: ["survey-result", variant, debouncedKeyword, pageIndex, filters],
		queryFn: () => {
			const commonInput = {
				keyword: debouncedKeyword,
				page: pageIndex,
				limit: PAGE_SIZE,
				officerId: filters.officerId.trim().length > 0 ? filters.officerId : undefined,
				surveyId: filters.surveyId.trim().length > 0 ? filters.surveyId : undefined,
				creditApplicationId: filters.creditApplicationId.trim().length > 0 ? filters.creditApplicationId : undefined
			};
			if(isReporting) {
				return surveyResultActions.getSurveyReportList({
					...commonInput,
					from: filters.from.trim().length > 0 ? filters.from : undefined,
					to: filters.to.trim().length > 0 ? filters.to : undefined
				});
			}
			return surveyResultActions.getSurveyMonitoringList(commonInput);
		},
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});

	const detailQuery = useQuery({
		queryKey: ["survey-result", variant, "detail", detailId, filters.from, filters.to],
		enabled: isDetailOpen && detailId != null,
		queryFn: async () => {
			if(detailId == null)
				throw new Error("Survey result detail is missing.");
			if(isReporting) {
				const from = filters.from.trim().length > 0 ? filters.from : undefined;
				const to = filters.to.trim().length > 0 ? filters.to : undefined;
				return surveyResultActions.getSurveyReportViewerDetail(detailId, from, to);
			}
			return surveyResultActions.getSurveyMonitoringViewerDetail(detailId);
		},
		retry: 0,
		refetchInterval: false,
		refetchOnWindowFocus: true,
		placeholderData: previousData => previousData
	});

	const queryResult = listQuery.data ?? {
		docs: [],
		relations: {},
		totalDocs: 0,
		page: 1,
		hasNextPage: false,
		hasPreviousPage: false,
		range: { from: null, to: null }
	} satisfies surveyResultActions.SurveyResultListOutput;

	useEffect(() => {
		if(listQuery.data == null || listQuery.isFetching)
			return;
		if(listQuery.data.page != pageIndex)
			setPageIndex(listQuery.data.page);
	}, [listQuery.data, listQuery.isFetching, pageIndex]);

	const isLoading = listQuery.isPending;
	const queryErrorMessage = listQuery.error instanceof Error ? listQuery.error.message : listQuery.error != null ? "Failed to load survey results." : null;
	const detailErrorMessage = detailQuery.error instanceof Error ? detailQuery.error.message : detailQuery.error != null ? "Failed to load survey result detail." : null;

	const handleDownloadDetail = async () => {
		if(detailId == null || isDetailDownloading)
			return;
		setIsDetailDownloading(true);
		setDetailDownloadErrorMessage(null);
		try {
			const file = await surveyResultActions.exportSurveyResultDetail(detailId);
			triggerBase64Download(file);
		} catch(error) {
			const message = error instanceof Error ? error.message : "Failed to download survey result.";
			setDetailDownloadErrorMessage(message);
		} finally {
			setIsDetailDownloading(false);
		}
	};

	const toggleColumnVisibility = (columnId: SurveyResultTableColumnId, nextVisible: boolean) => {
		setHiddenColumnIds(previous => {
			if(nextVisible)
				return previous.filter(id => id != columnId);
			if(previous.includes(columnId))
				return previous;
			return [...previous, columnId];
		});
	};

	const clearFilters = () => {
		setFilters({
			officerId: "",
			surveyId: "",
			creditApplicationId: "",
			from: "",
			to: ""
		});
	};

	const title = isReporting ? "Survey Result Reporting" : "Survey Result Monitoring";
	const description = isReporting ? "Review historical survey results by date range." : "Monitor survey results submitted today.";

	return (
		<DashboardManagementPageFrame title={title} description={description}>
			<DashboardManagementToolbar
				keyword={keyword}
				onKeywordChange={setKeyword}
				searchPlaceholder="Search by apply ID, customer name, officer, or survey"
				filterCount={filterCount}
				onToggleFilter={() => setIsFilterOpen(previous => !previous)}
				onToggleColumns={() => setIsColumnOpen(previous => !previous)}
				isLoading={isLoading}
				isMutating={false}
			/>

			<Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
				<CollapsibleContent>
					<div className="space-y-3 rounded-xl border p-4">
						<div className="flex items-center justify-between gap-2">
							<div className="space-y-1">
								<h3 className="text-sm font-semibold">Filters</h3>
								<p className="text-muted-foreground text-sm">Use optional filters to narrow down results.</p>
							</div>
							{filterCount > 0 ? (
								<Button type="button" variant="outline" size="sm" onClick={clearFilters} disabled={isLoading}>Clear Filter</Button>
							) : null}
						</div>
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							<div className="space-y-2">
								<label className="text-sm font-medium">Officer</label>
								<SearchableSelect
									value={filters.officerId}
									onValueChange={value => setFilters(previous => ({ ...previous, officerId: value }))}
									options={[]}
									onSearch={async (searchKeyword, selectedValues) => mapOfficerOptionsToSelectOptions(
										await surveyResultActions.searchSurveyResultOfficerOptionsAction(searchKeyword, selectedValues)
									)}
									placeholder="Select officer"
									searchPlaceholder="Type officer name or email"
									allowClear
								/>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium">Survey Template</label>
								<SearchableSelect
									value={filters.surveyId}
									onValueChange={value => setFilters(previous => ({ ...previous, surveyId: value }))}
									options={[]}
									onSearch={async (searchKeyword, selectedValues) => mapSurveyOptionsToSelectOptions(
										await surveyResultActions.searchSurveyResultSurveyOptionsAction(searchKeyword, selectedValues)
									)}
									placeholder="Select survey"
									searchPlaceholder="Type survey title or ID"
									allowClear
								/>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium">Credit Application</label>
								<SearchableSelect
									value={filters.creditApplicationId}
									onValueChange={value => setFilters(previous => ({ ...previous, creditApplicationId: value }))}
									options={[]}
									onSearch={async (searchKeyword, selectedValues) => mapCreditApplicationOptionsToSelectOptions(
										await surveyResultActions.searchSurveyResultCreditApplicationOptionsAction(searchKeyword, selectedValues)
									)}
									placeholder="Select credit application"
									searchPlaceholder="Type name, email, apply ID, or product code"
									allowClear
								/>
							</div>
							{isReporting ? (
								<>
									<div className="space-y-2">
										<label className="text-sm font-medium">From</label>
										<DatetimeInput
											mode="date"
											value={filters.from}
											onChange={value => setFilters(previous => ({ ...previous, from: value }))}
										/>
									</div>
									<div className="space-y-2">
										<label className="text-sm font-medium">To</label>
										<DatetimeInput
											mode="date"
											value={filters.to}
											onChange={value => setFilters(previous => ({ ...previous, to: value }))}
										/>
									</div>
								</>
							) : null}
						</div>
					</div>
				</CollapsibleContent>
			</Collapsible>

			<Collapsible open={isColumnOpen} onOpenChange={setIsColumnOpen}>
				<CollapsibleContent>
					<div className="space-y-3 rounded-xl border p-4">
						<div className="flex items-center justify-between gap-2">
							<div className="space-y-1">
								<h3 className="text-sm font-semibold">Columns</h3>
								<p className="text-muted-foreground text-sm">Toggle column visibility.</p>
							</div>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setHiddenColumnIds([])}
							>
								Reset
							</Button>
						</div>
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
							{columns.map(column => {
								const isVisible = !hiddenColumnIds.includes(column.id);
								return (
									<div key={column.id} className="hover:bg-muted/60 flex items-center gap-3 rounded-lg border px-3 py-2">
										<Checkbox
											checked={isVisible}
											onCheckedChange={checked => toggleColumnVisibility(column.id, checked == true)}
										/>
										<p className="text-sm font-medium">{column.label}</p>
									</div>
								);
							})}
						</div>
					</div>
				</CollapsibleContent>
			</Collapsible>

			{queryErrorMessage != null ? (
				<Alert variant="destructive">
					<CircleAlertIcon />
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>{queryErrorMessage}</AlertDescription>
				</Alert>
			) : null}

			<div className="overflow-x-auto rounded-xl border">
				<Table>
					<TableHeader>
						<TableRow>
							{visibleColumns.map(column => (
								<TableHead key={column.id} className={column.headClassName}>{column.label}</TableHead>
							))}
							<TableHead className="w-0 whitespace-nowrap text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{queryResult.docs.map(row => (
							<TableRow key={row.id}>
								{visibleColumns.map(column => {
									if(column.id == "createdAt")
										return <TableCell key={column.id} className={column.cellClassName}>{formatListDate(row.createdAt)}</TableCell>;
									if(column.id == "creditApplicationId")
										return <TableCell key={column.id} className={column.cellClassName}>{row.creditApplication ?? "-"}</TableCell>;
									if(column.id == "customerName")
										return <TableCell key={column.id} className={column.cellClassName}>{resolveCreditApplicationName(queryResult.relations, row.creditApplication)}</TableCell>;
									if(column.id == "officerName")
										return <TableCell key={column.id} className={column.cellClassName}>{resolveUserName(queryResult.relations, row.officer)}</TableCell>;
									if(column.id == "productCode")
										return <TableCell key={column.id} className={column.cellClassName}>{resolveCreditApplicationProductCode(queryResult.relations, row.creditApplication)}</TableCell>;
									return <TableCell key={column.id} className={column.cellClassName}>-</TableCell>;
								})}
								<TableCell className="text-right">
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={() => openDetail(row.id)}
										disabled={isLoading}
									>
										Detail
									</Button>
								</TableCell>
							</TableRow>
						))}
						{queryResult.docs.length == 0 && !isLoading ? (
							<TableRow>
								<TableCell colSpan={visibleColumns.length + 1} className="text-muted-foreground text-center text-sm py-6">
									No survey results found.
								</TableCell>
							</TableRow>
						) : null}
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={visibleColumns.length + 1} className="text-muted-foreground text-center text-sm py-6">
									Loading...
								</TableCell>
							</TableRow>
						) : null}
					</TableBody>
				</Table>
			</div>

			<DashboardManagementPagination
				pageIndex={pageIndex}
				totalRequests={queryResult.totalDocs}
				hasPreviousPage={queryResult.hasPreviousPage}
				hasNextPage={queryResult.hasNextPage}
				isLoading={isLoading}
				isMutating={false}
				onPrevious={() => setPageIndex(previous => Math.max(previous - 1, 1))}
				onNext={() => setPageIndex(previous => previous + 1)}
			/>

			<Drawer open={isDetailOpen} onOpenChange={handleDetailOpenChange} direction="right">
				<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-6xl">
					<DrawerHeader>
						<DrawerTitle>Survey Result Detail</DrawerTitle>
						<DrawerDescription>Review the customer, product, assignment info, and survey answers.</DrawerDescription>
					</DrawerHeader>
					<div className="flex-1 overflow-hidden px-4 pb-4">
						{detailId == null ? (
							<p className="text-muted-foreground text-sm">No survey result selected.</p>
						) : detailQuery.isPending ? (
							<div className="grid gap-4 md:grid-cols-[360px_1fr]">
								<div className="space-y-2">
									<Skeleton className="h-24 w-full" />
									<Skeleton className="h-40 w-full" />
									<Skeleton className="h-40 w-full" />
								</div>
								<div className="space-y-2">
									<Skeleton className="h-24 w-full" />
									<Skeleton className="h-96 w-full" />
								</div>
							</div>
						) : detailQuery.isError || detailQuery.data == null ? (
							<Alert variant="destructive">
								<CircleAlertIcon />
								<AlertTitle>Error</AlertTitle>
								<AlertDescription>{detailErrorMessage ?? "Unable to load survey result detail."}</AlertDescription>
							</Alert>
						) : (
							<div className="grid h-full gap-4 overflow-hidden md:grid-cols-[360px_1fr]">
								<div className="space-y-4 overflow-y-auto pr-1">
									<Card>
										<CardHeader>
											<CardTitle className="text-base">Summary</CardTitle>
											<CardDescription>Basic survey result information.</CardDescription>
										</CardHeader>
										<CardContent className="space-y-2">
											<DetailField label="Apply ID" value={detailQuery.data.row.creditApplication ?? "-"} mono />
											<DetailField label="Customer Name" value={detailQuery.data.creditApplicationDetail?.name ?? resolveCreditApplicationName(detailQuery.data.relations, detailQuery.data.row.creditApplication)} />
											<DetailField label="Officer Name" value={resolveUserName(detailQuery.data.relations, detailQuery.data.row.officer)} />
											<DetailField label="Assignment Date" value={detailQuery.data.creditApplicationAssignment?.updatedAt != null ? formatListDate(detailQuery.data.creditApplicationAssignment.updatedAt) : "-"} mono />
											<DetailField label="Survey Template" value={detailQuery.data.surveyTemplate?.title ?? detailQuery.data.relations[`surveys:${detailQuery.data.row.survey ?? ""}`]?.title ?? "-"} />
											<DetailField label="Submitted At" value={formatListDate(detailQuery.data.row.createdAt)} mono />
										</CardContent>
									</Card>

									<Tabs defaultValue="customer" className="w-full">
										<TabsList className="w-full">
											<TabsTrigger value="customer" className="flex-1">Customer</TabsTrigger>
											<TabsTrigger value="product" className="flex-1">Product</TabsTrigger>
										</TabsList>
										<TabsContent value="customer" className="mt-3 space-y-3">
											<Card>
												<CardHeader>
													<CardTitle className="text-base">Customer Data</CardTitle>
													<CardDescription>Full customer data from credit application.</CardDescription>
												</CardHeader>
												<CardContent className="space-y-2">
													<DetailField label="Name" value={detailQuery.data.creditApplicationDetail?.name} />
													<DetailField label="Email" value={detailQuery.data.creditApplicationDetail?.email} />
													<DetailField label="Addresses" value={detailQuery.data.creditApplicationDetail?.addresses ?? []} />
													<DetailField label="Phone Numbers" value={detailQuery.data.creditApplicationDetail?.phoneNumbers ?? []} />
													<DetailField label="Whatsapp Number" value={detailQuery.data.creditApplicationDetail?.whatsappNumber} />
													<DetailField label="SMS Number" value={detailQuery.data.creditApplicationDetail?.smsNumber} />
												</CardContent>
											</Card>
										</TabsContent>
										<TabsContent value="product" className="mt-3 space-y-3">
											<Card>
												<CardHeader>
													<CardTitle className="text-base">Product Data</CardTitle>
													<CardDescription>Full product and collateral data from credit application.</CardDescription>
												</CardHeader>
												<CardContent className="space-y-2">
													<DetailField label="Product Code" value={detailQuery.data.creditApplicationDetail?.assetId ?? resolveCreditApplicationProductCode(detailQuery.data.relations, detailQuery.data.row.creditApplication)} mono />
													<DetailField label="Asset Name" value={detailQuery.data.creditApplicationDetail?.assetName} />
													<DetailField label="Asset Description" value={detailQuery.data.creditApplicationDetail?.assetDescription} />
													<DetailField label="Period" value={detailQuery.data.creditApplicationDetail?.period} mono />
													<DetailField label="Installment" value={detailQuery.data.creditApplicationDetail?.installment} mono />
													<DetailField label="Down Payment" value={detailQuery.data.creditApplicationDetail?.downPayment} mono />
													<DetailField label="Plafond" value={detailQuery.data.creditApplicationDetail?.plafond} mono />
													<DetailField label="Vendor" value={detailQuery.data.creditApplicationDetail?.vendor} />
													<DetailField label="Collateral Registry Name" value={detailQuery.data.creditApplicationDetail?.collateralRegistryName} />
													<DetailField label="Collateral Name" value={detailQuery.data.creditApplicationDetail?.collateralName} />
													<DetailField label="Collateral Description" value={detailQuery.data.creditApplicationDetail?.collateralDescription} />
													<DetailField label="Remarks" value={detailQuery.data.creditApplicationDetail?.remarks} />
													<DetailField label="Others" value={detailQuery.data.creditApplicationDetail?.others} />
													<DetailField label="Other Text 1" value={detailQuery.data.creditApplicationDetail?.otherText1} />
													<DetailField label="Other Text 2" value={detailQuery.data.creditApplicationDetail?.otherText2} />
													<DetailField label="Other Number 1" value={detailQuery.data.creditApplicationDetail?.otherNumber1} mono />
													<DetailField label="Other Number 2" value={detailQuery.data.creditApplicationDetail?.otherNumber2} mono />
													<DetailField label="Other Date 1" value={detailQuery.data.creditApplicationDetail?.otherDate1} mono />
													<DetailField label="Other Date 2" value={detailQuery.data.creditApplicationDetail?.otherDate2} mono />
												</CardContent>
											</Card>
										</TabsContent>
									</Tabs>
								</div>

								<div className="overflow-y-auto pr-1">
									<SurveyAnswerPreview template={detailQuery.data.surveyTemplate} answers={detailQuery.data.row.answers} />
								</div>
							</div>
						)}
					</div>
					<DrawerFooter className="border-t sm:flex-row sm:items-center sm:justify-end">
						{detailDownloadErrorMessage != null ? (
							<p className="text-destructive text-sm sm:mr-auto">{detailDownloadErrorMessage}</p>
						) : null}
						<Button
							type="button"
							variant="secondary"
							onClick={handleDownloadDetail}
							disabled={detailId == null || detailQuery.isPending || isDetailDownloading}
						>
							{isDetailDownloading ? "Downloading..." : "Download XLSX"}
						</Button>
						<Button type="button" variant="outline" onClick={() => handleDetailOpenChange(false)}>Close</Button>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		</DashboardManagementPageFrame>
	);
}
