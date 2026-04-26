"use client";

import { useState, useCallback, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { EyeIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/radix/Button";
import { Input } from "@/components/radix/Input";
import { DashboardManagementPageFrame } from "@/app/(app)/(dashboard)/layout.components";

import * as sqhActions from "../layout.actions";
import type { SurveyHeaderTableRow } from "../layout.components";
import {
	useSurveyHeaderQuery,
	SurveyHeaderTable,
	SurveyHeaderDetailsDrawer,
	SurveyHeaderReviewDrawer,
	SurveyHeaderPagination,
	resolveActionError,
	type ActionError
} from "../layout.components";

export default function SurveyQuestionHeaderCheckerPage() {
	const qc = useQueryClient();

	// ── search / pagination ──────────────────────────────────────────────
	const [keyword, setKeyword] = useState("");
	const [pageIndex, setPageIndex] = useState(1);

	const { queryResult, isLoading, queryErrorMessage } = useSurveyHeaderQuery({
		queryScope: "checker",
		queryAction: (input) => sqhActions.querySurveyHeadersCheckerAction(input),
		keyword,
		pageIndex
	});

	// ── details drawer ───────────────────────────────────────────────────
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [detailsRow, setDetailsRow] = useState<SurveyHeaderTableRow | null>(null);
	const openDetails = useCallback((row: SurveyHeaderTableRow) => { setDetailsRow(row); setDetailsOpen(true); }, []);

	// ── review drawer ────────────────────────────────────────────────────
	const [reviewOpen, setReviewOpen] = useState(false);
	const [reviewRow, setReviewRow] = useState<SurveyHeaderTableRow | null>(null);
	const [reviewReason, setReviewReason] = useState("");
	const [reviewError, setReviewError] = useState<ActionError | null>(null);
	const [isPending, startTransition] = useTransition();

	const openReview = useCallback((row: SurveyHeaderTableRow) => { setReviewRow(row); setReviewReason(""); setReviewError(null); setReviewOpen(true); }, []);

	const handleDecision = useCallback((decision: "approve" | "reject") => {
		if(!reviewRow) return;
		startTransition(async () => {
			try {
				await sqhActions.reviewSurveyHeaderAction({ headerId: reviewRow.id, decision, reason: reviewReason });
				await qc.invalidateQueries({ queryKey: ["survey-header-management"] });
				setReviewOpen(false);
			} catch(e) { setReviewError(resolveActionError(e, `Failed to ${decision} request.`)); }
		});
	}, [reviewRow, reviewReason, qc]);

	const isMutating = isPending;

	const renderActions = useCallback((row: SurveyHeaderTableRow) => (
		<>
			<Button type="button" size="sm" variant="outline" onClick={() => openReview(row)}><EyeIcon className="h-4 w-4" />Review</Button>
		</>
	), [openReview]);

	return (
		<DashboardManagementPageFrame title="Survey Question Header - Checker" description="Review survey question header requests.">
			<div className="space-y-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="relative flex-1 max-w-sm">
						<SearchIcon className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
						<Input className="pl-9" value={keyword} onChange={e => { setKeyword(e.target.value); setPageIndex(1); }} placeholder="Search pending headers…" />
					</div>
				</div>
				{queryErrorMessage != null && <p className="text-destructive text-sm">{queryErrorMessage}</p>}
				<SurveyHeaderTable queryResult={queryResult} isLoading={isLoading} isMutating={isMutating} onOpenDetails={openDetails} renderActions={renderActions} />
				<SurveyHeaderPagination pageIndex={pageIndex} totalDocs={queryResult.totalDocs} hasPreviousPage={queryResult.hasPreviousPage} hasNextPage={queryResult.hasNextPage} isLoading={isLoading} isMutating={isMutating} onPrevious={() => setPageIndex(p => Math.max(1, p - 1))} onNext={() => setPageIndex(p => p + 1)} />
			</div>

			<SurveyHeaderDetailsDrawer open={detailsOpen} onOpenChange={setDetailsOpen} row={detailsRow} renderActions={row => <Button type="button" size="sm" onClick={() => { setDetailsOpen(false); openReview(row); }}>Review</Button>} />
			<SurveyHeaderReviewDrawer open={reviewOpen} onOpenChange={setReviewOpen} row={reviewRow} reviewReason={reviewReason} onReviewReasonChange={setReviewReason} onApprove={() => handleDecision("approve")} onReject={() => handleDecision("reject")} isMutating={isMutating} reviewError={reviewError} />
		</DashboardManagementPageFrame>
	);
}
