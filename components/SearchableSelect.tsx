"use client";

import { useId, useRef, useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronsUpDownIcon } from "lucide-react";

import cn from "@/utils/cn";

import { Button } from "./radix/Button";
import {
	Command,
	CommandItem,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandInput
} from "./radix/Command";
import { Popover, PopoverContent, PopoverTrigger } from "./radix/Popover";

export type SearchableSelectOption = {
	value: string;
	label: string;
	keywords?: string;
};

type SearchableSelectSearchAction = (keyword: string) => Promise<SearchableSelectOption[]>;

type SearchableSelectProps = {
	value: string;
	onValueChange: (value: string) => void;
	options: SearchableSelectOption[];
	onSearch?: SearchableSelectSearchAction;
	placeholder: string;
	searchPlaceholder?: string;
	emptyText?: string;
	disabled?: boolean;
	className?: string;
	allowClear?: boolean;
	clearLabel?: string;
	searchDebounceMs?: number;
	searchRefetchInterval?: number | false;
	searchRefetchOnWindowFocus?: boolean;
};

type SearchableMultiSelectProps = {
	values: string[];
	onValuesChange: (values: string[]) => void;
	options: SearchableSelectOption[];
	onSearch?: SearchableSelectSearchAction;
	placeholder: string;
	searchPlaceholder?: string;
	emptyText?: string;
	disabled?: boolean;
	className?: string;
	searchDebounceMs?: number;
	searchRefetchInterval?: number | false;
	searchRefetchOnWindowFocus?: boolean;
};

function useDebouncedValue(value: string, debounceMs: number): string {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			setDebouncedValue(value);
		}, debounceMs);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [debounceMs, value]);

	return debouncedValue;
}

function mergeOptions(...optionGroups: SearchableSelectOption[][]): SearchableSelectOption[] {
	const byValue = new Map<string, SearchableSelectOption>();
	for(const group of optionGroups) {
		for(const option of group)
			byValue.set(option.value, option);
	}
	return [...byValue.values()];
}

export function SearchableSelect({
	value,
	onValueChange,
	options,
	onSearch,
	placeholder,
	searchPlaceholder = "Search...",
	emptyText = "No results found.",
	disabled = false,
	className,
	allowClear = false,
	clearLabel = "Clear",
	searchDebounceMs = 250,
	searchRefetchInterval = 10000,
	searchRefetchOnWindowFocus = true
}: SearchableSelectProps) {
	const [open, setOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const queryId = useId();
	const knownOptionsRef = useRef(new Map<string, SearchableSelectOption>());
	const debouncedSearchValue = useDebouncedValue(searchValue, searchDebounceMs);

	const remoteOptionsQuery = useQuery({
		queryKey: ["searchable-select", queryId, debouncedSearchValue.trim()],
		enabled: open && onSearch != null,
		queryFn: async () => {
			if(onSearch == null)
				return [];
			return onSearch(debouncedSearchValue.trim());
		},
		placeholderData: previousData => previousData,
		retry: 0,
		refetchInterval: searchRefetchInterval,
		refetchOnWindowFocus: searchRefetchOnWindowFocus
	});

	const asyncOptions = onSearch != null ? (remoteOptionsQuery.data ?? []) : [];
	const isSearching = onSearch != null && remoteOptionsQuery.isFetching;

	const mergedOptions = useMemo(() => mergeOptions(options, asyncOptions), [options, asyncOptions]);

	useEffect(() => {
		for(const option of mergedOptions)
			knownOptionsRef.current.set(option.value, option);
	}, [mergedOptions]);

	const selectedOption = value.length > 0 ?
		(mergedOptions.find(option => option.value == value) ?? knownOptionsRef.current.get(value)) :
		undefined;

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if(nextOpen)
			return;
		setSearchValue("");
	};

	const resolvedEmptyText = isSearching ? "Searching..." : emptyText;

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					role="combobox"
					aria-expanded={open}
					disabled={disabled}
					className={cn("w-full min-w-0 justify-between font-normal", selectedOption == null && "text-muted-foreground", className)}
				>
					<span className="truncate text-left">{selectedOption?.label ?? placeholder}</span>
					<ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
				<Command shouldFilter={onSearch == null}>
					<CommandInput placeholder={searchPlaceholder} value={searchValue} onValueChange={setSearchValue} />
					<CommandList>
						<CommandEmpty>{resolvedEmptyText}</CommandEmpty>
						<CommandGroup>
							{allowClear ? (
								<CommandItem
									value={clearLabel}
									onSelect={() => {
										onValueChange("");
										setSearchValue("");
										setOpen(false);
									}}
								>
									{clearLabel}
								</CommandItem>
							) : null}
							{mergedOptions.map(option => (
								<CommandItem
									key={option.value}
									data-checked={option.value == value}
									value={`${option.label} ${option.keywords ?? ""}`.trim()}
									onSelect={() => {
										onValueChange(option.value);
										setSearchValue("");
										setOpen(false);
									}}
								>
									<span className="truncate">{option.label}</span>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

export function SearchableMultiSelect({
	values,
	onValuesChange,
	options,
	onSearch,
	placeholder,
	searchPlaceholder = "Search...",
	emptyText = "No results found.",
	disabled = false,
	className,
	searchDebounceMs = 250,
	searchRefetchInterval = 10000,
	searchRefetchOnWindowFocus = true
}: SearchableMultiSelectProps) {
	const [open, setOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const queryId = useId();
	const knownOptionsRef = useRef(new Map<string, SearchableSelectOption>());
	const debouncedSearchValue = useDebouncedValue(searchValue, searchDebounceMs);

	const remoteOptionsQuery = useQuery({
		queryKey: ["searchable-multi-select", queryId, debouncedSearchValue.trim()],
		enabled: open && onSearch != null,
		queryFn: async () => {
			if(onSearch == null)
				return [];
			return onSearch(debouncedSearchValue.trim());
		},
		placeholderData: previousData => previousData,
		retry: 0,
		refetchInterval: searchRefetchInterval,
		refetchOnWindowFocus: searchRefetchOnWindowFocus
	});

	const asyncOptions = onSearch != null ? (remoteOptionsQuery.data ?? []) : [];
	const isSearching = onSearch != null && remoteOptionsQuery.isFetching;

	const valueSet = useMemo(() => new Set(values), [values]);
	const mergedOptions = useMemo(() => mergeOptions(options, asyncOptions), [options, asyncOptions]);

	useEffect(() => {
		for(const option of mergedOptions)
			knownOptionsRef.current.set(option.value, option);
	}, [mergedOptions]);

	const selectedLabels = useMemo(() => values
		.map(value => mergedOptions.find(option => option.value == value)?.label ?? knownOptionsRef.current.get(value)?.label ?? value)
		.filter(label => label.length > 0), [mergedOptions, values]);

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if(nextOpen)
			return;
		setSearchValue("");
	};

	const resolvedEmptyText = isSearching ? "Searching..." : emptyText;

	const toggleValue = (value: string) => {
		if(valueSet.has(value)) {
			onValuesChange(values.filter(item => item != value));
			return;
		}
		onValuesChange([...values, value]);
	};

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					role="combobox"
					aria-expanded={open}
					disabled={disabled}
					className={cn("w-full min-w-0 justify-between font-normal", selectedLabels.length == 0 && "text-muted-foreground", className)}
				>
					<span className="truncate text-left">
						{selectedLabels.length > 0 ? selectedLabels.join(", ") : placeholder}
					</span>
					<ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
				<Command shouldFilter={onSearch == null}>
					<CommandInput placeholder={searchPlaceholder} value={searchValue} onValueChange={setSearchValue} />
					<CommandList>
						<CommandEmpty>{resolvedEmptyText}</CommandEmpty>
						<CommandGroup>
							{mergedOptions.map(option => {
								const selected = valueSet.has(option.value);
								return (
									<CommandItem
										key={option.value}
										data-checked={selected}
										value={`${option.label} ${option.keywords ?? ""}`.trim()}
										onSelect={() => toggleValue(option.value)}
									>
										<span className="truncate">{option.label}</span>
									</CommandItem>
								);
							})}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
