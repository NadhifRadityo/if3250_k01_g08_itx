"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SerializedEditorState } from "lexical";
import { DownloadIcon, CircleAlertIcon, FileSpreadsheetIcon } from "lucide-react";

import cn from "@/utils/cn";
import { RichTextInput, RichTextPreview } from "@/components/RichText";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { AlertDialog, AlertDialogTitle, AlertDialogAction, AlertDialogCancel, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogDescription } from "@/components/radix/AlertDialog";
import { Button } from "@/components/radix/Button";
import { Drawer, DrawerTitle, DrawerFooter, DrawerHeader, DrawerContent, DrawerDescription } from "@/components/radix/Drawer";
import { Input } from "@/components/radix/Input";
import { Skeleton } from "@/components/radix/Skeleton";
import { Table, TableRow, TableBody, TableCell, TableHead, TableHeader } from "@/components/radix/Table";
import importTemplateLogo from "@/app/_static/favicons/logo.png";
import { CreditApplicationImport } from "@/payload-types";

import { uploadGenericRichtextImage } from "../../editor-x.actions";
import { defaultStatusRenderer, MenuTableConfigColumn, MenuColumnConfigColumn, MenuFilterConfigColumn, useMenuRowValueRenderer, defaultRelationUserRenderer, MenuRowValueRendererConfigColumn, MenuRowValueRendererContext } from "../layout.components";
import { searchRelationUsersAction, searchRelationCreditApplicationImportsAction } from "../relation-navigation.actions";
import { getDetailsAction, queryViewerAction, parsePreviewAction } from "./import.actions";

export type ColumnData = Awaited<ReturnType<typeof queryViewerAction>>["docs"][number];
export type RelationValues = Awaited<ReturnType<typeof queryViewerAction>>["relations"];
export const filterConfigColumns = Object.freeze([
	{ key: "id", label: "Id", type: "relation", relationSearch: searchRelationCreditApplicationImportsAction },
	{ key: "createdAt", label: "Created At", type: "date" },
	{ key: "createdBy", label: "Created By", type: "relation", relationSearch: searchRelationUsersAction },
	{ key: "updatedAt", label: "Updated At", type: "date" },
	{ key: "updatedBy", label: "Updated By", type: "relation", relationSearch: searchRelationUsersAction },
	{ key: "deletedAt", label: "Deleted At", type: "date" },
	{ key: "deletedBy", label: "Deleted By", type: "relation", relationSearch: searchRelationUsersAction },
	{ key: "filename", label: "File Name", type: "text" },
	{ key: "filesize", label: "File Size", type: "number" },
	{ key: "mimeType", label: "Mime Type", type: "text" },
	{ key: "reviewedAt", label: "Reviewed At", type: "date" },
	{ key: "reviewedBy", label: "Reviewed By", type: "relation", relationSearch: searchRelationUsersAction },
	{ key: "reviewApproved", label: "Review Approved", type: "boolean" }
] as MenuFilterConfigColumn[]);
export const columnConfigColumns = Object.freeze([
	{ key: "id", label: "Id" },
	{ key: "createdAt", label: "Created At" },
	{ key: "createdBy", label: "Created By" },
	{ key: "updatedAt", label: "Updated At" },
	{ key: "updatedBy", label: "Updated By" },
	{ key: "deletedAt", label: "Deleted At" },
	{ key: "deletedBy", label: "Deleted By" },
	{ key: "filename", label: "File Name" },
	{ key: "filesize", label: "File Size" },
	{ key: "mimeType", label: "Mime Type" },
	{ key: "description", label: "Description" },
	{ key: "#status", label: "Status" },
	{ key: "reviewedAt", label: "Reviewed At" },
	{ key: "reviewedBy", label: "Reviewed By" },
	{ key: "reviewApproved", label: "Review Approved" },
	{ key: "reviewComment", label: "Review Comment" }
] as MenuColumnConfigColumn[]);
export const tableConfigColumns = Object.freeze([
	{ key: "id", label: "Id", sortable: true, className: "font-mono text-xs" },
	{ key: "createdAt", label: "Created At", sortable: true },
	{ key: "createdBy", label: "Created By", sortable: false },
	{ key: "updatedAt", label: "Updated At", sortable: true },
	{ key: "updatedBy", label: "Updated By", sortable: false },
	{ key: "deletedAt", label: "Deleted At", sortable: true },
	{ key: "deletedBy", label: "Deleted By", sortable: false },
	{ key: "filename", label: "File Name", sortable: true, className: "font-medium" },
	{ key: "filesize", label: "File Size", sortable: true },
	{ key: "mimeType", label: "Mime Type", sortable: true, className: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" },
	{ key: "description", label: "Description", sortable: false, className: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" },
	{ key: "#status", label: "Status", sortable: false },
	{ key: "reviewedAt", label: "Reviewed At", sortable: true },
	{ key: "reviewedBy", label: "Reviewed By", sortable: false },
	{ key: "reviewApproved", label: "Review Approved", sortable: true },
	{ key: "reviewComment", label: "Review Comment", sortable: false, className: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" }
] as MenuTableConfigColumn[]);
export const rowValueRendererConfigColumns = Object.freeze([
	{ key: "id", type: "text" },
	{ key: "createdAt", type: "date" },
	{ key: "createdBy", type: "relation", render: defaultRelationUserRenderer({ description: "Created By", relationSource: "credit-application-imports.createdBy" }) },
	{ key: "updatedAt", type: "date" },
	{ key: "updatedBy", type: "relation", render: defaultRelationUserRenderer({ description: "Updated By", relationSource: "credit-application-imports.updatedBy" }) },
	{ key: "deletedAt", type: "date" },
	{ key: "deletedBy", type: "relation", render: defaultRelationUserRenderer({ description: "Deleted By", relationSource: "credit-application-imports.deletedBy" }) },
	{ key: "filename", type: "text" },
	{ key: "filesize", type: "number" },
	{ key: "mimeType", type: "text" },
	{ key: "description", type: "richText" },
	{ key: "#status", type: "select", render: defaultStatusRenderer() },
	{ key: "reviewedAt", type: "date" },
	{ key: "reviewedBy", type: "relation", render: defaultRelationUserRenderer({ description: "Reviewed By", relationSource: "credit-application-imports.reviewedBy" }) },
	{ key: "reviewApproved", type: "boolean" },
	{ key: "reviewComment", type: "richText" }
] as MenuRowValueRendererConfigColumn<ColumnData, RowValueRendererContext>[]);
export type RowValueRendererContext = {
	relationValues?: RelationValues;
	isMutating?: boolean;
	setEditFormDrawerState?: (v: FormState) => void;
	setEditFormDrawerOpen?: (v: boolean) => void;
	setDeleteTargetRow?: (v: ColumnData | null) => void;
	setRestoreDeletionTargetRow?: (v: ColumnData | null) => void;
	setReviewDrawerRow?: (v: ColumnData | null) => void;
	setReviewDrawerOpen?: (v: boolean) => void;
} & MenuRowValueRendererContext;
export const eligibleDetailsTriggerColumns = Object.freeze([
	"id",
	"createdAt",
	"updatedAt",
	"deletedAt",
	"reviewedAt",
	"reviewApproved",
	"filename"
]);
export const drawerValueRendererConfigColumns = rowValueRendererConfigColumns;
export const defaultColumnOrder = Object.freeze([
	"id",
	"filename",
	"filesize",
	"mimeType",
	"description",
	"reviewComment",
	"createdBy",
	"updatedBy",
	"deletedBy",
	"createdAt",
	"updatedAt",
	"deletedAt",
	"#status",
	"reviewedAt",
	"reviewedBy",
	"reviewApproved"
]) as string[];
export const defaultColumnsShown = Object.freeze([
	"filename",
	"filesize",
	"#status",
	"updatedAt",
	"reviewComment"
]) as string[];
export const defaultColumnsSort = Object.freeze([
	["updatedAt", false]
]) as [string, boolean][];

const templateColumns = [
	{ key: "name", label: "Name", width: 28, required: true, type: "text", example: "Example Applicant", promptTitle: "Name", prompt: "Enter a non-empty applicant name.", error: "Name is required." },
	{ key: "email", label: "Email", width: 30, type: "email", example: "example@applicant.test", promptTitle: "Email", prompt: "Optional. When filled, enter a valid email address.", error: "Enter a valid email address or leave it blank." },
	{ key: "addresses", label: "Addresses", width: 34, required: true, multiline: true, type: "text", example: "Jl. Sudirman No. 1\nJakarta", promptTitle: "Addresses", prompt: "Enter at least one address. Use a new line for each additional address.", error: "Addresses must contain at least one non-empty line." },
	{ key: "phoneNumbers", label: "Phone Numbers", width: 24, required: true, multiline: true, type: "text", example: "081234567890\n0215551234", promptTitle: "Phone Numbers", prompt: "Enter at least one phone number. Use a new line for each additional phone number.", error: "Phone numbers must contain at least one non-empty line." },
	{ key: "whatsappNumber", label: "WhatsApp Number", width: 20, required: true, type: "text", example: "081234567890", promptTitle: "WhatsApp Number", prompt: "Enter the main WhatsApp number.", error: "WhatsApp number is required." },
	{ key: "smsNumber", label: "SMS Number", width: 20, type: "text", example: "081234567890", promptTitle: "SMS Number", prompt: "Optional. Enter the SMS number when available." },
	{ key: "collateralRegistryName", label: "Collateral Registry Name", width: 24, type: "text", example: "BPKB", promptTitle: "Collateral Registry Name", prompt: "Optional. Enter the collateral registry name." },
	{ key: "collateralName", label: "Collateral Name", width: 24, type: "text", example: "Toyota Avanza 2022", promptTitle: "Collateral Name", prompt: "Optional. Enter the collateral name." },
	{ key: "collateralDescription", label: "Collateral Description", width: 30, multiline: true, type: "text", example: "Black car\nPolice number B 1234 CD", promptTitle: "Collateral Description", prompt: "Optional. Use line breaks for multi-line descriptions." },
	{ key: "assetId", label: "Asset ID", width: 20, type: "text", example: "AST-001", promptTitle: "Asset ID", prompt: "Optional. Enter the asset identifier." },
	{ key: "assetName", label: "Asset Name", width: 24, type: "text", example: "Operational Vehicle", promptTitle: "Asset Name", prompt: "Optional. Enter the asset name." },
	{ key: "assetDescription", label: "Asset Description", width: 30, multiline: true, type: "text", example: "Company-owned vehicle\nUsed for field surveys", promptTitle: "Asset Description", prompt: "Optional. Use line breaks for multi-line descriptions." },
	{ key: "period", label: "Period", width: 14, type: "number", example: "24", promptTitle: "Period", prompt: "Optional. Enter a numeric period value.", error: "Period must be numeric or blank." },
	{ key: "installment", label: "Installment", width: 16, type: "number", example: "1500000", promptTitle: "Installment", prompt: "Optional. Enter a numeric installment value.", error: "Installment must be numeric or blank." },
	{ key: "downPayment", label: "Down Payment", width: 18, type: "number", example: "5000000", promptTitle: "Down Payment", prompt: "Optional. Enter a numeric down payment value.", error: "Down payment must be numeric or blank." },
	{ key: "plafond", label: "Plafond", width: 18, type: "number", example: "120000000", promptTitle: "Plafond", prompt: "Optional. Enter a numeric plafond value.", error: "Plafond must be numeric or blank." },
	{ key: "vendor", label: "Vendor", width: 24, type: "text", example: "PT Vendor Nusantara", promptTitle: "Vendor", prompt: "Optional. Enter the vendor name." },
	{ key: "remarks", label: "Remarks", width: 32, multiline: true, type: "text", example: "Priority customer\nRequested fast processing", promptTitle: "Remarks", prompt: "Optional. Use line breaks for multi-line remarks." },
	{ key: "otherText1", label: "Other Text 1", width: 18, type: "text", example: "Referral A", promptTitle: "Other Text 1", prompt: "Optional. Enter an additional text value." },
	{ key: "otherText2", label: "Other Text 2", width: 18, type: "text", example: "Referral B", promptTitle: "Other Text 2", prompt: "Optional. Enter an additional text value." },
	{ key: "otherNumber1", label: "Other Number 1", width: 16, type: "number", example: "12", promptTitle: "Other Number 1", prompt: "Optional. Enter a numeric value.", error: "Other Number 1 must be numeric or blank." },
	{ key: "otherNumber2", label: "Other Number 2", width: 16, type: "number", example: "34", promptTitle: "Other Number 2", prompt: "Optional. Enter a numeric value.", error: "Other Number 2 must be numeric or blank." },
	{ key: "otherDate1", label: "Other Date 1", width: 16, type: "date", example: "2026-04-25", promptTitle: "Other Date 1", prompt: "Optional. Enter a valid date in YYYY-MM-DD format or use Excel's date picker.", error: "Other Date 1 must be a valid date or blank." },
	{ key: "otherDate2", label: "Other Date 2", width: 16, type: "date", example: "2026-05-01", promptTitle: "Other Date 2", prompt: "Optional. Enter a valid date in YYYY-MM-DD format or use Excel's date picker.", error: "Other Date 2 must be a valid date or blank." },
	{ key: "others", label: "Others", width: 32, multiline: true, type: "json", example: "{\"source\":\"expo\",\"priority\":true}", promptTitle: "Others", prompt: "Optional. Enter plain text or valid JSON." }
];
const generateTemplate = async () => {
	const cssColorToArgb = (value: string) => {
		const probe = document.createElement("div");
		probe.style.color = value;
		probe.style.position = "absolute";
		probe.style.pointerEvents = "none";
		probe.style.opacity = "0";
		document.body.appendChild(probe);
		try {
			const canvasContext = document.createElement("canvas").getContext("2d")!;
			const computedColor = window.getComputedStyle(probe).color.trim();
			canvasContext.fillStyle = computedColor;
			canvasContext.fillRect(0, 0, 1, 1);
			const data = canvasContext.getImageData(0, 0, 1, 1, { colorSpace: "srgb", pixelFormat: "rgba-unorm8" }).data;
			return [data[3], data[0], data[1], data[2]].map(channel =>
				Math.round(channel).toString(16).padStart(2, "0").toUpperCase()).join("");
		} finally {
			document.body.removeChild(probe);
		}
	};
	const getTemplateColumnLetter = (columnIndex: number) => {
		let current = columnIndex;
		let output = "";
		while(current > 0) {
			const remainder = (current - 1) % 26;
			output = String.fromCharCode(65 + remainder) + output;
			current = Math.floor((current - 1) / 26);
		}
		return output;
	};
	const createTemplateValidationFormula = (column: (typeof templateColumns)[number], cellRef: string) => {
		if(column.required == true && column.multiline == true)
			return `LEN(TRIM(SUBSTITUTE(${cellRef}&"",CHAR(10)," ")))>0`;
		if(column.required == true)
			return `LEN(TRIM(${cellRef}&""))>0`;
		if(column.type == "email")
			return `OR(LEN(TRIM(${cellRef}&""))=0,AND(ISNUMBER(SEARCH("@",${cellRef}&"")),ISNUMBER(SEARCH(".",${cellRef}&"",SEARCH("@",${cellRef}&"")+2))))`;
		if(column.type == "number")
			return `OR(LEN(TRIM(${cellRef}&""))=0,ISNUMBER(${cellRef}),NOT(ISERROR(VALUE(${cellRef}&""))))`;
		if(column.type == "date")
			return `OR(LEN(TRIM(${cellRef}&""))=0,ISNUMBER(${cellRef}),NOT(ISERROR(DATEVALUE(${cellRef}&""))))`;
		return null;
	};
	const templateTableName = "CreditApplicationImports";
	const templateHeaderRow = 4;
	const templateDataStartRow = templateHeaderRow + 1;
	const templateDataEndRow = templateDataStartRow + 256;

	const ExcelJS = (await import("@/utils/exceljs")).default;
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet("Credit Applications", {
		pageSetup: {
			fitToWidth: 1,
			fitToHeight: 0,
			orientation: "landscape",
			paperSize: 9,
			margins: {
				top: 0.4,
				right: 0.4,
				bottom: 0.4,
				left: 0.4,
				header: 0.2,
				footer: 0.2
			}
		}
	});
	const backgroundArgb = cssColorToArgb("var(--background)");
	const foregroundArgb = cssColorToArgb("var(--foreground)");
	const accentArgb = cssColorToArgb("var(--accent)");
	const accentForegroundArgb = cssColorToArgb("var(--accent-foreground)");
	const lastColumnLetter = getTemplateColumnLetter(templateColumns.length);
	const documentTitle = document.title.trim().length > 0 ? document.title : "Mobile Survey Intelix";
	const rowCountLabelCell = "A3";
	const rowCountValueCell = "B3";

	workbook.title = "Credit Application Import Template";
	workbook.creator = documentTitle;
	workbook.lastModifiedBy = documentTitle;
	workbook.created = new Date();
	workbook.modified = new Date();
	worksheet.properties.defaultRowHeight = 22;
	worksheet.columns = templateColumns.map(column => ({
		key: column.key,
		width: column.width,
		style: {
			fill: { type: "pattern", pattern: "solid", fgColor: { argb: backgroundArgb } },
			font: { name: "Inter", size: 10, color: { argb: foregroundArgb } },
			alignment: {
				vertical: "top",
				wrapText: column.multiline == true
			}
		}
	}));

	for(let rowNumber = 1; rowNumber <= 2; rowNumber++) {
		for(let columnNumber = 1; columnNumber <= templateColumns.length; columnNumber++) {
			const cell = worksheet.getCell(`${getTemplateColumnLetter(columnNumber)}${rowNumber}`);
			cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: accentArgb } };
			cell.font = { name: "Inter", size: 10, color: { argb: accentForegroundArgb } };
		}
	}
	worksheet.getRow(1).height = 104;
	worksheet.getRow(2).height = 44;
	worksheet.mergeCells(`B1:${lastColumnLetter}1`);
	worksheet.mergeCells(`B2:${lastColumnLetter}2`);
	worksheet.getCell("B1").value = "Credit Application Import Template";
	worksheet.getCell("B1").font = { name: "Inter", size: 20, bold: true, color: { argb: accentForegroundArgb } };
	worksheet.getCell("B1").alignment = { horizontal: "left", vertical: "middle" };
	worksheet.getCell("B2").value = "Fill the table below and upload the workbook as-is. Use line breaks inside addresses and phone numbers cells for multiple entries, then replace or remove the sample row before importing.";
	worksheet.getCell("B2").font = { name: "Inter", size: 11, color: { argb: accentForegroundArgb } };
	worksheet.getCell("B2").alignment = { horizontal: "left", vertical: "middle", wrapText: true };

	const logoResponse = await fetch(importTemplateLogo.src);
	const logoImage = workbook.addImage({
		base64: btoa(String.fromCharCode(...new Uint8Array(await logoResponse.arrayBuffer()))),
		extension: "png"
	});
	worksheet.addImage(logoImage, {
		tl: { col: 0.25, row: 0.1 },
		ext: { width: 180, height: 180 },
		hyperlinks: {
			hyperlink: location.href,
			tooltip: document.title
		}
	});

	for(let rowNumber = 3; rowNumber <= templateDataStartRow; rowNumber++) {
		for(let columnNumber = 1; columnNumber <= templateColumns.length; columnNumber++) {
			const cell = worksheet.getCell(`${getTemplateColumnLetter(columnNumber)}${rowNumber}`);
			cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: backgroundArgb } };
			cell.font = { name: "Inter", size: 10, color: { argb: foregroundArgb } };
		}
	}
	worksheet.getCell(rowCountLabelCell).value = "Total Rows";
	worksheet.getCell(rowCountValueCell).value = { formula: `MAX(COUNTA(A${templateDataStartRow}:A${templateDataEndRow}),0)` };
	worksheet.getCell(rowCountLabelCell).font = { name: "Inter", size: 10, bold: true, color: { argb: foregroundArgb } };
	worksheet.getCell(rowCountValueCell).font = { name: "Inter", size: 10, bold: true, color: { argb: foregroundArgb } };

	worksheet.addTable({
		name: templateTableName,
		displayName: templateTableName,
		ref: `A${templateHeaderRow}`,
		headerRow: true,
		style: {
			theme: null as any,
			showRowStripes: false
		},
		columns: templateColumns.map(column => ({
			name: column.label,
			filterButton: true
		})),
		rows: [
			templateColumns.map(column => column.example)
		]
	});
	const headerRow = worksheet.getRow(templateHeaderRow);
	headerRow.height = 24;
	for(let index = 0; index < templateColumns.length; index++) {
		const column = templateColumns[index];
		const columnIndex = index + 1;
		const columnLetter = getTemplateColumnLetter(columnIndex);
		const headerCell = worksheet.getCell(`${columnLetter}${templateHeaderRow}`);
		const sampleCell = worksheet.getCell(`${columnLetter}${templateDataStartRow}`);
		const validationFormula = createTemplateValidationFormula(column, `${columnLetter}${templateDataStartRow}`);

		headerCell.font = { name: "Inter", size: 10, bold: true, color: { argb: accentForegroundArgb } };
		headerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: accentArgb } };
		headerCell.alignment = { vertical: "middle", wrapText: true };

		sampleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: backgroundArgb } };
		sampleCell.font = { name: "Inter", size: 10, color: { argb: foregroundArgb } };
		sampleCell.alignment = { vertical: "top", wrapText: column.multiline == true };
		if(column.type == "date")
			worksheet.getColumn(columnIndex).numFmt = "yyyy-mm-dd";

		(worksheet as any).dataValidations.add(`${columnLetter}${templateDataStartRow}:${columnLetter}${templateDataEndRow}`, {
			type: "custom",
			allowBlank: column.required != true,
			formulae: [validationFormula ?? "TRUE"],
			showInputMessage: true,
			promptTitle: column.promptTitle,
			prompt: column.prompt,
			showErrorMessage: validationFormula != null,
			errorTitle: "Invalid value",
			error: column.error ?? `${column.label} contains an invalid value.`
		});
	}
	for(let i = templateColumns.length; i <= 16384; i++)
		worksheet.getColumn(i).hidden = true;
	const blobUrl = URL.createObjectURL(new Blob([await workbook.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
	const anchorElement = document.createElement("a");
	anchorElement.href = blobUrl;
	anchorElement.download = `credit-application-import-template-${new Date().toLocaleString()}.xlsx`;
	anchorElement.style.display = "none";
	document.body.appendChild(anchorElement);
	anchorElement.click();
	document.body.removeChild(anchorElement);
	URL.revokeObjectURL(blobUrl);
};
function ImportFileBox(
	{ importId, file }:
	{ importId?: string, file: File | { filename: string, filesize: number, mimeType: string } }
) {
	const query = useQuery({
		queryKey: ["credit-application-import", "form-preview", {
			importId: importId,
			filename: file instanceof File ? file.name : file.filename,
			filesize: file instanceof File ? file.size : file.filesize,
			mimeType: file instanceof File ? file.type : file.mimeType
		}],
		queryFn: async () => {
			const formData = new FormData();
			if(importId != null)
				formData.set("importId", importId);
			else if(file instanceof File)
				formData.set("file", file);
			return await parsePreviewAction(formData);
		},
		refetchOnWindowFocus: false
	});
	const [previewOpen, setPreviewOpen] = useState(false);
	const formatFileSize = (bytes: number) => {
		const units = ["B", "KB", "MB", "GB", "TB"];
		const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
		const value = bytes / (1024 ** exponent);
		return `${value.toFixed(value >= 10 || exponent == 0 ? 0 : 1)} ${units[exponent]}`;
	};
	const formatPreviewValue = (value: unknown) => {
		if(Array.isArray(value))
			return value.join(", ");
		if(value == null)
			return "-";
		if(typeof value == "string")
			return value.length > 0 ? value : "-";
		return JSON.stringify(value);
	};
	const downloadFile = () => {
		const downloadUrl = file instanceof File ? URL.createObjectURL(file) : `/api/credit-application-imports/file/${encodeURIComponent(file.filename)}`;
		const anchorElement = document.createElement("a");
		anchorElement.href = downloadUrl;
		anchorElement.download = downloadUrl;
		anchorElement.style.display = "none";
		document.body.appendChild(anchorElement);
		anchorElement.click();
		document.body.removeChild(anchorElement);
		if(file instanceof File)
			URL.revokeObjectURL(downloadUrl);
	};
	return (
		<>
			<Button
				type="button"
				variant="outline"
				className="h-auto w-full justify-start p-3"
				onClick={e => { if(!e.altKey) setPreviewOpen(true); else downloadFile(); }}
				asChild
			>
				<div className="flex w-full items-center gap-3">
					<FileSpreadsheetIcon className="size-4 shrink-0" />
					<div className="min-w-0 flex-1 text-left">
						<p className="truncate text-sm font-medium">
							{file instanceof File ? file.name : file.filename}
						</p>
						<p className="text-muted-foreground text-xs">
							{formatFileSize(file instanceof File ? file.size : file.filesize)}
						</p>
						<p className={cn("mt-1 text-xs", query.isError ? "text-destructive" : "text-muted-foreground")}>
							{query.isPending ? "Parsing import file..." :
								query.isError ? `${query.error?.name ?? "Error"}: ${query.error?.message ?? "Unable to parse import file."}` :
									`${query.data.rows.length} parsed row(s)`}
						</p>
					</div>
					<Button variant="ghost" onClick={e => { e.stopPropagation(); downloadFile(); }}>
						<DownloadIcon className="size-4 shrink-0" />
					</Button>
				</div>
			</Button>
			<Drawer open={previewOpen} onOpenChange={setPreviewOpen} direction="right">
				<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-3xl">
					<DrawerHeader>
						<DrawerTitle>Import File Preview</DrawerTitle>
						<DrawerDescription>Preview the rows parsed by the server from this import file before using it in the workflow.</DrawerDescription>
					</DrawerHeader>
					<div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
						<div className="bg-muted/30 rounded-lg border p-3 text-sm">
							<p>
								<span className="font-medium">File:</span> {file instanceof File ? file.name : file.filename}
							</p>
							<p>
								<span className="font-medium">Size:</span> {formatFileSize(file instanceof File ? file.size : file.filesize)}
							</p>
							<p>
								<span className="font-medium">Parsed Rows:</span>
								{query.isPending || query.isError ? " -" : ` ${query.data.rows.length} row(s)`}
							</p>
						</div>
						<div className="rounded-xl border">
							<Table>
								<TableHeader>
									<TableRow>
										{templateColumns.map(column => (
											<TableHead key={column.key}>
												{column.label}
											</TableHead>
										))}
									</TableRow>
								</TableHeader>
								<TableBody>
									{query.isPending ? (
										<TableRow>
											<TableCell colSpan={templateColumns.length} className="text-muted-foreground py-8 text-center">
												Parsing import file...
											</TableCell>
										</TableRow>
									) : null}
									{query.isError ? (
										<TableRow>
											<TableCell colSpan={templateColumns.length} className="py-4">
												<Alert variant="destructive">
													<CircleAlertIcon />
													<AlertTitle>
														{`${query.error?.name ?? "Error"}`}
													</AlertTitle>
													<AlertDescription>
														{`${query.error?.message ?? "Unable to parse import file."}`}
													</AlertDescription>
												</Alert>
											</TableCell>
										</TableRow>
									) : null}
									{!query.isPending && !query.isError && query.data.rows.length == 0 ? (
										<TableRow>
											<TableCell colSpan={templateColumns.length} className="text-muted-foreground py-8 text-center">
												No parsed rows found.
											</TableCell>
										</TableRow>
									) : null}
									{query.data?.rows.map((row, index) => (
										<TableRow key={index}>
											{templateColumns.map(column => (
												<TableCell key={column.key} className="max-w-65 whitespace-pre-wrap wrap-break-word">
													{formatPreviewValue(row[column.key])}
												</TableCell>
											))}
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</div>
					<DrawerFooter className="border-t sm:flex-row sm:items-center sm:justify-end">
						<Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
						<Button type="button" variant="secondary" onClick={() => downloadFile()}>
							<DownloadIcon />
							Download
						</Button>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		</>
	);
}

export function DetailsDrawer(
	{ open, onOpenChange, row, rowValueRendererContext, renderActions }:
	{ open: boolean, onOpenChange: (v: boolean) => void, row: ColumnData | null, rowValueRendererContext: RowValueRendererContext, renderActions?: (r: ColumnData) => React.ReactNode }
) {
	const query = useQuery({
		queryKey: ["credit-application-import", "details", row?.id ?? null],
		enabled: open && row != null,
		queryFn: () => getDetailsAction(row!.id),
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});
	const renderValue = useMenuRowValueRenderer({
		columns: drawerValueRendererConfigColumns,
		context: {
			...rowValueRendererContext,
			relationValues: { ...rowValueRendererContext.relationValues, ...query.data?.relations }
		}
	});
	const columnLabels = useMemo(() => Object.fromEntries(drawerValueRendererConfigColumns.map(column =>
		[column.key, tableConfigColumns.find(column2 => column2.key == column.key)!.label] as const)), []);
	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-3xl">
				<DrawerHeader>
					<DrawerTitle>Credit Application Import Details</DrawerTitle>
					<DrawerDescription>Review all available columns and the parsed spreadsheet preview for this import.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
					{row == null ? (
						<p className="text-muted-foreground text-sm">
							No credit application import selected.
						</p>
					) : query.isPending ? (
						<div className="space-y-2">
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
						</div>
					) : query.isError || query.data == null ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>{`${query.error?.name ?? "Error"}`}</AlertTitle>
							<AlertDescription>{`${query.error?.message ?? "Unable to load credit application import details."}`}</AlertDescription>
						</Alert>
					) : (
						<>
							<ImportFileBox
								importId={query.data.row.id}
								file={{ filename: query.data.row.filename!, filesize: query.data.row.filesize!, mimeType: query.data.row.mimeType! }}
							/>
							{drawerValueRendererConfigColumns.map(column => (
								<div key={column.key} className="space-y-1 rounded-lg border p-3">
									<p className="text-muted-foreground text-xs font-medium">
										{columnLabels[column.key]}
									</p>
									{renderValue(query.data.row, column.key)}
								</div>
							))}
						</>
					)}
				</div>
				<DrawerFooter className="border-t sm:flex-row sm:justify-end">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
					{row != null && renderActions != null ? renderActions(row) : null}
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

export type FormState = {
	id?: string;
	file?: File | { filename: string, filesize: number, mimeType: string };
	description?: SerializedEditorState;
};
export function toFormState(data: CreditApplicationImport) {
	return {
		id: data.id,
		file: { filename: data.filename, filesize: data.filesize, mimeType: data.mimeType },
		description: data.description
	} as FormState;
}
export function FormDrawer(
	{ open, onOpenChange, title, formState, onFormStateChange, onSubmit, mutationError, isMutating = false }:
	{ open: boolean, onOpenChange: (v: boolean) => void, title: string, formState: FormState, onFormStateChange: (v: FormState) => void, onSubmit?: () => void, mutationError?: any, isMutating?: boolean }
) {
	const [generatingTemplate, setGeneratingTemplate] = useState(false);
	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-3xl">
				<DrawerHeader>
					<DrawerTitle>{title}</DrawerTitle>
					<DrawerDescription>Upload a spreadsheet import or update the pending import description before approver review.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
					{formState.id == null ? (
						<div className="bg-muted/40 space-y-2 rounded-lg border p-3">
							<p className="text-sm font-medium">Need a starter workbook?</p>
							<p className="text-muted-foreground text-xs">Download the XLSX template with every supported column, built-in validation rules, and the same layout used by the importer.</p>
							<Button
								type="button"
								variant="link"
								className="h-auto px-0"
								onClick={async () => {
									setGeneratingTemplate(true);
									try {
										await generateTemplate();
									} finally {
										setGeneratingTemplate(false);
									}
								}}
								disabled={isMutating || generatingTemplate}
							>
								<DownloadIcon />
								{generatingTemplate ? "Generating template..." : "Download import template"}
							</Button>
						</div>
					) : null}
					<div className="space-y-2">
						<label className="text-sm font-medium">Excel File</label>
						<Input
							type="file"
							accept=".xlsx,.xls"
							onChange={event => onFormStateChange({ ...formState, file: event.target.files?.[0] })}
							disabled={formState.id != null || isMutating}
						/>
						{formState.id != null ? (
							<p className="text-muted-foreground text-xs">
								File is immutable after upload. Create a new import to change the file.
							</p>
						) : formState.file == null ? (
							<p className="text-muted-foreground text-xs">
								No file selected.
							</p>
						) : null}
					</div>
					{formState.file != null ? (
						<div className="space-y-2">
							<ImportFileBox
								importId={formState.id}
								file={formState.file}
							/>
						</div>
					) : null}
					<div className="space-y-2">
						<label className="text-sm font-medium">Description</label>
						<RichTextInput
							serializedState={formState.description}
							onSerializedStateChange={value => onFormStateChange({ ...formState, description: value })}
							onImageUpload={uploadGenericRichtextImage}
						/>
					</div>
					{mutationError != null ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>{`${mutationError?.name ?? "Error"}`}</AlertTitle>
							<AlertDescription>{`${mutationError?.message ?? "Unable to submit form."}`}</AlertDescription>
						</Alert>
					) : null}
				</div>
				<DrawerFooter className="border-t sm:flex-row sm:justify-end">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isMutating}>Cancel</Button>
					<Button type="button" onClick={onSubmit} disabled={isMutating}>Save</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

export function ReviewDrawer(
	{ open, onOpenChange, row, rowValueRendererContext, reviewComment, onReviewCommentChange, onApprove, onReject, mutationError, isMutating = false }:
	{ open: boolean, onOpenChange: (v: boolean) => void, row: ColumnData | null, rowValueRendererContext: RowValueRendererContext, reviewComment: SerializedEditorState, onReviewCommentChange: (v: SerializedEditorState) => void, onApprove: () => void, onReject: () => void, mutationError?: any, isMutating?: boolean }
) {
	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-3xl">
				<DrawerHeader>
					<DrawerTitle>Review</DrawerTitle>
					<DrawerDescription>Review the import metadata and parsed spreadsheet rows before making a decision.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
					{row == null ? (
						<p className="text-muted-foreground text-sm">
							No import request selected.
						</p>
					) : (
						<div className="space-y-2">
							<ImportFileBox
								importId={row.id}
								file={{ filename: row.filename!, filesize: row.filesize!, mimeType: row.mimeType! }}
							/>
							<div className="space-y-1 rounded-lg border p-3">
								<p className="text-muted-foreground text-xs font-medium">
									Description
								</p>
								<RichTextPreview
									serializedState={row.description as any}
									contentClassName="min-h-8"
								/>
							</div>
						</div>
					)}
					{mutationError != null ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>{`${mutationError?.name ?? "Error"}`}</AlertTitle>
							<AlertDescription>{`${mutationError?.message ?? "Unable to submit review."}`}</AlertDescription>
						</Alert>
					) : null}
					<div className="space-y-2">
						<label className="text-sm font-medium">Review Comment</label>
						<RichTextInput
							serializedState={reviewComment}
							onSerializedStateChange={onReviewCommentChange}
							onImageUpload={uploadGenericRichtextImage}
						/>
					</div>
				</div>
				<DrawerFooter className="border-t sm:flex-row sm:justify-end">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
					<Button type="button" variant="default" onClick={onApprove} disabled={isMutating || row == null}>Approve</Button>
					<Button type="button" variant="destructive" onClick={onReject} disabled={isMutating || row == null}>Reject</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

export function DeleteDialog(
	{ open, onOpenChange, onConfirm, isMutating = false }:
	{ open: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void, isMutating?: boolean }
) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete</AlertDialogTitle>
					<AlertDialogDescription>
						Delete does not hard-delete data. It marks the pending import as deleted until it is restored.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={onConfirm} disabled={isMutating}>Delete</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function RestoreDeletionDialog(
	{ open, onOpenChange, onConfirm, isMutating = false }:
	{ open: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void, isMutating?: boolean }
) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Restore Deletion</AlertDialogTitle>
					<AlertDialogDescription>
						This will restore the deleted import so it can continue through the review flow.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isMutating}>Back</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm} disabled={isMutating}>Restore Deletion</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
