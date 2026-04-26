"use client";

import * as React from "react";
import { Clock3Icon, CalendarDaysIcon } from "lucide-react";

import cn from "@/utils/cn";
import { Button } from "@/components/radix/Button";
import { Calendar } from "@/components/radix/Calendar";
import {
	InputGroup,
	InputGroupText,
	InputGroupAddon,
	InputGroupInput
} from "@/components/radix/InputGroup";
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from "@/components/radix/Popover";
import { ScrollBar, ScrollArea } from "@/components/radix/ScrollArea";

export type DatetimeInputMode = "date" | "time" | "datetime";
export type DatetimeInputPrecision = "minute" | "second";

export type DatetimeInputProps = Omit<
	React.ComponentProps<"input">,
	"children" | "onChange" | "type" | "value"
> & {
	mode: DatetimeInputMode;
	precision?: DatetimeInputPrecision;
	value?: string | null;
	onChange?: (value: string) => void;
	popoverContentClassName?: string;
};

type DatetimeSegments = {
	day: string;
	month: string;
	year: string;
	hour: string;
	minute: string;
	second: string;
};

type SegmentKey = keyof DatetimeSegments;

const emptySegments: DatetimeSegments = {
	day: "",
	month: "",
	year: "",
	hour: "",
	minute: "",
	second: ""
};

function parseDatetimeValue(value: string | number | null | undefined, mode: DatetimeInputMode): Date | null {
	if(typeof value == "number")
		value = `${value}`;
	const trimmed = value?.trim() ?? "";
	if(trimmed.length == 0)
		return null;

	if(mode == "date") {
		const parsed = new Date(`${trimmed}T00:00:00`);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}

	if(mode == "time") {
		const [rawHours, rawMinutes, rawSeconds = "0"] = trimmed.split(":");
		const hours = Number(rawHours);
		const minutes = Number(rawMinutes);
		const seconds = Number(rawSeconds);
		if(!Number.isInteger(hours) || !Number.isInteger(minutes) || !Number.isInteger(seconds))
			return null;

		const parsed = new Date();
		parsed.setHours(hours, minutes, seconds, 0);
		return parsed;
	}

	const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
	const parsed = new Date(normalized);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDatePart(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatTimePart(date: Date, precision: DatetimeInputPrecision): string {
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	const seconds = String(date.getSeconds()).padStart(2, "0");
	return precision == "second" ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;
}

function formatDatetimeValue(date: Date, mode: DatetimeInputMode, precision: DatetimeInputPrecision): string {
	if(mode == "date")
		return formatDatePart(date);
	if(mode == "time")
		return formatTimePart(date, precision);
	return `${formatDatePart(date)}T${formatTimePart(date, precision)}`;
}

function buildNextDate(baseDate: Date | null, mode: DatetimeInputMode): Date {
	if(baseDate != null)
		return new Date(baseDate);
	const nextDate = new Date();
	if(mode == "date")
		nextDate.setHours(0, 0, 0, 0);
	return nextDate;
}

function getWeekdayLabel(date: Date | null, mode: DatetimeInputMode): string {
	if(mode == "time")
		return "Time";
	if(date == null)
		return "Day";
	return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

function getSegmentsFromDate(date: Date | null, precision: DatetimeInputPrecision): DatetimeSegments {
	if(date == null)
		return emptySegments;

	return {
		day: String(date.getDate()).padStart(2, "0"),
		month: String(date.getMonth() + 1).padStart(2, "0"),
		year: String(date.getFullYear()),
		hour: String(date.getHours()).padStart(2, "0"),
		minute: String(date.getMinutes()).padStart(2, "0"),
		second: precision == "second" ? String(date.getSeconds()).padStart(2, "0") : ""
	};
}

function sanitizeSegmentValue(rawValue: string, maxLength: number): string {
	return rawValue.replaceAll(/\D+/g, "").slice(0, maxLength);
}

function getSegmentMaxLength(segment: SegmentKey): number {
	return segment == "year" ? 4 : 2;
}

function getSegmentNumericValue(value: string, min: number, max: number): number | null {
	if(value.length == 0)
		return null;
	const parsed = Number(value);
	if(!Number.isInteger(parsed) || parsed < min || parsed > max)
		return null;
	return parsed;
}

function getDaysInMonth(year: number, month: number): number {
	return new Date(year, month, 0).getDate();
}

function buildDateFromSegments(
	segments: DatetimeSegments,
	mode: DatetimeInputMode,
	precision: DatetimeInputPrecision
): Date | null {
	const hour = getSegmentNumericValue(segments.hour, 0, 23);
	const minute = getSegmentNumericValue(segments.minute, 0, 59);
	const second = precision == "second" ? getSegmentNumericValue(segments.second, 0, 59) : 0;

	if(mode == "time") {
		if(hour == null || minute == null || second == null)
			return null;
		const nextDate = new Date();
		nextDate.setHours(hour, minute, second, 0);
		return nextDate;
	}

	const day = getSegmentNumericValue(segments.day, 1, 31);
	const month = getSegmentNumericValue(segments.month, 1, 12);
	const year = getSegmentNumericValue(segments.year, 1, 9999);
	if(day == null || month == null || year == null)
		return null;

	const daysInMonth = getDaysInMonth(year, month);
	if(day > daysInMonth)
		return null;

	const nextDate = new Date(year, month - 1, day);
	if(mode == "date") {
		nextDate.setHours(0, 0, 0, 0);
		return nextDate;
	}

	if(hour == null || minute == null || second == null)
		return null;
	nextDate.setHours(hour, minute, second, 0);
	return nextDate;
}

function hasAnySegmentValue(segments: DatetimeSegments, mode: DatetimeInputMode, precision: DatetimeInputPrecision): boolean {
	const segmentEntries: SegmentKey[] = mode == "date" ?
		["day", "month", "year"] :
		mode == "time" ?
			precision == "second" ? ["hour", "minute", "second"] : ["hour", "minute"] :
			precision == "second" ? ["day", "month", "year", "hour", "minute", "second"] : ["day", "month", "year", "hour", "minute"];

	return segmentEntries.some(key => segments[key].length > 0);
}

function TimeValueColumn({
	label,
	values,
	selectedValue,
	onSelect
}: {
	label: string;
	values: number[];
	selectedValue?: number;
	onSelect: (value: number) => void;
}) {
	const containerRef = React.useRef<HTMLDivElement | null>(null);
	const itemRefs = React.useRef<Record<number, HTMLButtonElement | null>>({});
	const renderCount = React.useRef(0);

	React.useEffect(() => {
		if(selectedValue == null)
			return;
		const selectedEl = itemRefs.current[selectedValue];
		if(selectedEl != null) {
			selectedEl.scrollIntoView({
				block: "center",
				inline: "center",
				behavior: ++renderCount.current >= 2 ? "smooth" : "instant"
			});
		}
	}, [selectedValue]);

	return (
		<div className="flex flex-col border-border/60 [[data-slot=calendar]+&]:border-0 border-t sm:border-l">
			<p className="text-muted-foreground mx-2 mt-2 px-1 text-[11px] font-medium tracking-wide uppercase">{label}</p>
			<ScrollArea className="w-64 sm:h-[260px] sm:w-auto max-w-[212px]">
				<div ref={containerRef} className="flex gap-2 sm:flex-col p-2 pt-1">
					{values.map(value => (
						<Button
							key={value}
							ref={el => { itemRefs.current[value] = el; }}
							type="button"
							size="icon"
							variant={selectedValue == value ? "default" : "ghost"}
							className="w-7 h-7 aspect-square border-0 rounded-[10px] focus:ring-[3px] focus:ring-ring/50 flex shrink-0 sm:w-full"
							onClick={() => onSelect(value)}
						>
							{value.toString().padStart(2, "0")}
						</Button>
					))}
				</div>
				<ScrollBar orientation="horizontal" className="sm:hidden" />
			</ScrollArea>
		</div>
	);
}

function SegmentSeparator({ children }: { children: React.ReactNode }) {
	return <InputGroupText className="px-0 text-xs font-semibold">{children}</InputGroupText>;
}

function SegmentInput({
	ariaInvalid,
	className,
	disabled,
	id,
	maxLength,
	onBlur,
	onChange,
	placeholder,
	value
}: {
	ariaInvalid?: React.InputHTMLAttributes<HTMLInputElement>["aria-invalid"];
	className?: string;
	disabled?: boolean;
	id?: string;
	maxLength: number;
	onBlur?: React.FocusEventHandler<HTMLInputElement>;
	onChange: React.ChangeEventHandler<HTMLInputElement>;
	placeholder: string;
	value: string;
}) {
	return (
		<InputGroupInput
			aria-invalid={ariaInvalid}
			className={cn("min-w-0 px-1 text-center tabular-nums", className)}
			disabled={disabled}
			id={id}
			inputMode="numeric"
			maxLength={maxLength}
			onBlur={onBlur}
			onClick={event => {
				event.stopPropagation();
			}}
			onFocus={event => {
				event.stopPropagation();
			}}
			onPointerDown={event => {
				event.stopPropagation();
			}}
			onChange={onChange}
			placeholder={placeholder}
			type="text"
			value={value}
		/>
	);
}

export function DatetimeInput({
	"aria-invalid": ariaInvalid,
	className,
	disabled,
	id,
	max,
	min,
	mode,
	name,
	onBlur,
	onChange,
	popoverContentClassName,
	precision = "minute",
	value
}: DatetimeInputProps) {
	const [isOpen, setIsOpen] = React.useState(false);
	const parsedValue = React.useMemo(() => parseDatetimeValue(value, mode), [mode, value]);
	const normalizedExternalValue = React.useMemo(
		() => parsedValue == null ? "" : formatDatetimeValue(parsedValue, mode, precision),
		[mode, parsedValue, precision]
	);
	const [segments, setSegments] = React.useState<DatetimeSegments>(() => getSegmentsFromDate(parsedValue, precision));
	const showsCalendar = mode == "date" || mode == "datetime";
	const showsTime = mode == "time" || mode == "datetime";
	const icon = mode == "time" ? <Clock3Icon className="size-4" /> : <CalendarDaysIcon className="size-4" />;
	const selectedDate = React.useMemo(() => buildDateFromSegments(segments, mode, precision) ?? parsedValue ?? null, [mode, parsedValue, precision, segments]);
	const weekdayLabel = React.useMemo(() => getWeekdayLabel(selectedDate, mode), [mode, selectedDate]);
	const minDate = React.useMemo(() => showsCalendar ? parseDatetimeValue(min, mode == "datetime" ? "datetime" : "date") : null, [min, mode, showsCalendar]);
	const maxDate = React.useMemo(() => showsCalendar ? parseDatetimeValue(max, mode == "datetime" ? "datetime" : "date") : null, [max, mode, showsCalendar]);

	React.useEffect(() => {
		setSegments(getSegmentsFromDate(parsedValue, precision));
	}, [normalizedExternalValue, parsedValue, precision]);

	const commitDate = React.useCallback((nextDate: Date | null) => {
		onChange?.(nextDate == null ? "" : formatDatetimeValue(nextDate, mode, precision));
	}, [mode, onChange, precision]);

	const updateSegments = React.useCallback((updater: (current: DatetimeSegments) => DatetimeSegments) => {
		setSegments(current => {
			const nextSegments = updater(current);
			const nextDate = buildDateFromSegments(nextSegments, mode, precision);
			if(nextDate != null)
				commitDate(nextDate);
			else if(!hasAnySegmentValue(nextSegments, mode, precision))
				commitDate(null);
			return nextSegments;
		});
	}, [commitDate, mode, precision]);

	const handleSegmentChange = React.useCallback((segment: SegmentKey, rawValue: string) => {
		updateSegments(current => ({
			...current,
			[segment]: sanitizeSegmentValue(rawValue, getSegmentMaxLength(segment))
		}));
	}, [updateSegments]);

	const handleCalendarSelect = React.useCallback((nextSelection: Date | undefined) => {
		if(nextSelection == null) {
			setSegments(emptySegments);
			commitDate(null);
			return;
		}

		const baseDate = buildNextDate(selectedDate, mode);
		const nextDate = new Date(nextSelection);
		if(mode == "datetime")
			nextDate.setHours(baseDate.getHours(), baseDate.getMinutes(), precision == "second" ? baseDate.getSeconds() : 0, 0);
		else
			nextDate.setHours(0, 0, 0, 0);

		setSegments(getSegmentsFromDate(nextDate, precision));
		commitDate(nextDate);
	}, [commitDate, mode, precision, selectedDate]);

	const handleTimeChange = React.useCallback((type: "hour" | "minute" | "second", nextValue: number) => {
		const nextDate = buildNextDate(selectedDate, mode);
		if(type == "hour")
			nextDate.setHours(nextValue);
		if(type == "minute")
			nextDate.setMinutes(nextValue);
		if(type == "second")
			nextDate.setSeconds(nextValue);
		nextDate.setMilliseconds(0);
		setSegments(getSegmentsFromDate(nextDate, precision));
		commitDate(nextDate);
	}, [commitDate, mode, precision, selectedDate]);

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<InputGroup
					className={className}
					data-disabled={disabled == true ? "true" : undefined}
				>
					<input
						disabled={disabled}
						name={name}
						readOnly
						type="hidden"
						value={normalizedExternalValue}
					/>
					{showsCalendar ? (
						<>
							<InputGroupAddon align="inline-start">
								<InputGroupText className="mt-0.5 w-8 justify-center uppercase">{weekdayLabel}</InputGroupText>
							</InputGroupAddon>
							<SegmentInput
								ariaInvalid={ariaInvalid}
								className="max-w-10"
								disabled={disabled}
								id={id}
								maxLength={2}
								onBlur={onBlur}
								onChange={event => handleSegmentChange("day", event.target.value)}
								placeholder="DD"
								value={segments.day}
							/>
							<SegmentSeparator>/</SegmentSeparator>
							<SegmentInput
								ariaInvalid={ariaInvalid}
								className="max-w-10"
								disabled={disabled}
								maxLength={2}
								onBlur={onBlur}
								onChange={event => handleSegmentChange("month", event.target.value)}
								placeholder="MM"
								value={segments.month}
							/>
							<SegmentSeparator>/</SegmentSeparator>
							<SegmentInput
								ariaInvalid={ariaInvalid}
								className="max-w-14"
								disabled={disabled}
								maxLength={4}
								onBlur={onBlur}
								onChange={event => handleSegmentChange("year", event.target.value)}
								placeholder="YYYY"
								value={segments.year}
							/>
						</>
					) : null}
					{showsCalendar && showsTime ? <SegmentSeparator> </SegmentSeparator> : null}
					{showsTime ? (
						<>
							<SegmentInput
								ariaInvalid={ariaInvalid}
								className="max-w-10"
								disabled={disabled}
								id={showsCalendar ? undefined : id}
								maxLength={2}
								onBlur={onBlur}
								onChange={event => handleSegmentChange("hour", event.target.value)}
								placeholder="HH"
								value={segments.hour}
							/>
							<SegmentSeparator>:</SegmentSeparator>
							<SegmentInput
								ariaInvalid={ariaInvalid}
								className="max-w-10"
								disabled={disabled}
								maxLength={2}
								onBlur={onBlur}
								onChange={event => handleSegmentChange("minute", event.target.value)}
								placeholder="MM"
								value={segments.minute}
							/>
							{precision == "second" ? (
								<>
									<SegmentSeparator>:</SegmentSeparator>
									<SegmentInput
										ariaInvalid={ariaInvalid}
										className="max-w-10"
										disabled={disabled}
										maxLength={2}
										onBlur={onBlur}
										onChange={event => handleSegmentChange("second", event.target.value)}
										placeholder="SS"
										value={segments.second}
									/>
								</>
							) : null}
						</>
					) : null}
					<InputGroupAddon align="inline-end" className="ml-auto">
						<InputGroupText className="justify-center">{icon}</InputGroupText>
					</InputGroupAddon>
				</InputGroup>
			</PopoverTrigger>
			<PopoverContent align="start" className={cn("w-auto p-0", popoverContentClassName)}>
				<div className="flex flex-col sm:flex-row">
					{showsCalendar ? (
						<Calendar
							captionLayout="dropdown"
							className="border-border/60 border-b sm:border-r sm:border-b-0"
							disabled={date => (
								(minDate != null && date < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) ||
								(maxDate != null && date > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()))
							)}
							autoFocus
							mode="single"
							selected={selectedDate ?? undefined}
							onSelect={handleCalendarSelect}
						/>
					) : null}
					{showsTime ? (
						<>
							<TimeValueColumn
								label="HH"
								values={Array.from({ length: 24 }, (_, index) => index)}
								selectedValue={selectedDate?.getHours()}
								onSelect={selectedValue => handleTimeChange("hour", selectedValue)}
							/>
							<TimeValueColumn
								label="MM"
								values={Array.from({ length: 60 }, (_, index) => index)}
								selectedValue={selectedDate?.getMinutes()}
								onSelect={selectedValue => handleTimeChange("minute", selectedValue)}
							/>
							{precision == "second" ? (
								<TimeValueColumn
									label="SS"
									values={Array.from({ length: 60 }, (_, index) => index)}
									selectedValue={selectedDate?.getSeconds()}
									onSelect={selectedValue => handleTimeChange("second", selectedValue)}
								/>
							) : null}
						</>
					) : null}
				</div>
			</PopoverContent>
		</Popover>
	);
}
