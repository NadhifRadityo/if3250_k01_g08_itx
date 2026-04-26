"use client";

import * as React from "react";

import Form, { type FormSubmitPayload, type JsonFormDefinition } from "@/components/Form";
import { Alert, AlertDescription, AlertTitle } from "@/components/radix/Alert";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/radix/Card";

const demoForm: JsonFormDefinition = {
	id: "forms-md-inspired-demo",
	title: "Forms.md-inspired JSON form",
	description: "A slide-first survey runtime built with native React, Radix UI, and Tailwind.",
	settings: {
		buttonAlignment: "start",
		colorScheme: "light",
		footer: "Demo runtime for survey authoring experiments",
		formsmdBranding: "hide",
		isFullPage: false,
		localization: "id-ID",
		page: "form-slides",
		pageProgress: "show",
		placeholders: "show",
		restartButton: "show",
		rounded: "default",
		sanitize: true,
		saveState: true,
		slideControls: "show",
		submitButtonText: "Kirim respons",
		verticalAlignment: "start"
	},
	slides: [
		{
			buttonText: "Mulai demo",
			id: "intro",
			kind: "start",
			blocks: [
				{
					align: "center",
					level: 1,
					text: "Bangun survei modern dengan schema JSON",
					type: "heading"
				},
				{
					align: "center",
					text: "Slide adalah unit utama. Setiap slide bisa berisi teks, helper copy, media, dan beberapa input yang tersusun bebas.",
					type: "description"
				},
				{
					alt: "Illustration of a flexible survey editor workspace",
					aspectRatio: 1.8,
					caption: "Visual language mengikuti token shadcn/Radix, tapi ritmenya tetap cepat dan slide-based.",
					src: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
					type: "media"
				},
				{
					align: "center",
					text: "Demo ini juga memperlihatkan conditional slides, multi-block layouts, partial submit, dan state persistence.",
					type: "helper"
				}
			],
			description: "Sebuah contoh end-to-end untuk runtime form yang baru.",
			title: "Survey Block Editor Demo"
		},
		{
			id: "profile",
			blocks: [
				{
					level: 2,
					text: "Mari mulai dari konteks responden",
					type: "heading"
				},
				{
					text: "Perhatikan bahwa urutan blok di slide ini tidak dikunci ke pola title-description-input saja.",
					type: "helper"
				},
				{
					name: "fullName",
					placeholder: "Nama lengkap",
					question: "Siapa nama Anda?",
					required: true,
					type: "text"
				},
				{
					text: "Kami gunakan ini untuk mempersonalisasi slide berikutnya lewat JSON binding.",
					type: "description"
				},
				{
					name: "email",
					placeholder: "nama@perusahaan.com",
					pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
					question: "Email kerja",
					required: true,
					type: "email"
				},
				{
					fieldSize: "sm",
					name: "phone",
					availableCountries: ["ID", "SG", "MY", "US"],
					country: "ID",
					placeholder: "812-3456-7890",
					question: "Nomor telepon",
					type: "tel"
				}
			],
			post: "slide-progress",
			title: "Profil responden"
		},
		{
			id: "work-context",
			blocks: [
				{
					level: 2,
					text: [
						"Halo ",
						{ bind: { source: "field", key: "fullName", fallback: "teman" } },
						", ceritakan sedikit tentang pekerjaan Anda."
					],
					type: "heading"
				},
				{
					name: "role",
					options: [
						"Product Designer",
						"Frontend Engineer",
						"Operations",
						{
							label: "Lainnya",
							value: "other"
						}
					],
					placeholder: "Pilih peran utama",
					question: "Peran utama Anda",
					required: true,
					type: "select"
				},
				{
					displayCondition: {
						field: "role",
						equals: "other"
					},
					name: "roleOther",
					placeholder: "Tuliskan peran Anda",
					question: "Peran spesifik",
					required: true,
					type: "text"
				},
				{
					horizontal: true,
					multiple: true,
					name: "workModes",
					choices: ["WFH", "Hybrid", "On-site", "Field work"],
					question: "Mode kerja yang paling relevan",
					required: true,
					type: "choice"
				},
				{
					description: "Multiline text memakai textarea native, bukan renderer abstrak.",
					maxlength: 280,
					multiline: true,
					name: "workflowPain",
					placeholder: "Apa yang paling memperlambat alur kerja Anda hari ini?",
					question: "Pain point utama",
					required: true,
					type: "text"
				}
			],
			post: "every-change",
			title: "Konteks kerja"
		},
		{
			id: "preferences",
			blocks: [
				{
					level: 2,
					text: "Preferensi format interaksi",
					type: "heading"
				},
				{
					text: "Slide ini menggabungkan picture choice, number input dengan unit dekoratif, dan rating dalam satu container generik.",
					type: "helper"
				},
				{
					hideFormText: true,
					name: "surfacePreference",
					choices: [
						{
							image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=800&q=80",
							label: "Dashboard desktop",
							value: "desktop"
						},
						{
							image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80",
							label: "Mobile-first",
							value: "mobile"
						},
						{
							image: "https://images.unsplash.com/photo-1516321165247-4aa89a48be28?auto=format&fit=crop&w=800&q=80",
							label: "Kiosk / assisted",
							value: "kiosk"
						}
					],
					question: "Permukaan produk seperti apa yang paling Anda butuhkan?",
					required: true,
					supersize: true,
					type: "pictureChoice"
				},
				{
					max: 120,
					min: 5,
					name: "targetMinutes",
					placeholder: "15",
					question: "Durasi target untuk menyelesaikan satu alur",
					required: true,
					step: 5,
					type: "number",
					unitEnd: "menit"
				},
				{
					icon: "star",
					name: "clarityRating",
					outOf: 7,
					question: "Seberapa jelas alur form demo ini sejauh ini?",
					required: true,
					type: "rating"
				}
			],
			title: "Preferensi pengalaman"
		},
		{
			id: "follow-up",
			jumpCondition: {
				field: "clarityRating",
				lessThanOrEqual: 4
			},
			blocks: [
				{
					level: 2,
					text: "Terima kasih, kami butuh sedikit klarifikasi tambahan",
					type: "heading"
				},
				{
					text: "Slide ini hanya muncul jika rating kejelasan kurang dari atau sama dengan 4.",
					type: "description"
				},
				{
					name: "improvementAreas",
					choices: [
						{
							label: "Navigasi antar slide"
						},
						{
							label: "Bahasa / copy"
						},
						{
							label: "Kepadatan konten"
						},
						{
							label: "Tampilan visual"
						}
					],
					multiple: true,
					question: "Bagian mana yang paling perlu dibenahi?",
					required: true,
					type: "choice"
				},
				{
					maxlength: 240,
					multiline: true,
					name: "improvementNote",
					placeholder: "Masukan spesifik sangat membantu",
					question: "Catatan tambahan",
					type: "text"
				}
			],
			title: "Follow-up otomatis"
		},
		{
			id: "final-details",
			blocks: [
				{
					level: 2,
					text: "Detail akhir dan rekomendasi",
					type: "heading"
				},
				{
					label: "Signal tambahan",
					type: "divider"
				},
				{
					hideLabelEnd: false,
					hideLabelStart: false,
					labelEnd: "Sangat mungkin",
					labelStart: "Tidak mungkin",
					name: "npsIntent",
					outOf: 10,
					question: "Seberapa besar kemungkinan Anda merekomendasikan pola form ini ke tim lain?",
					required: true,
					startAt: 0,
					type: "opinionScale"
				},
				{
					name: "portfolioUrl",
					placeholder: "https://contoh.com/case-study",
					question: "Jika ada, bagikan referensi atau case study terkait",
					type: "url"
				},
				{
					name: "launchDate",
					question: "Kapan Anda ingin eksperimen ini siap diuji?",
					required: true,
					type: "datetime",
					step: 1
				},
				{
					name: "launchTime",
					question: "Jam preferensi untuk sesi uji",
					type: "time"
				},
				{
					name: "attachment",
					question: "Lampiran konteks tambahan",
					sizeLimit: 5,
					type: "file"
				}
			],
			title: "Sebelum submit"
		},
		{
			id: "done",
			kind: "end",
			blocks: [
				{
					align: "center",
					level: 1,
					text: "Respons demo tersimpan",
					type: "heading"
				},
				{
					align: "center",
					text: [
						"Terima kasih, ",
						{ bind: { source: "field", key: "fullName", fallback: "responden" } },
						". Slide end ini juga membaca state dari binding JSON."
					],
					type: "description"
				},
				{
					align: "center",
					text: "Gunakan tombol restart untuk mencoba cabang kondisi yang berbeda.",
					type: "helper"
				}
			],
			title: "Selesai"
		}
	]
};

function formatPayload(payload: FormSubmitPayload | null): string {
	if(payload == null)
		return "Belum ada submit. Jalankan form untuk melihat payload runtime di sini.";

	return JSON.stringify({
		kind: payload.kind,
		slideId: payload.slide?.id ?? null,
		data: payload.data,
		request: {
			...payload.request,
			body: payload.request.body instanceof FormData ? "[FormData]" : payload.request.body
		}
	}, null, 2);
}

export default function SurveyBlockEditorDemoPage() {
	const [lastPartialSubmit, setLastPartialSubmit] = React.useState<FormSubmitPayload | null>(null);
	const [lastSubmit, setLastSubmit] = React.useState<FormSubmitPayload | null>(null);

	return (
		<div className="bg-background min-h-svh">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 xl:grid xl:grid-cols-[minmax(0,1.35fr)_360px] xl:items-start">
				<div className="space-y-6">
					<Alert>
						<AlertTitle>Survey runtime demo</AlertTitle>
						<AlertDescription>
							Halaman ini memperlihatkan schema JSON murni yang dirender oleh [components/Form.tsx](/c:/Projects/if3250_k01_g08_itx/components/Form.tsx), termasuk conditional slides, interleaved blocks, dan partial submit.
						</AlertDescription>
					</Alert>
					<Form
						form={demoForm}
						onPartialSubmit={payload => {
							setLastPartialSubmit(payload);
						}}
						onSubmit={payload => {
							setLastSubmit(payload);
						}}
					/>
				</div>
				<div className="space-y-4 xl:sticky xl:top-6">
					<Card className="rounded-3xl">
						<CardHeader>
							<CardTitle>Runtime notes</CardTitle>
							<CardDescription>
								Contoh ini sengaja mencampur heading, helper copy, media, dan beberapa input dalam satu slide untuk menekankan arsitektur block-first.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
							<p>Slide `follow-up` hanya tampil bila `clarityRating` bernilai 4 atau kurang.</p>
							<p>Slide `profile` memakai `post: "slide-progress"` dan slide `work-context` memakai `post: "every-change"`.</p>
							<p>State form disimpan ke local storage agar refresh halaman tetap mempertahankan progres demo.</p>
						</CardContent>
					</Card>
					<Card className="rounded-3xl">
						<CardHeader>
							<CardTitle>Last partial submit</CardTitle>
						</CardHeader>
						<CardContent>
							<pre className="bg-muted/60 overflow-x-auto rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap">
								{formatPayload(lastPartialSubmit)}
							</pre>
						</CardContent>
					</Card>
					<Card className="rounded-3xl">
						<CardHeader>
							<CardTitle>Last final submit</CardTitle>
						</CardHeader>
						<CardContent>
							<pre className="bg-muted/60 overflow-x-auto rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap">
								{formatPayload(lastSubmit)}
							</pre>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
