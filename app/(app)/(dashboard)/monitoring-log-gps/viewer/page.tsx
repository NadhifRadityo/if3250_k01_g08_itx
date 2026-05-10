"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { DashboardManagementPageFrame, DashboardManagementToolbar } from "../../layout.components";
import {
	applyGpsLogFilters,
	GpsLogColumnConfigCard,
	GpsLogFiltersCard,
	GpsLogTable,
	useGpsLogColumnPreferences,
	useGpsLogFilters,
} from "../layout.components";
import { queryGpsLogViewerAction } from "../layout.action";

export default function MonitoringGpsLogViewerPage() {
	const [keyword, setKeyword] = useState("");
	const columns = useGpsLogColumnPreferences();
	const filters = useGpsLogFilters();

	const query = useQuery({
		queryKey: ["gps-request-logs", keyword],
		queryFn: () => queryGpsLogViewerAction({ keyword }),
	});

	const rows = useMemo(() => {
		return applyGpsLogFilters(query.data?.docs ?? [], filters.appliedFilters);
	}, [query.data?.docs, filters.appliedFilters]);

	return (
		<DashboardManagementPageFrame
			title="GPS Request Logs"
			description="View GPS request history from officer tracking logs."
		>
			<DashboardManagementToolbar
				keyword={keyword}
				onKeywordChange={setKeyword}
				searchPlaceholder="Search officer, apply ID, coordinate, or IP"
				filterCount={filters.appliedFilters.length}
				onToggleFilter={() => filters.setIsFilterOpen(previous => !previous)}
				onToggleColumns={() => columns.setIsColumnOpen(previous => !previous)}
				isLoading={query.isLoading}
				isMutating={query.isFetching}
			/>
			<GpsLogFiltersCard
				isLoading={query.isLoading}
				isMutating={query.isFetching}
				filters={filters}
			/>
			<GpsLogColumnConfigCard
				isOpen={columns.isColumnOpen}
				onOpenChange={columns.setIsColumnOpen}
				orderedColumns={columns.orderedColumns}
				hiddenColumnIds={columns.hiddenColumns}
				visibleColumnCount={columns.visibleColumns.length}
				onToggleColumnVisibility={columns.onToggleColumnVisibility}
				onReset={columns.onResetColumns}
				onColumnDragStart={columns.onColumnDragStart}
				onColumnDragOver={columns.onColumnDragOver}
				onColumnDragEnd={columns.onColumnDragEnd}
			/>
			<GpsLogTable rows={rows} columns={columns.visibleColumns} />
		</DashboardManagementPageFrame>
	);
}
