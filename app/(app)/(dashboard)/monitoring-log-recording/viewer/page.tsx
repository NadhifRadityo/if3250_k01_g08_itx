"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { DashboardManagementPageFrame, DashboardManagementToolbar } from "../../layout.components";
import {
	applyRecordingLogFilters,
	RecordingLogColumnConfigCard,
	RecordingLogFiltersCard,
	RecordingLogTable,
	useRecordingLogColumnPreferences,
	useRecordingLogFilters
} from "../layout.components";
import { queryRecordingLogViewerAction } from "../layout.action";

export default function MonitoringLogRecordingViewerPage() {
	const [keyword, setKeyword] = useState("");
	const { data, isLoading } = useQuery({
		queryKey: ["monitoring-log-recording", "viewer", keyword],
		queryFn: () => queryRecordingLogViewerAction({ keyword })
	});
	const columnPreferences = useRecordingLogColumnPreferences();
	const filters = useRecordingLogFilters();
	const filteredRows = useMemo(() => {
		return applyRecordingLogFilters(data?.docs ?? [], filters.appliedFilters);
	}, [data?.docs, filters.appliedFilters]);

	return (
		<DashboardManagementPageFrame
			title="Monitoring Log Recording"
			description="Monitor officer recording logs from the latest sync."
		>
			<DashboardManagementToolbar
				keyword={keyword}
				onKeywordChange={setKeyword}
				searchPlaceholder="Search by officer, apply ID, phone, or file"
				filterCount={filters.appliedFilters.length}
				onToggleFilter={() => filters.setIsFilterOpen(previous => !previous)}
				onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
				isLoading={isLoading}
				isMutating={false}
			/>
			<RecordingLogFiltersCard
				isLoading={isLoading}
				isMutating={false}
				filters={filters}
			/>
			<RecordingLogColumnConfigCard
				isOpen={columnPreferences.isColumnOpen}
				onOpenChange={columnPreferences.setIsColumnOpen}
				orderedColumns={columnPreferences.orderedColumns}
				hiddenColumnIds={columnPreferences.hiddenColumns}
				visibleColumnCount={columnPreferences.visibleColumns.length}
				onToggleColumnVisibility={columnPreferences.onToggleColumnVisibility}
				onReset={columnPreferences.onResetColumns}
				onColumnDragStart={columnPreferences.onColumnDragStart}
				onColumnDragOver={columnPreferences.onColumnDragOver}
				onColumnDragEnd={columnPreferences.onColumnDragEnd}
			/>
			<RecordingLogTable rows={isLoading ? [] : filteredRows} columns={columnPreferences.visibleColumns} />
		</DashboardManagementPageFrame>
	);
}
