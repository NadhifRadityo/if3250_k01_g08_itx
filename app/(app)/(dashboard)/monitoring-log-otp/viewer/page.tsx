"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { DashboardManagementPageFrame, DashboardManagementToolbar } from "../../layout.components";
import {
	applyOTPLogFilters,
	OTPLogColumnConfigCard,
	OTPLogFiltersCard,
	OTPLogTable,
	useOTPLogColumnPreferences,
	useOTPLogFilters,
} from "../layout.components";
import { queryOTPLogViewerAction } from "../layout.action";

export default function MonitoringOTPLogViewerPage() {
	const [keyword, setKeyword] = useState("");
	const columns = useOTPLogColumnPreferences();
	const filters = useOTPLogFilters();

	const query = useQuery({
		queryKey: ["otp-logs", keyword],
		queryFn: () => queryOTPLogViewerAction({ keyword }),
	});

	const rows = useMemo(() => {
		return applyOTPLogFilters(query.data?.docs ?? [], filters.appliedFilters);
	}, [query.data?.docs, filters.appliedFilters]);

	return (
		<DashboardManagementPageFrame
			title="OTP Logs"
			description="Monitor OTP and OTP delivery logs."
		>
			<div className="space-y-4">
				<DashboardManagementToolbar
					keyword={keyword}
					onKeywordChange={setKeyword}
					searchPlaceholder="Search by officer, apply ID, phone, email, or content"
					filterCount={filters.appliedFilters.length}
					onToggleFilter={() => filters.setIsFilterOpen(current => !current)}
					onToggleColumns={() => columns.setIsColumnOpen(current => !current)}
					isLoading={query.isLoading}
					isMutating={query.isFetching}
				/>

				<OTPLogFiltersCard
					isLoading={query.isLoading}
					isMutating={query.isFetching}
					filters={filters}
				/>

				<OTPLogColumnConfigCard
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

				<OTPLogTable
					rows={rows}
					columns={columns.visibleColumns}
					isLoading={query.isLoading}
				/>
			</div>
		</DashboardManagementPageFrame>
	);
}
