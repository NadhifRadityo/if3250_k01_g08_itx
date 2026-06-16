// Shared type definitions for statistics actions/components. These types are
// designed to be partial on every key so that each statistic can be
// individually omitted by the server (e.g. when a future access-control rule
// hides that field) without breaking the consumer component.

export type StatNumberData = {
	value: number;
	subtext?: string | null;
};
export type StatBucketData = {
	items: {
		key: string;
		label?: string | null;
		count: number;
		filterValue?: any;
	}[];
	totalCount?: number;
	filterColumnKey?: string;
};
export type StatHistogramBin = {
	binStart: number;
	binEnd: number;
	count: number;
	label?: string | null;
};
export type StatHistogramData = {
	bins: StatHistogramBin[];
	unit?: string | null;
	filterColumnKey?: string;
};
export type StatSeriesPoint = {
	bucket: string;
	count: number;
	bucketStart?: string;
	bucketEnd?: string;
};
export type StatSeriesData = {
	points: StatSeriesPoint[];
	intervalLabel?: string | null;
	filterColumnKey?: string;
};
export type StatHeatmapData = {
	cells: { x: number, y: number, count: number }[];
	xLabels: string[];
	yLabels: string[];
};
export type StatReviewStatusData = {
	approved: number;
	pending: number;
	rejected: number;
};
export type StatPendingReviewData = {
	count: number;
	oldestAgeMs: number | null;
	avgAgeMs: number | null;
};

export type StatsLayoutCardConfig = {
	key: string;
	hidden?: boolean;
	span?: 1 | 2 | 3 | 4;
};
export type StatsLayoutConfig = {
	order: string[];
	cards: Record<string, StatsLayoutCardConfig>;
};
