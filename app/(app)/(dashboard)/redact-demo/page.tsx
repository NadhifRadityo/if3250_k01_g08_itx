"use client";

import { RedactRegion, RedactProvider } from "@/components/Redact";

export default function Page() {
	return (
		<RedactProvider>
			<div className="flex flex-wrap flex-row">
				<RedactRegion particles={8000} className="w-100 h-100 transition-transform scale-100 hover:scale-120" />
				<RedactRegion particles={8000} className="w-100 h-100 transition-transform scale-100 hover:scale-120 bg-red-50" />
				<RedactRegion particles={8000} className="w-100 h-100 transition-transform scale-100 hover:scale-120" />
				<RedactRegion particles={8000} className="w-100 h-100 transition-transform scale-100 hover:scale-120 bg-red-50" />
				<RedactRegion particles={8000} className="w-100 h-100 transition-transform scale-100 hover:scale-120" />
				<RedactRegion particles={8000} className="w-100 h-100 transition-transform scale-100 hover:scale-120 bg-red-50" />
				<RedactRegion particles={8000} className="w-100 h-100 transition-transform scale-100 hover:scale-120" />
				<RedactRegion particles={8000} className="w-100 h-100 transition-transform scale-100 hover:scale-120 bg-red-50" />
			</div>
		</RedactProvider>
	);
}
