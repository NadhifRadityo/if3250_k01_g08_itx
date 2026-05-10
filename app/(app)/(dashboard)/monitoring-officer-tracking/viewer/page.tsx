"use client";

import { useEffect, useMemo, useState } from "react";

import { DashboardManagementPageFrame, DashboardManagementToolbar } from "../../layout.components";
import {
	applyOfficerTrackingFilters,
	OfficerTrackingColumnConfigCard,
	OfficerTrackingFiltersCard,
	OfficerTrackingMap,
	OfficerTrackingTable,
	useOfficerTrackingColumnPreferences,
	useOfficerTrackingFilters
} from "../layout.components";
import {
	OfficerTrackingRow,
	queryOfficerTrackingViewerAction,
} from "../layout.action";

export default function MonitoringOfficerTrackingViewerPage() {
	const [keyword, setKeyword] = useState("");
	const [rows, setRows] = useState<OfficerTrackingRow[]>([]);
	const [selectedOfficer, setSelectedOfficer] = useState<OfficerTrackingRow | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const columnPreferences = useOfficerTrackingColumnPreferences();
	const filters = useOfficerTrackingFilters();

	useEffect(() => {
		async function fetchData() {
			setIsLoading(true);
			const result = await queryOfficerTrackingViewerAction();
			setRows(result.docs);
			setSelectedOfficer(result.docs[0] ?? null);
			setIsLoading(false);
		}

		fetchData();
	}, []);

	const keywordFilteredRows = useMemo(() => {
		const normalized = keyword.trim().toLowerCase();

		if (normalized.length === 0) return rows;

		return rows.filter(row => (
			row.officerName.toLowerCase().includes(normalized) ||
			row.teamName.toLowerCase().includes(normalized) ||
			row.location.toLowerCase().includes(normalized)
		));
	}, [keyword, rows]);

	const filteredRows = useMemo(() => {
		return applyOfficerTrackingFilters(keywordFilteredRows, filters.appliedFilters);
	}, [filters.appliedFilters, keywordFilteredRows]);

	return (
		<DashboardManagementPageFrame
			title="Monitoring Officer Tracking"
			description="Monitor latest officer GPS position and movement history."
		>
			<DashboardManagementToolbar
				keyword={keyword}
				onKeywordChange={setKeyword}
				searchPlaceholder="Search officer by name, team, or location"
				filterCount={filters.appliedFilters.length}
				onToggleFilter={() => filters.setIsFilterOpen(previous => !previous)}
				onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
				isLoading={isLoading}
				isMutating={false}
			/>
			<OfficerTrackingFiltersCard
				isLoading={isLoading}
				isMutating={false}
				filters={filters}
			/>
			<OfficerTrackingColumnConfigCard
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
			<OfficerTrackingMap officer={selectedOfficer} />
			<OfficerTrackingTable
				rows={filteredRows}
				isLoading={isLoading}
				columns={columnPreferences.visibleColumns}
				selectedOfficerId={selectedOfficer?.id}
				onTrackOfficer={setSelectedOfficer}
			/>
		</DashboardManagementPageFrame>
	);
}
