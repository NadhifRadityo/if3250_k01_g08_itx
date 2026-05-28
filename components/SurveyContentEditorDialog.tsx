"use client";

import * as React from "react";

import cn from "@/utils/cn";
import FormEditor from "@/components/FormEditor";
import { Button } from "@/components/radix/Button";
import { Dialog, DialogTitle, DialogHeader, DialogContent, DialogDescription } from "@/components/radix/Dialog";

export function SurveyContentEditorDialog(
	{ buttonClassName, buttonLabel, description, dialogTitle, disabled = false, onValueChange, value }:
	{ buttonClassName?: string, buttonLabel?: string, description?: string, dialogTitle: string, disabled?: boolean, onValueChange?: (value: any) => void, value: any }
) {
	const [open, setOpen] = React.useState(false);
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<Button
				type="button"
				variant="outline"
				onClick={() => setOpen(true)}
				className={cn("py-1 h-auto justify-start whitespace-normal text-left", buttonClassName)}
			>
				{buttonLabel ?? (!disabled ? "Edit content" : "View content")}
			</Button>
			<DialogContent className="sm:max-w-[95vw] w-[95vw] max-h-[90vh] overflow-hidden p-0">
				<div className="flex h-[90vh] flex-col">
					<DialogHeader className="border-b px-4 py-3">
						<DialogTitle>{dialogTitle}</DialogTitle>
						<DialogDescription>
							{description ?? (!disabled ? "Edit the survey schema and keep the JSON content in sync with the parent survey state." : "Review the survey schema in a read-only editor view.")}
						</DialogDescription>
					</DialogHeader>
					<div className="flex-1 overflow-auto p-4 max-h-full">
						<FormEditor
							disabled={disabled}
							onChange={onValueChange}
							value={value}
						/>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export default SurveyContentEditorDialog;
