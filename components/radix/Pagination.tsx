/* eslint-disable @typescript-eslint/strict-boolean-expressions */

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";

import cn from "@/utils/cn";

import { Button } from "./Button";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
	return (
		<nav
			role="navigation"
			aria-label="pagination"
			data-slot="pagination"
			className={cn(
				"cn-pagination mx-auto flex w-full justify-center",
				className
			)}
			{...props}
		/>
	);
}

function PaginationContent({
	className,
	...props
}: React.ComponentProps<"ul">) {
	return (
		<ul
			data-slot="pagination-content"
			className={cn("gap-1 flex items-center", className)}
			{...props}
		/>
	);
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
	return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
	isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, "size"> &
React.ComponentProps<"a">;

function PaginationLink({
	className,
	isActive,
	size = "icon",
	...props
}: PaginationLinkProps) {
	return (
		<Button
			asChild
			variant={isActive ? "outline" : "ghost"}
			size={size}
			className={cn("cn-pagination-link", className)}
		>
			<a
				aria-current={isActive ? "page" : undefined}
				data-slot="pagination-link"
				data-active={isActive}
				{...props}
			/>
		</Button>
	);
}

function PaginationPrevious({
	className,
	...props
}: React.ComponentProps<typeof PaginationLink>) {
	return (
		<PaginationLink
			aria-label="Go to previous page"
			size="default"
			className={cn("pl-2!", className)}
			{...props}
		>
			<ChevronLeftIcon data-icon="inline-start" />
			<span className="cn-pagination-previous-text hidden sm:block">
				Previous
			</span>
		</PaginationLink>
	);
}

function PaginationNext({
	className,
	...props
}: React.ComponentProps<typeof PaginationLink>) {
	return (
		<PaginationLink
			aria-label="Go to next page"
			size="default"
			className={cn("pr-2!", className)}
			{...props}
		>
			<span className="cn-pagination-next-text hidden sm:block">Next</span>
			<ChevronRightIcon data-icon="inline-end" />
		</PaginationLink>
	);
}

function PaginationEllipsis({
	className,
	...props
}: React.ComponentProps<"span">) {
	return (
		<span
			aria-hidden
			data-slot="pagination-ellipsis"
			className={cn(
				"size-9 items-center justify-center [&_svg:not([class*='size-'])]:size-4 flex items-center justify-center",
				className
			)}
			{...props}
		>
			<MoreHorizontalIcon />
			<span className="sr-only">More pages</span>
		</span>
	);
}

export {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious
};
