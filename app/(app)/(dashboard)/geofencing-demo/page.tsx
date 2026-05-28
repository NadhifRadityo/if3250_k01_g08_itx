"use client";

import { useState } from "react";

import { GeofenceRegionsEditorDialog } from "@/components/GeofenceRegionsEditorDialog";

export default function Page() {
	const [value, setValue] = useState([] as any[]);
	return (
		<GeofenceRegionsEditorDialog
			value={value}
			onValueChange={setValue}
			dialogTitle="Geofence Editor"
		/>
	);
}
