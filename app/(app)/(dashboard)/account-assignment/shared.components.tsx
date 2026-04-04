 "use client";

import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react";

import { Button } from "@/components/radix/Button";

export function AccountAssignmentPagination({
	page,
	totalPages,
	total,
	showing,
	onPage
}: {
	page: number;
	totalPages: number;
	total: number;
	showing: number;
	onPage: (page: number) => void;
}) {
	const safeTotalPages = Math.max(totalPages, 1);
	const pages = Array.from({ length: safeTotalPages }, (_, index) => index + 1);

	return (
		<div className="flex items-center justify-between border-t pt-3 text-sm text-muted-foreground">
			<span className="text-xs font-medium tracking-wide uppercase">
				Showing {showing} of {total} records
			</span>
			<div className="flex items-center gap-1">
				<Button variant="ghost" size="icon" className="size-8" onClick={() => onPage(1)} disabled={page <= 1}>
					<ChevronsLeftIcon className="size-4" />
				</Button>
				<Button variant="ghost" size="icon" className="size-8" onClick={() => onPage(page - 1)} disabled={page <= 1}>
					<ChevronLeftIcon className="size-4" />
				</Button>
				{pages.map(pageNumber => (
					<Button
						key={pageNumber}
						variant={pageNumber == page ? "default" : "ghost"}
						size="icon"
						className="size-8 text-xs"
						onClick={() => onPage(pageNumber)}
					>
						{pageNumber}
					</Button>
				))}
				<Button variant="ghost" size="icon" className="size-8" onClick={() => onPage(page + 1)} disabled={page >= safeTotalPages}>
					<ChevronRightIcon className="size-4" />
				</Button>
				<Button variant="ghost" size="icon" className="size-8" onClick={() => onPage(safeTotalPages)} disabled={page >= safeTotalPages}>
					<ChevronsRightIcon className="size-4" />
				</Button>
			</div>
		</div>
	);
}

export function parseErrorMessage(error: unknown, fallbackMessage: string): string {
	if(error instanceof Error && error.message.trim().length > 0)
		return error.message;
	return fallbackMessage;
}
