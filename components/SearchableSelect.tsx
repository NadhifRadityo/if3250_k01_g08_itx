"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDownIcon } from "lucide-react";

import cn from "@/utils/cn";

import { Button } from "./Button";
import {
	Command,
	CommandItem,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandInput
} from "./Command";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";

export type SearchableSelectOption = {
	value: string;
	label: string;
	keywords?: string;
};

type SearchableSelectProps = {
	value: string;
	onValueChange: (value: string) => void;
	options: SearchableSelectOption[];
	placeholder: string;
	searchPlaceholder?: string;
	emptyText?: string;
	disabled?: boolean;
	className?: string;
	allowClear?: boolean;
	clearLabel?: string;
};

type SearchableMultiSelectProps = {
	values: string[];
	onValuesChange: (values: string[]) => void;
	options: SearchableSelectOption[];
	placeholder: string;
	searchPlaceholder?: string;
	emptyText?: string;
	disabled?: boolean;
	className?: string;
};

export function SearchableSelect({
	value,
	onValueChange,
	options,
	placeholder,
	searchPlaceholder = "Search...",
	emptyText = "No results found.",
	disabled = false,
	className,
	allowClear = false,
	clearLabel = "Clear"
}: SearchableSelectProps) {
	const [open, setOpen] = useState(false);
	const selectedOption = options.find(option => option.value == value);

	return (
		<Popover open={open} onOpenChange={setOpen}>
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
				<Command>
					<CommandInput placeholder={searchPlaceholder} />
					<CommandList>
						<CommandEmpty>{emptyText}</CommandEmpty>
						<CommandGroup>
							{allowClear ? (
								<CommandItem
									value={clearLabel}
									onSelect={() => {
										onValueChange("");
										setOpen(false);
									}}
								>
									{clearLabel}
								</CommandItem>
							) : null}
							{options.map(option => (
								<CommandItem
									key={option.value}
									data-checked={option.value == value}
									value={`${option.label} ${option.keywords ?? ""}`.trim()}
									onSelect={() => {
										onValueChange(option.value);
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
	placeholder,
	searchPlaceholder = "Search...",
	emptyText = "No results found.",
	disabled = false,
	className
}: SearchableMultiSelectProps) {
	const [open, setOpen] = useState(false);

	const valueSet = useMemo(() => new Set(values), [values]);
	const selectedLabels = useMemo(() => options
		.filter(option => valueSet.has(option.value))
		.map(option => option.label), [options, valueSet]);

	const toggleValue = (value: string) => {
		if(valueSet.has(value)) {
			onValuesChange(values.filter(item => item != value));
			return;
		}
		onValuesChange([...values, value]);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
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
				<Command>
					<CommandInput placeholder={searchPlaceholder} />
					<CommandList>
						<CommandEmpty>{emptyText}</CommandEmpty>
						<CommandGroup>
							{options.map(option => {
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
