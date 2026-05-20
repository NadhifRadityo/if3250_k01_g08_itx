"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Drawer, DrawerTitle, DrawerFooter, DrawerHeader, DrawerContent, DrawerDescription } from "@/components/radix/Drawer";
import { Skeleton } from "@/components/radix/Skeleton";

import { MenuPage, MenuToolbar, MenuPagination, MenuFilterState, useConfigStorage, MenuFilterSummary, DashboardMenuTable, MenuColumnConfigCard, MenuFilterConfigCard, MenuTableConfigColumn, MenuColumnConfigColumn, MenuFilterConfigColumn, useMenuRowValueRenderer, MenuRowValueRendererConfigColumn, defaultRelationCreditApplicationRenderer, MenuRowValueRendererContext } from "../layout.components";
import { searchRelationOtpLogsAction, searchRelationCreditApplicationsAction } from "../relation-navigation.actions";
import { RelationNavigationProvider } from "../relation-navigation.components";
import { RelationValues, getDetailsAction, queryReportingAction, queryMonitoringAction } from "./layout.actions";

export type ColumnData = Awaited<ReturnType<typeof queryMonitoringAction>>["docs"][number];
export const deliveryStatusSelectOptions = Object.freeze([
	{ value: "Sent", label: "Sent" },
	{ value: "Failed", label: "Failed" },
	{ value: "Pending", label: "Pending" }
] as const);
export const filterConfigColumns = Object.freeze([
	{ key: "id", label: "Id", type: "relation", relationSearch: searchRelationOtpLogsAction },
	{ key: "createdAt", label: "Created At", type: "date" },
	{ key: "creditApplication", label: "Credit Application", type: "relation", relationSearch: searchRelationCreditApplicationsAction },
	{ key: "content", label: "Content", type: "text" },
	{ key: "email", label: "Email", type: "text" },
	{ key: "whatsappNumber", label: "WhatsApp Number", type: "text" },
	{ key: "smsNumber", label: "SMS Number", type: "text" },
	{ key: "emailDeliveryStatus", label: "Email Delivery Status", type: "select", selectOptions: deliveryStatusSelectOptions },
	{ key: "whatsappDeliveryStatus", label: "WhatsApp Delivery Status", type: "select", selectOptions: deliveryStatusSelectOptions },
	{ key: "smsDeliveryStatus", label: "SMS Delivery Status", type: "select", selectOptions: deliveryStatusSelectOptions }
] as MenuFilterConfigColumn[]);
export const columnConfigColumns = Object.freeze([
	{ key: "id", label: "Id" },
	{ key: "createdAt", label: "Created At" },
	{ key: "creditApplication", label: "Credit Application" },
	{ key: "content", label: "Content" },
	{ key: "email", label: "Email" },
	{ key: "whatsappNumber", label: "WhatsApp Number" },
	{ key: "smsNumber", label: "SMS Number" },
	{ key: "emailDeliveryStatus", label: "Email Delivery Status" },
	{ key: "whatsappDeliveryStatus", label: "WhatsApp Delivery Status" },
	{ key: "smsDeliveryStatus", label: "SMS Delivery Status" }
] as MenuColumnConfigColumn[]);
export const tableConfigColumns = Object.freeze([
	{ key: "id", label: "Id", sortable: true, className: "text-xs" },
	{ key: "createdAt", label: "Created At", sortable: true },
	{ key: "creditApplication", label: "Credit Application", sortable: false },
	{ key: "content", label: "Content", sortable: true, className: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" },
	{ key: "email", label: "Email", sortable: true },
	{ key: "whatsappNumber", label: "WhatsApp Number", sortable: true },
	{ key: "smsNumber", label: "SMS Number", sortable: true },
	{ key: "emailDeliveryStatus", label: "Email Delivery Status", sortable: true },
	{ key: "whatsappDeliveryStatus", label: "WhatsApp Delivery Status", sortable: true },
	{ key: "smsDeliveryStatus", label: "SMS Delivery Status", sortable: true }
] as MenuTableConfigColumn[]);
export const rowValueRendererConfigColumns = Object.freeze([
	{ key: "id", type: "text", render: v => (<span className="font-mono">{v}</span>) },
	{ key: "createdAt", type: "date" },
	{ key: "creditApplication", type: "relation", render: defaultRelationCreditApplicationRenderer({ description: "Credit Application", relationSource: "otp-logs.creditApplication" }) },
	{ key: "content", type: "text" },
	{ key: "email", type: "text" },
	{ key: "whatsappNumber", type: "text" },
	{ key: "smsNumber", type: "text" },
	{ key: "emailDeliveryStatus", type: "select" },
	{ key: "whatsappDeliveryStatus", type: "select" },
	{ key: "smsDeliveryStatus", type: "select" }
] as MenuRowValueRendererConfigColumn<ColumnData, RowValueRendererContext>[]);
export type RowValueRendererContext = {
	relationValues?: RelationValues;
} & MenuRowValueRendererContext;
export const eligibleDetailsTriggerColumns = Object.freeze([
	"id",
	"createdAt",
	"content",
	"email",
	"whatsappNumber",
	"smsNumber"
]);
export const drawerValueRendererConfigColumns = rowValueRendererConfigColumns;
export const defaultColumnOrder = Object.freeze([
	"id",
	"createdAt",
	"creditApplication",
	"content",
	"email",
	"whatsappNumber",
	"smsNumber",
	"emailDeliveryStatus",
	"whatsappDeliveryStatus",
	"smsDeliveryStatus"
]) as string[];
export const defaultColumnsShown = Object.freeze([
	"createdAt",
	"creditApplication",
	"content",
	"emailDeliveryStatus",
	"whatsappDeliveryStatus",
	"smsDeliveryStatus"
]) as string[];
export const defaultColumnsSort = Object.freeze([
	["createdAt", false]
]) as [string, boolean][];

export function DetailsDrawer(
	{ open, onOpenChange, row, rowValueRendererContext }:
	{ open: boolean, onOpenChange: (v: boolean) => void, row: ColumnData | null, rowValueRendererContext: RowValueRendererContext }
) {
	const query = useQuery({
		queryKey: ["otp-log", "details", row?.id ?? null],
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
					<DrawerTitle>OTP Log Details</DrawerTitle>
					<DrawerDescription>Review all available columns for this OTP log entry.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
					{row == null ? (
						<p className="text-muted-foreground text-sm">
							No OTP log selected.
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
								{`${query.error?.message ?? "Unable to load OTP log details."}`}
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

export function OtpLogPage({ mode }: { mode: "monitoring" | "reporting" }) {
	const [keyword, setKeyword] = useState("");
	const [columnOrder, setColumnOrder] = useConfigStorage({ localStorageKey: "otp-log.column-order", updateIfThisSearhParamExists: "columnOrder", defaultValue: defaultColumnOrder });
	const [columnsShown, setColumnsShown] = useConfigStorage({ localStorageKey: "otp-log.columns-shown", updateIfThisSearhParamExists: "columnsShown", defaultValue: defaultColumnsShown });
	const [columnConfigCardOpen, setColumnConfigCardOpen] = useState(false);
	const [filters, setFilters] = useConfigStorage({ localStorageKey: "otp-log.filters", updateIfThisSearhParamExists: "filters", defaultValue: [] as MenuFilterState[] });
	const [filterConfigCardOpen, setFilterConfigCardOpen] = useState(filters.length > 0);
	const [columnsSort, setColumnsSort] = useConfigStorage<[string, boolean][]>({ localStorageKey: "otp-log.columns-sort", updateIfThisSearhParamExists: "columnsSort", defaultValue: defaultColumnsSort });
	const [pageIndex, setPageIndex] = useState(1);
	const query = useQuery({
		queryKey: ["otp-log", mode, {
			keyword,
			filters,
			columnsSort,
			pageIndex
		}],
		queryFn: async () => await (mode == "reporting" ? queryReportingAction({
			keyword: keyword,
			filters: filters,
			columnsSort: columnsSort,
			pageIndex: pageIndex
		}) : queryMonitoringAction({
			keyword: keyword,
			filters: filters,
			columnsSort: columnsSort,
			pageIndex: pageIndex
		}))
	});
	const [detailsDrawerRow, setDetailsDrawerRow] = useState(null as ColumnData | null);
	const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
	const rowValueRendererContext = {
		relationValues: query.data?.relations
	};
	const renderCell = useMenuRowValueRenderer({
		columns: rowValueRendererConfigColumns,
		context: {
			...rowValueRendererContext,
			richTextCard: false,
			richTextClamp: false
		},
		detailsTriggerColumnKey: columnOrder.filter(columnKey => columnsShown.includes(columnKey))
			.find(columnKey => eligibleDetailsTriggerColumns.includes(columnKey)),
		onOpenDetails: row => {
			setDetailsDrawerOpen(true);
			setDetailsDrawerRow(row);
		}
	});

	return (
		<MenuPage
			title={mode == "reporting" ? "OTP Log Reporting" : "OTP Log Monitoring"}
			description={mode == "reporting" ? "View OTP log entries through the reporting mode." : "View OTP log entries through the monitoring mode."}
		>
			<RelationNavigationProvider>
				<MenuToolbar
					keyword={keyword}
					onKeywordChange={setKeyword}
					searchPlaceholder="Search logs by credit application, delivery target, or content"
					filterCount={filters.length}
					onToggleFilter={() => setFilterConfigCardOpen(!filterConfigCardOpen)}
					onToggleColumns={() => setColumnConfigCardOpen(!columnConfigCardOpen)}
					isLoading={query.isLoading}
				/>
				<MenuFilterConfigCard
					open={filterConfigCardOpen}
					onOpenChange={setFilterConfigCardOpen}
					columns={filterConfigColumns}
					filters={filters}
					onFiltersChange={setFilters}
					disabled={query.isLoading}
				/>
				<MenuColumnConfigCard
					open={columnConfigCardOpen}
					onOpenChange={setColumnConfigCardOpen}
					columns={columnConfigColumns}
					columnOrder={columnOrder}
					onColumnOrderChange={setColumnOrder}
					columnsShown={columnsShown}
					onColumnsShownChange={setColumnsShown}
					defaultColumnOrder={defaultColumnOrder}
					defaultColumnsShown={defaultColumnsShown}
				/>
				<MenuFilterSummary columns={filterConfigColumns} filters={filters} />
				{query.error != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>{`${query.error?.name ?? "Error"}`}</AlertTitle>
						<AlertDescription>{`${query.error?.message ?? "An error occured while querying data."}`}</AlertDescription>
					</Alert>
				) : null}
				<DashboardMenuTable
					columns={tableConfigColumns}
					columnsSort={columnsSort}
					onColumnsSortChange={setColumnsSort}
					columnOrder={columnOrder}
					columnsShown={columnsShown}
					rows={query.data?.docs ?? []}
					renderCell={renderCell}
					isLoading={query.isLoading}
				/>
				<MenuPagination
					pageIndex={pageIndex}
					totalRequests={query.data?.totalDocs ?? 0}
					hasPreviousPage={query.data?.hasPrevPage ?? false}
					hasNextPage={query.data?.hasNextPage ?? false}
					isLoading={query.isLoading}
					isMutating={false}
					onPrevious={() => setPageIndex(previous => Math.max(previous - 1, 1))}
					onNext={() => setPageIndex(previous => previous + 1)}
				/>
				<DetailsDrawer
					open={detailsDrawerOpen}
					onOpenChange={setDetailsDrawerOpen}
					row={detailsDrawerRow}
					rowValueRendererContext={rowValueRendererContext}
				/>
			</RelationNavigationProvider>
		</MenuPage>
	);
}
