"use client";

import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";

import type { GPSPoint } from "./layout.action";

const markerIcon = new L.Icon({
	iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
	iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
	shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
	shadowSize: [41, 41],
});

function formatPopupTime(value: string) {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) return value;

	return `${date.toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	})} ${date.toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	})}`;
}

type OfficerTrackingLeafletMapProps = {
	points: GPSPoint[];
};

export default function OfficerTrackingLeafletMap({
	points,
}: OfficerTrackingLeafletMapProps) {
	const latestPoint = points[points.length - 1];

	if (!latestPoint) return null;

	const positions = points.map(point => [
		point.latitude,
		point.longitude,
	]) as [number, number][];

	return (
		<MapContainer
			center={[latestPoint.latitude, latestPoint.longitude]}
			zoom={15}
			scrollWheelZoom
			className="h-full w-full"
		>
			<TileLayer
				attribution='&copy; OpenStreetMap contributors'
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
			/>

			{positions.length > 1 && <Polyline positions={positions} />}

			{points.map((point, index) => (
				<Marker
					key={`${point.latitude}-${point.longitude}-${point.time}`}
					position={[point.latitude, point.longitude]}
					icon={markerIcon}
				>
					<Popup>
						<div className="space-y-1 text-xs">
							<p className="font-medium">
								{index === points.length - 1 ? "Latest Location" : "GPS Point"}
							</p>

							<p>
								<span className="font-medium">Time:</span>{" "}
								{formatPopupTime(point.time)}
							</p>

							<p>
								<span className="font-medium">Coordinate:</span>{" "}
								{point.latitude}, {point.longitude}
							</p>
						</div>
					</Popup>
				</Marker>
			))}
		</MapContainer>
	);
}
