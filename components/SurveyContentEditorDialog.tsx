"use client";

import * as React from "react";

import cn from "@/utils/cn";
import type { JsonFormDefinition } from "@/components/Form";
import FormEditor from "@/components/FormEditor";
import { Button } from "@/components/radix/Button";
import { Dialog, DialogTitle, DialogHeader, DialogContent, DialogDescription } from "@/components/radix/Dialog";

type SurveyContentEditorDialogProps = {
	buttonClassName?: string;
	buttonLabel?: string;
	description?: string;
	dialogTitle: string;
	mode: "edit" | "readonly";
	onValueChange?: (value: any) => void;
	value: any;
};

export function SurveyContentEditorDialog({
	buttonClassName,
	buttonLabel,
	description,
	dialogTitle,
	mode,
	onValueChange,
	value
}: SurveyContentEditorDialogProps) {
	const [open, setOpen] = React.useState(false);
	const isEditable = mode == "edit";

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<Button
				type="button"
				variant="outline"
				onClick={() => setOpen(true)}
				className={cn("h-auto justify-start whitespace-normal text-left", buttonClassName)}
			>
				{buttonLabel ?? (isEditable ? "Edit content" : "View content")}
			</Button>
			<DialogContent className="sm:max-w-[95vw] w-[95vw] max-h-[90vh] overflow-hidden p-0">
				<div className="flex h-[90vh] flex-col">
					<DialogHeader className="border-b px-4 py-3">
						<DialogTitle>{dialogTitle}</DialogTitle>
						<DialogDescription>
							{description ?? (isEditable ? "Edit the survey schema and keep the JSON content in sync with the parent survey state." : "Review the survey schema in a read-only editor view.")}
						</DialogDescription>
					</DialogHeader>
					<div className="flex-1 overflow-auto p-4 max-h-full">
						<FormEditor
							mode={isEditable ? "edit" : "readonly"}
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
