"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Presence } from "@radix-ui/react-presence";
import * as turf from "@turf/turf";
import * as geojson from "geojson";
import mapboxgl from "mapbox-gl";

import cn from "@/utils/cn";
import { Button } from "@/components/radix/Button";
import { Dialog, DialogTitle, DialogHeader, DialogContent, DialogDescription } from "@/components/radix/Dialog";
import { Input } from "@/components/radix/Input";
import { Label } from "@/components/radix/Label";
import { ScrollArea, ScrollBar } from "@/components/radix/ScrollArea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/radix/Select"; // eslint-disable-line sort-imports

import "mapbox-gl/dist/mapbox-gl.css";
import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, ChevronDownIcon, ChevronUpIcon, CircleIcon, CloudMoonIcon, CloudSunIcon, GripVerticalIcon, LocateFixedIcon, LocateIcon, MapPinIcon, MinusIcon, MoonIcon, MountainSnowIcon, MousePointer2Icon, NavigationIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, PentagonIcon, PlusIcon, SearchIcon, SquareIcon, SunIcon, SunsetIcon, Trash2Icon, XIcon } from "lucide-react";

export const MAPBOX_ACCESS_TOKEN = "pk.eyJ1IjoibmFkaGlmcmFkaXR5byIsImEiOiJjbW80OG1menEwb2JnMm9zZ2w0YjUzMzhxIn0.D28hzAHuC353e4e_Q3YV1A";

type InteractionMode = "pan" | "draw_polygon" | "draw_circle" | "draw_rectangle";
type LightPresetMode = "auto" | "dawn" | "day" | "dusk" | "night";

export function getAutoLightPreset(): "dawn" | "day" | "dusk" | "night" {
	const hour = new Date().getHours();
	if(hour >= 5 && hour < 8) return "dawn";
	if(hour >= 8 && hour < 17) return "day";
	if(hour >= 17 && hour < 20) return "dusk";
	return "night";
}

export function nextLightPresetBoundary(now: Date): Date {
	const boundaries = [5, 8, 17, 20];
	for(const h of boundaries) {
		const d = new Date(now);
		d.setHours(h, 0, 0, 0);
		if(d.getTime() > now.getTime()) return d;
	}
	const d = new Date(now);
	d.setDate(d.getDate() + 1);
	d.setHours(5, 0, 0, 0);
	return d;
}

export function durationFromPixelDistance(pixels: number): number {
	const min = 200;
	const max = 1500;
	const ref = 600;
	const ratio = Math.min(1, Math.max(0, pixels / ref));
	return Math.round(min + (max - min) * ratio);
}

export function animationDurationToCenter(map: mapboxgl.Map, target: [number, number]): number {
	const c = map.getCenter();
	const a = map.project([c.lng, c.lat]);
	const b = map.project(target);
	const d = Math.hypot(a.x - b.x, a.y - b.y);
	return durationFromPixelDistance(d);
}

export function animationDurationToBounds(map: mapboxgl.Map, bbox: [number, number, number, number]): number {
	const [minLng, minLat, maxLng, maxLat] = bbox;
	const targetCenter: [number, number] = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
	const c = map.getCenter();
	const a = map.project([c.lng, c.lat]);
	const b = map.project(targetCenter);
	const d = Math.hypot(a.x - b.x, a.y - b.y);
	return durationFromPixelDistance(d);
}

export function computeSunPosition(lat: number, lng: number, date: Date): { altitude: number, azimuth: number } {
	const rad = Math.PI / 180;
	const deg = 180 / Math.PI;
	const JD = date.getTime() / 86400000 + 2440587.5;
	const D = JD - 2451545.0;
	const g = (357.529 + 0.98560028 * D) * rad;
	const q = (280.459 + 0.98564736 * D) * rad;
	const L = q + 1.915 * rad * Math.sin(g) + 0.020 * rad * Math.sin(2 * g);
	const e = (23.439 - 0.00000036 * D) * rad;
	const RA = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
	const dec = Math.asin(Math.sin(e) * Math.sin(L));
	const GMST = ((18.697374558 + 24.06570982441908 * D) % 24 + 24) % 24;
	const LST = (GMST * 15 + lng) * rad;
	const H = LST - RA;
	const latR = lat * rad;
	const alt = Math.asin(Math.sin(latR) * Math.sin(dec) + Math.cos(latR) * Math.cos(dec) * Math.cos(H));
	let az = Math.atan2(-Math.sin(H), Math.tan(dec) * Math.cos(latR) - Math.sin(latR) * Math.cos(H));
	az = (az * deg + 360) % 360;
	return { altitude: alt * deg, azimuth: az };
}

const operationLabels = Object.freeze({
	"union": "Union",
	"difference": "Difference",
	"intersect": "Intersect",
	"exclusion": "Exclusion"
});

export function seededRegionColor(id: string): string {
	let hash = 5381;
	for(let i = 0; i < id.length; i++)
		hash = ((hash << 5) + hash + id.charCodeAt(i)) | 0;
	const h = ((Math.abs(hash) * 137.508) + 60) % 360;
	return `hsl(${h}, 65%, 50%)`;
}

export function useMapGpsTracking(
	{ enabled, mapRef, onError }:
	{ enabled: boolean, mapRef: React.RefObject<mapboxgl.Map | null>, onError: () => void }
) {
	const onErrorRef = useRef(onError);
	onErrorRef.current = onError;
	useEffect(() => {
		if(!enabled) return;
		const map = mapRef.current;
		if(map == null) return;
		if(typeof navigator == "undefined" || navigator.geolocation == null) {
			onErrorRef.current();
			return;
		}
		const dotSourceId = "gps-dot";
		const accuracySourceId = "gps-accuracy";
		const ensureLayers = () => {
			if(!map.isStyleLoaded()) { map.once("load", ensureLayers); return; }
			if(!map.getSource(accuracySourceId)) {
				map.addSource(accuracySourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
				map.addLayer({
					id: "gps-accuracy-fill", type: "fill", source: accuracySourceId,
					paint: { "fill-color": "#3b82f6", "fill-opacity": 0.18 }
				});
				map.addLayer({
					id: "gps-accuracy-line", type: "line", source: accuracySourceId,
					paint: { "line-color": "#3b82f6", "line-opacity": 0.4, "line-width": 1 }
				});
			}
			if(!map.getSource(dotSourceId)) {
				map.addSource(dotSourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
				map.addLayer({
					id: "gps-dot-halo", type: "circle", source: dotSourceId,
					paint: { "circle-radius": 11, "circle-color": "#ffffff", "circle-opacity": 0.95, "circle-stroke-color": "#3b82f6", "circle-stroke-width": 2, "circle-stroke-opacity": 0.4, "circle-pitch-alignment": "map" }
				});
				map.addLayer({
					id: "gps-dot", type: "circle", source: dotSourceId,
					paint: { "circle-radius": 7, "circle-color": "#3b82f6", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2, "circle-pitch-alignment": "map" }
				});
			}
		};
		ensureLayers();
		let firstFix = true;
		const startTime = Date.now();
		const startCenter = map.getCenter();
		const onPosition: PositionCallback = pos => {
			if(!map.isStyleLoaded()) { map.once("load", () => onPosition(pos)); return; }
			const { latitude, longitude, accuracy } = pos.coords;
			const dotData: any = { type: "Feature", geometry: { type: "Point", coordinates: [longitude, latitude] }, properties: {} };
			const circle = turf.circle([longitude, latitude], Math.max(1, accuracy), { steps: 64, units: "meters" });
			const dotSrc = map.getSource(dotSourceId) as mapboxgl.GeoJSONSource | undefined;
			const accSrc = map.getSource(accuracySourceId) as mapboxgl.GeoJSONSource | undefined;
			if(dotSrc) dotSrc.setData(dotData);
			if(accSrc) accSrc.setData(circle as any);
			if(firstFix) {
				firstFix = false;
				const elapsed = Date.now() - startTime;
				const now = map.getCenter();
				const notMoved = Math.abs(now.lng - startCenter.lng) < 1e-7 && Math.abs(now.lat - startCenter.lat) < 1e-7;
				const targetZoom = Math.max(map.getZoom(), 15);
				if(elapsed < 5000 || notMoved) {
					map.easeTo({
						center: [longitude, latitude],
						zoom: targetZoom,
						bearing: map.getBearing(),
						pitch: map.getPitch(),
						duration: animationDurationToCenter(map, [longitude, latitude])
					});
				}
			}
		};
		const watchId = navigator.geolocation.watchPosition(onPosition, () => onErrorRef.current(), {
			enableHighAccuracy: true,
			maximumAge: 1000,
			timeout: 20_000
		});
		return () => {
			navigator.geolocation.clearWatch(watchId);
			if(map.style != null) {
				if(map.getLayer("gps-dot")) map.removeLayer("gps-dot");
				if(map.getLayer("gps-dot-halo")) map.removeLayer("gps-dot-halo");
				if(map.getSource(dotSourceId)) map.removeSource(dotSourceId);
				if(map.getLayer("gps-accuracy-line")) map.removeLayer("gps-accuracy-line");
				if(map.getLayer("gps-accuracy-fill")) map.removeLayer("gps-accuracy-fill");
				if(map.getSource(accuracySourceId)) map.removeSource(accuracySourceId);
			}
		};
	}, [enabled, mapRef]);
}

function generateRegionId(): string {
	return `${Math.random().toString(36).slice(2, 10)}`;
}

function resizeCursorFor(worldAngleDeg: number, bearingDeg: number): string {
	const a = (((worldAngleDeg - bearingDeg) % 180) + 180) % 180;
	if(a < 22.5 || a >= 157.5) return "ns-resize";
	if(a < 67.5) return "nesw-resize";
	if(a < 112.5) return "ew-resize";
	return "nwse-resize";
}

const openRouteServiceApiKey = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjJmYmYyODBkNjVmZTRlZTc4M2RiNWY1MzEyMDVhN2ExIiwiaCI6Im11cm11cjY0In0=";

type GeocodeFeature = {
	type: "Feature",
	geometry: { type: "Point", coordinates: [number, number] },
	properties: any,
	bbox: [number, number, number, number]
};

async function fetchGeocode(
	endpoint: "autocomplete" | "search",
	text: string,
	bounds: mapboxgl.LngLatBounds | null,
	signal?: AbortSignal
): Promise<GeocodeFeature[]> {
	const params = new URLSearchParams();
	params.set("api_key", openRouteServiceApiKey);
	params.set("text", text);
	if(bounds != null) {
		params.set("boundary.rect.min_lon", String(bounds.getWest()));
		params.set("boundary.rect.min_lat", String(bounds.getSouth()));
		params.set("boundary.rect.max_lon", String(bounds.getEast()));
		params.set("boundary.rect.max_lat", String(bounds.getNorth()));
	}
	const url = `https://api.openrouteservice.org/geocode/${endpoint}?${params.toString()}`;
	const res = await fetch(url, { signal });
	if(!res.ok) throw new Error(`Geocode ${endpoint} failed: ${res.status}`);
	const json = await res.json();
	return (json.features ?? []) as GeocodeFeature[];
}

function makeStripePattern(): ImageData | null {
	const size = 16;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if(ctx == null) return null;
	ctx.fillStyle = "rgba(59, 130, 246, 0.25)";
	ctx.fillRect(0, 0, size, size);
	ctx.strokeStyle = "rgba(29, 78, 216, 0.85)";
	ctx.lineWidth = 2;
	ctx.beginPath();
	for(let i = -size; i < size * 2; i += 6) {
		ctx.moveTo(i, -2);
		ctx.lineTo(i + size + 2, size + 2);
	}
	ctx.stroke();
	return ctx.getImageData(0, 0, size, size);
}

function computeCombined(regions: GeofenceRegion[]): geojson.Feature<geojson.Polygon | geojson.MultiPolygon> | null {
	let currentPolygon: geojson.Feature<geojson.Polygon | geojson.MultiPolygon> | null = null;
	for(let i = regions.length - 1; i >= 0; i--) {
		const region = regions[i];
		const polygon = buildPolygon(region);
		if(currentPolygon == null) { currentPolygon = polygon; continue; }
		if(region.operation == "union")
			currentPolygon = turf.union(turf.featureCollection([currentPolygon, polygon])) ?? currentPolygon;
		else if(region.operation == "difference")
			currentPolygon = turf.difference(turf.featureCollection([currentPolygon, polygon])) ?? currentPolygon;
		else if(region.operation == "intersect")
			currentPolygon = turf.intersect(turf.featureCollection([currentPolygon, polygon])) ?? currentPolygon;
		else if(region.operation == "exclusion") {
			const union = turf.union(turf.featureCollection([currentPolygon, polygon]));
			const intersection = turf.intersect(turf.featureCollection([currentPolygon, polygon]));
			if(union && intersection) currentPolygon = turf.difference(turf.featureCollection([union, intersection])) ?? union;
			else if(union) currentPolygon = union;
		}
	}
	return currentPolygon;
}

type GeofenceRegion = {
	id: string;
	operation: "union" | "difference" | "intersect" | "exclusion";
	type: "circle";
	latitude: number;
	longitude: number;
	radius: number;
} | {
	id: string;
	operation: "union" | "difference" | "intersect" | "exclusion";
	type: "polygon";
	positions: [number, number][];
} | {
	id: string;
	operation: "union" | "difference" | "intersect" | "exclusion";
	type: "rectangle";
	latitudeA: number;
	longitudeA: number;
	latitudeB: number;
	longitudeB: number;
};
export function GeofenceRegionsEditorDialog(
	{ buttonClassName, buttonLabel, description, dialogTitle, disabled = false, onValueChange, value }:
	{ buttonClassName?: string, buttonLabel?: string, description?: string, dialogTitle: string, disabled?: boolean, onValueChange?: (value: GeofenceRegion[]) => void, value: GeofenceRegion[] }
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
							{description ?? (!disabled ? "Edit the geofence regions." : "Review the geofence regions in a read-only editor view.")}
						</DialogDescription>
					</DialogHeader>
					<div className="flex-1 overflow-hidden">
						<GeofenceRegionsEditor
							value={value}
							onValueChange={onValueChange}
							disabled={disabled}
						/>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function GeofenceRegionsEditor(
	{ value, onValueChange, disabled = false }:
	{ value: GeofenceRegion[], onValueChange?: (value: GeofenceRegion[]) => void, disabled?: boolean }
) {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<mapboxgl.Map | null>(null);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [mode, setMode] = useState<InteractionMode>("pan");
	const [interacting, setInteracting] = useState(false);
	const [panelOpen, setPanelOpen] = useState(true);
	const panelOpenRef = useRef(panelOpen);
	panelOpenRef.current = panelOpen;
	const panelLeftPadding = useCallback(() => panelOpenRef.current ? 320 + 24 : 0, []);
	const markersRef = useRef<mapboxgl.Marker[]>([]);
	const suppressNextClickRef = useRef(false);
	const ghostSourceId = "ghost-preview";

	// Edge-pan helper: while active, periodically reads getClientPos() and pans the map
	// when the pointer is near the canvas edge. Returns a stop function.
	const startEdgePan = useCallback((getClientPos: () => { clientX: number, clientY: number } | null, onPan?: () => void) => {
		const map = mapRef.current;
		if(map == null) return () => {};
		let raf: number | null = null;
		const margin = 50;
		const maxSpeed = 12;
		const tick = () => {
			raf = requestAnimationFrame(tick);
			const pos = getClientPos();
			if(pos == null) return;
			const rect = map.getCanvas().getBoundingClientRect();
			const x = pos.clientX - rect.left;
			const y = pos.clientY - rect.top;
			let dx = 0, dy = 0;
			if(x < margin) dx = -((margin - x) / margin) * maxSpeed;
			else if(x > rect.width - margin) dx = ((x - (rect.width - margin)) / margin) * maxSpeed;
			if(y < margin) dy = -((margin - y) / margin) * maxSpeed;
			else if(y > rect.height - margin) dy = ((y - (rect.height - margin)) / margin) * maxSpeed;
			if(dx !== 0 || dy !== 0) {
				map.panBy([dx, dy], { animate: false, duration: 0 });
				onPan?.();
			}
		};
		tick();
		return () => { if(raf != null) cancelAnimationFrame(raf); };
	}, []);

	const clearMarkers = useCallback(() => {
		markersRef.current.forEach(m => m.remove());
		markersRef.current = [];
	}, []);

	const createdRegionIdsRef = useRef<Set<string>>(new Set());
	const patternReadyRef = useRef(false);
	const styleReadyRef = useRef(false);
	const initialFitDoneRef = useRef(false);
	const [styleReadyTick, setStyleReadyTick] = useState(0);
	const valueRef = useRef(value);
	valueRef.current = value;
	const onValueChangeRef = useRef(onValueChange);
	onValueChangeRef.current = onValueChange;

	const setRegionSourceData = useCallback((region: GeofenceRegion) => {
		const map = mapRef.current;
		if(map == null) return;
		const src = map.getSource(`geofence-region-${region.id}`) as mapboxgl.GeoJSONSource | undefined;
		if(src) src.setData(buildPolygon(region));
		const combined = map.getSource("combined-geofence") as mapboxgl.GeoJSONSource | undefined;
		if(combined && valueRef.current) {
			const idx = valueRef.current.findIndex(r => r.id === region.id);
			if(idx < 0) return;
			const preview = [...valueRef.current];
			preview[idx] = region;
			const combinedGeom = computeCombined(preview);
			combined.setData(combinedGeom ?? { type: "FeatureCollection", features: [] } as any);
		}
	}, []);

	const updateRegion = useCallback((region: GeofenceRegion) => {
		const cur = valueRef.current ?? [];
		const idx = cur.findIndex(r => r.id === region.id);
		if(idx < 0) return;
		const updated = [...cur];
		updated[idx] = region;
		onValueChangeRef.current?.(updated);
	}, []);

	useEffect(() => {
		const mapContainer = mapContainerRef.current;
		if(mapContainer == null) return;
		mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
		const map = new mapboxgl.Map({
			container: mapContainer,
			style: "mapbox://styles/mapbox/standard",
			center: [106.8456, -6.2088],
			zoom: 12
		});
		map.on("load", () => {
			map.setConfigProperty("basemap", "show3dObjects", true);
			map.setConfigProperty("basemap", "showTerrain", true);
			map.style?.setTransition({ duration: 2000, delay: 0 });
			if(!map.hasImage("geofence-stripes")) {
				const pattern = makeStripePattern();
				if(pattern != null) map.addImage("geofence-stripes", pattern, { pixelRatio: 2 });
			}
			patternReadyRef.current = true;
			styleReadyRef.current = true;
			if(!map.getSource(ghostSourceId)) {
				map.addSource(ghostSourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
				map.addLayer({ id: ghostSourceId, type: "fill", source: ghostSourceId, paint: { "fill-color": "#facc15", "fill-opacity": 0.3, "fill-color-transition": { duration: 0, delay: 0 } } });
			}
			setStyleReadyTick(t => t + 1);
		});
		mapRef.current = map;
		const resizeObserver = new ResizeObserver(() => {
			map.resize();
			setTimeout(() => map.resize(), 150);
			setTimeout(() => map.resize(), 1000);
		});
		resizeObserver.observe(mapContainer);
		return () => {
			resizeObserver.disconnect();
			map.remove();
			mapRef.current = null;
		};
	}, []);
	// Render regions and combined geofence
	useEffect(() => {
		const map = mapRef.current;
		if(map == null) return;
		let cancelled = false;
		const run = () => {
			if(cancelled || mapRef.current !== map) return;
			if(!styleReadyRef.current) { map.once("load", run); return; }

			// Combined geofence (with stripe pattern)
			const combined = computeCombined(value);
			const combinedData: any = combined ?? { type: "FeatureCollection", features: [] };
			const combinedSource = map.getSource("combined-geofence") as mapboxgl.GeoJSONSource | undefined;
			if(combinedSource) {
				combinedSource.setData(combinedData);
			} else {
				map.addSource("combined-geofence", { type: "geojson", data: combinedData });
				const paint: mapboxgl.FillLayerSpecification["paint"] = patternReadyRef.current && map.hasImage("geofence-stripes")
					? { "fill-pattern": "geofence-stripes", "fill-opacity": 0.7 }
					: { "fill-color": "#3b82f6", "fill-opacity": 0.2 };
				map.addLayer({ id: "combined-geofence", type: "fill", source: "combined-geofence", paint });
			}

			// Per-region sources/layers — sync via setData, add new, remove orphans
			const currentIds = new Set<string>();
			for(let i = 0; i < value.length; i++) {
				const region = value[i];
				currentIds.add(region.id);
				const polygon = buildPolygon(region);
				const sourceId = `geofence-region-${region.id}`;
				const src = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
				if(src) {
					src.setData(polygon);
				} else {
					map.addSource(sourceId, { type: "geojson", data: polygon });
					map.addLayer({
						id: `geofence-fill-${region.id}`, type: "fill", source: sourceId,
						paint: { "fill-color": seededRegionColor(region.id), "fill-opacity": 0.1 }
					});
					map.addLayer({
						id: `geofence-outline-${region.id}`, type: "line", source: sourceId,
						paint: { "line-color": seededRegionColor(region.id), "line-width": 2 }
					});
				}
				if(map.getLayer(`geofence-fill-${region.id}`))
					map.setPaintProperty(`geofence-fill-${region.id}`, "fill-opacity", selectedId === region.id ? 0.35 : 0.1);
				if(map.getLayer(`geofence-outline-${region.id}`))
					map.setPaintProperty(`geofence-outline-${region.id}`, "line-width", selectedId === region.id ? 4 : 2);
			}
			for(const id of createdRegionIdsRef.current) {
				if(currentIds.has(id)) continue;
				if(map.getLayer(`geofence-outline-${id}`)) map.removeLayer(`geofence-outline-${id}`);
				if(map.getLayer(`geofence-fill-${id}`)) map.removeLayer(`geofence-fill-${id}`);
				if(map.getSource(`geofence-region-${id}`)) map.removeSource(`geofence-region-${id}`);
			}
			createdRegionIdsRef.current = currentIds;

			// Ghost preview source (for drawing in progress)
			if(!map.getSource(ghostSourceId)) {
				map.addSource(ghostSourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
				map.addLayer({ id: ghostSourceId, type: "fill", source: ghostSourceId, paint: { "fill-color": "#facc15", "fill-opacity": 0.3, "fill-color-transition": { duration: 0, delay: 0 } } });
			}

			// Initial fit-bounds so the combined region fills the view on first load
			if(!initialFitDoneRef.current && value.length > 0) {
				initialFitDoneRef.current = true;
				const combinedGeom = computeCombined(value);
				if(combinedGeom != null) {
					const bbox = turf.bbox(combinedGeom) as [number, number, number, number];
					map.fitBounds(bbox, {
						padding: { top: 80, right: 80, bottom: 80, left: 80 + panelLeftPadding() },
						bearing: map.getBearing(),
						pitch: map.getPitch(),
						duration: animationDurationToBounds(map, bbox)
					});
				}
			}
		};
		run();
		return () => { cancelled = true; };
	}, [value, selectedId, styleReadyTick]);

	// Click-to-select regions
	useEffect(() => {
		const map = mapRef.current;
		if(!map || disabled) return;
		const onClick = (e: mapboxgl.MapMouseEvent) => {
			if(suppressNextClickRef.current) { suppressNextClickRef.current = false; return; }
			if(mode !== "pan" || !valueRef.current) return;
			const point = e.point;
			for(const region of valueRef.current) {
				const features = map.queryRenderedFeatures(point, { layers: [`geofence-fill-${region.id}`] });
				if(features.length > 0) { setSelectedId(region.id); return; }
			}
			setSelectedId(null);
		};
		map.on("click", onClick);
		return () => { map.off("click", onClick); };
	}, [mode, disabled]);

	// Fly to selected region (preserving tilt and bearing); skip on deselect or value-only changes
	const prevSelectedRef = useRef<string | null>(null);
	useEffect(() => {
		if(selectedId == null) {
			prevSelectedRef.current = null;
			return;
		}
		if(selectedId === prevSelectedRef.current) return;
		prevSelectedRef.current = selectedId;
		const map = mapRef.current;
		if(map == null) return;
		const region = value.find(r => r.id === selectedId);
		if(region == null) return;
		const polygon = buildPolygon(region);
		const bbox = turf.bbox(polygon) as [number, number, number, number];
		map.fitBounds(bbox, {
			padding: { top: 80, right: 80, bottom: 80, left: 80 + panelLeftPadding() },
			bearing: map.getBearing(),
			pitch: map.getPitch(),
			duration: animationDurationToBounds(map, bbox)
		});
	}, [selectedId, value]);

	// Editing handles for selected region
	useEffect(() => {
		clearMarkers();
		const map = mapRef.current;
		if(!map || selectedId == null || disabled || mode !== "pan") return;
		const region = value.find(r => r.id === selectedId);
		if(!region) return;

		if(map.getLayer(ghostSourceId)) {
			map.setPaintProperty(ghostSourceId, "fill-color-transition", { duration: 0, delay: 0 });
			map.setPaintProperty(ghostSourceId, "fill-color", seededRegionColor(region.id));
		}

		const handleStyle = (kind: "vertex" | "midpoint" | "move", cursor: string) => {
			if(kind === "midpoint") return `width:12px;height:12px;border-radius:2px;background:white;border:2px solid #f59e0b;cursor:${cursor};box-shadow:0 1px 3px rgba(0,0,0,0.3);`;
			if(kind === "move") return `width:18px;height:18px;border-radius:50%;background:#10b981;border:2px solid white;cursor:${cursor};box-shadow:0 2px 4px rgba(0,0,0,0.4);`;
			return `width:14px;height:14px;border-radius:50%;background:white;border:2px solid #3b82f6;cursor:${cursor};box-shadow:0 1px 3px rgba(0,0,0,0.3);`;
		};

		const computeHandlePositions = (r: GeofenceRegion): [number, number][] => {
			if(r.type === "circle") {
				const positions: [number, number][] = [[r.longitude, r.latitude]];
				[0, 90, 180, 270].forEach(b => {
					const pt = turf.destination([r.longitude, r.latitude], r.radius, b, { units: "meters" });
					positions.push(pt.geometry.coordinates as [number, number]);
				});
				return positions;
			}
			if(r.type === "rectangle") {
				const corners: [number, number][] = [
					[r.longitudeA, r.latitudeA],
					[r.longitudeB, r.latitudeA],
					[r.longitudeB, r.latitudeB],
					[r.longitudeA, r.latitudeB]
				];
				const edges: [number, number][] = [
					[(corners[0][0] + corners[1][0]) / 2, corners[0][1]],
					[corners[1][0], (corners[1][1] + corners[2][1]) / 2],
					[(corners[2][0] + corners[3][0]) / 2, corners[2][1]],
					[corners[3][0], (corners[0][1] + corners[3][1]) / 2]
				];
				const center: [number, number] = [(r.longitudeA + r.longitudeB) / 2, (r.latitudeA + r.latitudeB) / 2];
				return [...corners, ...edges, center];
			}
			const verts: [number, number][] = r.positions.map(([lat, lng]) => [lng, lat]);
			const mids: [number, number][] = r.positions.map((pos, vi) => {
				const nx = r.positions[(vi + 1) % r.positions.length];
				return [(pos[1] + nx[1]) / 2, (pos[0] + nx[0]) / 2];
			});
			const centroid = turf.centroid(buildPolygon(r)).geometry.coordinates as [number, number];
			return [...verts, ...mids, centroid];
		};

		const createHandle = (
			lngLat: [number, number],
			cursor: string | { axisAngle: number },
			onDrag: (lngLat: mapboxgl.LngLat, marker: mapboxgl.Marker) => GeofenceRegion | null,
			onDragEnd: (lngLat: mapboxgl.LngLat, marker: mapboxgl.Marker) => GeofenceRegion | null,
			kind: "vertex" | "midpoint" | "move" = "vertex"
		) => {
			const initialCursor = typeof cursor === "string" ? cursor : resizeCursorFor(cursor.axisAngle, map.getBearing());
			const el = document.createElement("div");
			el.style.cssText = handleStyle(kind, initialCursor);
			if(typeof cursor !== "string") el.dataset.axisAngle = String(cursor.axisAngle);
			const marker = new mapboxgl.Marker({ element: el, draggable: true }).setLngLat(lngLat).addTo(map);
			let stopEdge: (() => void) | null = null;
			let clientPos: { clientX: number, clientY: number } | null = null;
			const applyDrag = () => {
				const next = onDrag(marker.getLngLat(), marker);
				if(next) {
					setRegionSourceData(next);
					updateGhost(buildPolygon(next));
					const positions = computeHandlePositions(next);
					if(positions.length === markersRef.current.length) {
						markersRef.current.forEach((m, i) => {
							if(m !== marker) m.setLngLat(positions[i]);
						});
					}
				}
			};
			const onWindowPointerMove = (ev: PointerEvent | MouseEvent) => {
				clientPos = { clientX: ev.clientX, clientY: ev.clientY };
			};
			marker.on("dragstart", () => {
				setInteracting(true);
				window.addEventListener("pointermove", onWindowPointerMove, true);
				window.addEventListener("mousemove", onWindowPointerMove, true);
				stopEdge = startEdgePan(() => clientPos, () => {
					if(clientPos == null) return;
					const rect = map.getCanvas().getBoundingClientRect();
					const px = clientPos.clientX - rect.left;
					const py = clientPos.clientY - rect.top;
					const lngLat = map.unproject([px, py]);
					marker.setLngLat(lngLat);
					applyDrag();
				});
			});
			marker.on("drag", () => { applyDrag(); });
			marker.on("dragend", () => {
				stopEdge?.();
				stopEdge = null;
				window.removeEventListener("pointermove", onWindowPointerMove, true);
				window.removeEventListener("mousemove", onWindowPointerMove, true);
				const next = onDragEnd(marker.getLngLat(), marker);
				if(next) updateRegion(next);
				updateGhost(null);
				setInteracting(false);
			});
			markersRef.current.push(marker);
			return marker;
		};

		const updateGhost = (data: geojson.Feature | null) => {
			const src = map.getSource(ghostSourceId) as mapboxgl.GeoJSONSource | undefined;
			if(src) src.setData(data ?? { type: "FeatureCollection", features: [] } as any);
		};

		if(region.type === "circle") {
			// Center handle (drag whole region)
			createHandle([region.longitude, region.latitude], "move",
				(lngLat) => ({ ...region, latitude: lngLat.lat, longitude: lngLat.lng }),
				(lngLat) => ({ ...region, latitude: lngLat.lat, longitude: lngLat.lng }),
				"move"
			);
			// Radius handles at 4 cardinal directions
			const cardinals = [0, 90, 180, 270];
			cardinals.forEach(bearing => {
				const pt = turf.destination([region.longitude, region.latitude], region.radius, bearing, { units: "meters" });
				const coords = pt.geometry.coordinates as [number, number];
				const compute = (lngLat: mapboxgl.LngLat) => {
					const dist = turf.distance([region.longitude, region.latitude], [lngLat.lng, lngLat.lat], { units: "meters" });
					return { ...region, radius: Math.max(1, dist) };
				};
				createHandle(coords, { axisAngle: bearing % 180 }, compute, compute);
			});
		} else if(region.type === "rectangle") {
			const corners: [number, number][] = [
				[region.longitudeA, region.latitudeA],
				[region.longitudeB, region.latitudeA],
				[region.longitudeB, region.latitudeB],
				[region.longitudeA, region.latitudeB]
			];
			// Corner handles
			corners.forEach((corner, ci) => {
				const compute = (lngLat: mapboxgl.LngLat): GeofenceRegion => {
					let latA = region.latitudeA, lngA = region.longitudeA, latB = region.latitudeB, lngB = region.longitudeB;
					if(ci === 0) { latA = lngLat.lat; lngA = lngLat.lng; }
					else if(ci === 1) { latA = lngLat.lat; lngB = lngLat.lng; }
					else if(ci === 2) { latB = lngLat.lat; lngB = lngLat.lng; }
					else { latB = lngLat.lat; lngA = lngLat.lng; }
					return { ...region, latitudeA: latA, longitudeA: lngA, latitudeB: latB, longitudeB: lngB };
				};
				createHandle(corner, { axisAngle: ci % 2 === 0 ? 45 : 135 }, compute, compute);
			});
			// Edge-center handles
			const edges: [number, number][] = [
				[(corners[0][0] + corners[1][0]) / 2, corners[0][1]], // top
				[corners[1][0], (corners[1][1] + corners[2][1]) / 2], // right
				[(corners[2][0] + corners[3][0]) / 2, corners[2][1]], // bottom
				[corners[3][0], (corners[0][1] + corners[3][1]) / 2], // left
			];
			edges.forEach((edge, ei) => {
				const compute = (lngLat: mapboxgl.LngLat): GeofenceRegion => {
					let latA = region.latitudeA, lngA = region.longitudeA, latB = region.latitudeB, lngB = region.longitudeB;
					if(ei === 0) latA = lngLat.lat;
					else if(ei === 1) lngB = lngLat.lng;
					else if(ei === 2) latB = lngLat.lat;
					else lngA = lngLat.lng;
					return { ...region, latitudeA: latA, longitudeA: lngA, latitudeB: latB, longitudeB: lngB };
				};
				createHandle(edge, { axisAngle: ei % 2 === 0 ? 0 : 90 }, compute, compute, "midpoint");
			});
			// Move handle in the center
			const centerLng = (region.longitudeA + region.longitudeB) / 2;
			const centerLat = (region.latitudeA + region.latitudeB) / 2;
			const lngWidth = region.longitudeB - region.longitudeA;
			const latHeight = region.latitudeB - region.latitudeA;
			const compute = (lngLat: mapboxgl.LngLat): GeofenceRegion => ({
				...region,
				longitudeA: lngLat.lng - lngWidth / 2,
				longitudeB: lngLat.lng + lngWidth / 2,
				latitudeA: lngLat.lat - latHeight / 2,
				latitudeB: lngLat.lat + latHeight / 2
			});
			createHandle([centerLng, centerLat], "move", compute, compute, "move");
		} else if(region.type === "polygon") {
			// Vertex handles
			region.positions.forEach((pos, vi) => {
				const compute = (lngLat: mapboxgl.LngLat): GeofenceRegion => {
					const newPositions = [...region.positions];
					newPositions[vi] = [lngLat.lat, lngLat.lng];
					return { ...region, positions: newPositions };
				};
				createHandle([pos[1], pos[0]], "crosshair", compute, compute);
			});
			// Midpoint handles \u2014 split edge by inserting a vertex (commit only on dragend)
			region.positions.forEach((pos, vi) => {
				const next = region.positions[(vi + 1) % region.positions.length];
				const midLat = (pos[0] + next[0]) / 2;
				const midLng = (pos[1] + next[1]) / 2;
				const compute = (lngLat: mapboxgl.LngLat): GeofenceRegion => {
					const newPositions = [...region.positions];
					newPositions.splice(vi + 1, 0, [lngLat.lat, lngLat.lng]);
					return { ...region, positions: newPositions };
				};
				createHandle([midLng, midLat], "copy", compute, compute, "midpoint");
			});
			// Move handle at centroid
			const centroidPt = turf.centroid(buildPolygon(region));
			const [centroidLng, centroidLat] = centroidPt.geometry.coordinates as [number, number];
			const compute = (lngLat: mapboxgl.LngLat): GeofenceRegion => {
				const dLng = lngLat.lng - centroidLng;
				const dLat = lngLat.lat - centroidLat;
				const newPositions = region.positions.map(([lat, lng]) => [lat + dLat, lng + dLng] as [number, number]);
				return { ...region, positions: newPositions };
			};
			createHandle([centroidLng, centroidLat], "move", compute, compute, "move");
		}
		return () => { clearMarkers(); };
	}, [selectedId, value, disabled, mode]);

	// Refresh handle cursors when the map rotates / on selection change
	const updateMarkerCursors = useCallback((bearing: number) => {
		markersRef.current.forEach(m => {
			const el = m.getElement();
			const a = el.dataset.axisAngle;
			if(a == null) return;
			el.style.cursor = resizeCursorFor(parseFloat(a), bearing);
		});
	}, []);
	useEffect(() => {
		const map = mapRef.current;
		if(map == null) return;
		updateMarkerCursors(map.getBearing());
		const onRotate = () => updateMarkerCursors(map.getBearing());
		map.on("rotate", onRotate);
		return () => { map.off("rotate", onRotate); };
	}, [updateMarkerCursors, styleReadyTick]);
	useEffect(() => updateMarkerCursors(mapRef.current?.getBearing() ?? 0), [selectedId, value, updateMarkerCursors]);

	// Drawing mode interactions (click-drag-release)
	useEffect(() => {
		const map = mapRef.current;
		if(!map || disabled) return;
		if(mode === "pan") { map.getCanvas().style.cursor = ""; map.dragPan.enable(); return; }
		map.dragPan.disable();
		map.getCanvas().style.cursor = "crosshair";

		let drawing: { id: string, type: "rectangle" | "circle" | "polygon", startLngLat: [number, number], points: [number, number][], pointerPos: { x: number, y: number }, clientPos: { clientX: number, clientY: number } } | null = null;
		let stopEdgePan: (() => void) | null = null;

		const clearGhost = () => {
			const src = map.getSource(ghostSourceId) as mapboxgl.GeoJSONSource | undefined;
			if(src) src.setData({ type: "FeatureCollection", features: [] } as any);
		};

		const updateGhost = (lng: number, lat: number) => {
			if(drawing == null) return;
			const src = map.getSource(ghostSourceId) as mapboxgl.GeoJSONSource | undefined;
			if(src == null) return;
			if(drawing.type === "rectangle") {
				const [sLng, sLat] = drawing.startLngLat;
				const ghost = turf.polygon([[[sLng, sLat], [lng, sLat], [lng, lat], [sLng, lat], [sLng, sLat]]]);
				src.setData(ghost as any);
			} else if(drawing.type === "circle") {
				const radius = turf.distance(drawing.startLngLat, [lng, lat], { units: "meters" });
				const ghost = turf.circle(drawing.startLngLat, radius, { steps: 64, units: "meters" });
				src.setData(ghost as any);
			} else {
				const last = drawing.points[drawing.points.length - 1];
				if(last == null || last[0] !== lng || last[1] !== lat) drawing.points.push([lng, lat]);
				if(drawing.points.length >= 3) {
					const closed = [...drawing.points, drawing.points[0]];
					const ghost = turf.polygon([closed]);
					src.setData(ghost as any);
				}
			}
		};

		const onMouseDown = (e: mapboxgl.MapMouseEvent) => {
			if(e.originalEvent.button !== 0) return;
			const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
			const pos = { x: e.point.x, y: e.point.y };
			const clientPos = { clientX: e.originalEvent.clientX, clientY: e.originalEvent.clientY };
			const id = generateRegionId();
			if(mode === "draw_circle") drawing = { id, type: "circle", startLngLat: lngLat, points: [], pointerPos: pos, clientPos };
			else if(mode === "draw_rectangle") drawing = { id, type: "rectangle", startLngLat: lngLat, points: [], pointerPos: pos, clientPos };
			else if(mode === "draw_polygon") drawing = { id, type: "polygon", startLngLat: lngLat, points: [lngLat], pointerPos: pos, clientPos };
			if(drawing != null) {
				e.preventDefault();
				if(map.getLayer(ghostSourceId)) {
					map.setPaintProperty(ghostSourceId, "fill-color-transition", { duration: 0, delay: 0 });
					map.setPaintProperty(ghostSourceId, "fill-color", seededRegionColor(drawing.id));
				}
				setInteracting(true);
				window.addEventListener("pointermove", onWindowPointerMove, true);
				window.addEventListener("mousemove", onWindowPointerMove, true);
				stopEdgePan = startEdgePan(() => drawing?.clientPos ?? null, () => {
					if(drawing == null) return;
					const rect = map.getCanvas().getBoundingClientRect();
					drawing.pointerPos = { x: drawing.clientPos.clientX - rect.left, y: drawing.clientPos.clientY - rect.top };
					const pointer = map.unproject([drawing.pointerPos.x, drawing.pointerPos.y]);
					updateGhost(pointer.lng, pointer.lat);
				});
			}
		};

		const onWindowPointerMove = (ev: PointerEvent | MouseEvent) => {
			if(drawing == null) return;
			drawing.clientPos = { clientX: ev.clientX, clientY: ev.clientY };
			const rect = map.getCanvas().getBoundingClientRect();
			drawing.pointerPos = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
			const pointer = map.unproject([drawing.pointerPos.x, drawing.pointerPos.y]);
			updateGhost(pointer.lng, pointer.lat);
		};

		const onMouseMove = (e: mapboxgl.MapMouseEvent) => {
			if(drawing == null) return;
			drawing.pointerPos = { x: e.point.x, y: e.point.y };
			drawing.clientPos = { clientX: e.originalEvent.clientX, clientY: e.originalEvent.clientY };
			updateGhost(e.lngLat.lng, e.lngLat.lat);
		};

		const onMouseUp = (e: mapboxgl.MapMouseEvent) => {
			if(drawing == null) return;
			const cur: [number, number] = [e.lngLat.lng, e.lngLat.lat];
			let newRegion: GeofenceRegion | null = null;
			if(drawing.type === "circle") {
				const radius = turf.distance(drawing.startLngLat, cur, { units: "meters" });
				if(radius >= 1) newRegion = { id: drawing.id, operation: "union", type: "circle", latitude: drawing.startLngLat[1], longitude: drawing.startLngLat[0], radius };
			} else if(drawing.type === "rectangle") {
				const sameSpot = drawing.startLngLat[0] === cur[0] && drawing.startLngLat[1] === cur[1];
				if(!sameSpot) newRegion = { id: drawing.id, operation: "union", type: "rectangle", latitudeA: drawing.startLngLat[1], longitudeA: drawing.startLngLat[0], latitudeB: cur[1], longitudeB: cur[0] };
			} else if(drawing.type === "polygon" && drawing.points.length >= 3) {
				const ring: [number, number][] = [...drawing.points, drawing.points[0]];
				const tolerance = 1 / Math.pow(1.06, 10 * map.getZoom());
				const simplified = turf.simplify(turf.polygon([ring]), { tolerance, highQuality: true, mutate: false });
				const simpRing = simplified.geometry.coordinates[0] as [number, number][];
				const positions: [number, number][] = simpRing.slice(0, -1).map(([lng, lat]) => [lat, lng]);
				if(positions.length >= 3) newRegion = { id: drawing.id, operation: "union", type: "polygon", positions };
			}
			clearGhost();
			drawing = null;
			stopEdgePan?.();
			stopEdgePan = null;
			window.removeEventListener("pointermove", onWindowPointerMove, true);
			window.removeEventListener("mousemove", onWindowPointerMove, true);
			setInteracting(false);
			if(newRegion != null) {
				suppressNextClickRef.current = true;
				prevSelectedRef.current = null;
				onValueChange?.([newRegion, ...value]);
				setSelectedId(newRegion.id);
				setMode("pan");
			}
		};

		map.on("mousedown", onMouseDown);
		map.on("mousemove", onMouseMove);
		map.on("mouseup", onMouseUp);
		return () => {
			map.off("mousedown", onMouseDown);
			map.off("mousemove", onMouseMove);
			map.off("mouseup", onMouseUp);
			map.getCanvas().style.cursor = "";
			map.dragPan.enable();
			stopEdgePan?.();
			window.removeEventListener("pointermove", onWindowPointerMove, true);
			window.removeEventListener("mousemove", onWindowPointerMove, true);
			drawing = null;
			setInteracting(false);
			clearGhost();
		};
	}, [mode, value, disabled, onValueChange, startEdgePan]);

	const deleteSelected = useCallback(() => {
		if(selectedId == null) return;
		const idx = value.findIndex(r => r.id === selectedId);
		if(idx < 0) return;
		const updated = value.toSpliced(idx, 1);
		onValueChange?.(updated);
		setSelectedId(null);
	}, [selectedId, value, onValueChange]);

	const cardRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
	const registerCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
		if(el == null) cardRefs.current.delete(id);
		else cardRefs.current.set(id, el);
	}, []);
	const [reorderDrag, setReorderDrag] = useState<{ from: number, over: number | null } | null>(null);

	useEffect(() => {
		if(selectedId == null) return;
		if(!panelOpen) return;
		const raf = requestAnimationFrame(() => {
			const card = cardRefs.current.get(selectedId);
			if(card != null) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
		});
		return () => cancelAnimationFrame(raf);
	}, [selectedId, panelOpen]);

	const handleSelectRegion = useCallback((id: string) => {
		setMode("pan");
		setSelectedId(id);
	}, []);

	const handleUpdateRegion = useCallback((region: GeofenceRegion) => {
		const cur = valueRef.current ?? [];
		const idx = cur.findIndex(r => r.id === region.id);
		if(idx < 0) return;
		const next = [...cur];
		next[idx] = region;
		onValueChangeRef.current?.(next);
	}, []);

	const handleRemoveRegion = useCallback((id: string) => {
		const cur = valueRef.current ?? [];
		const idx = cur.findIndex(r => r.id === id);
		if(idx < 0) return;
		onValueChangeRef.current?.(cur.toSpliced(idx, 1));
		setSelectedId(prev => prev === id ? null : prev);
	}, []);

	const handleReorderStart = useCallback((index: number) => {
		setReorderDrag({ from: index, over: null });
	}, []);
	const handleReorderOver = useCallback((index: number) => {
		setReorderDrag(prev => prev == null || prev.over === index ? prev : { ...prev, over: index });
	}, []);
	const handleReorderEnd = useCallback(() => {
		setReorderDrag(null);
	}, []);
	const handleReorderDrop = useCallback((index: number) => {
		setReorderDrag(prev => {
			if(prev == null) return null;
			const from = prev.from;
			if(from !== index) {
				const cur = valueRef.current ?? [];
				const next = [...cur];
				const [moved] = next.splice(from, 1);
				next.splice(index, 0, moved);
				onValueChangeRef.current?.(next);
			}
			return null;
		});
	}, []);

	// --- Search ---
	const [gpsTracking, setGpsTracking] = useState(false);
	useMapGpsTracking({
		enabled: gpsTracking,
		mapRef,
		onError: useCallback(() => setGpsTracking(false), [])
	});

	// Re-center the map when the sidebar opens/closes so the same geographic point stays
	// at the visual center of the *unpadded* area (right of the sidebar).
	const panelOpenMountedRef = useRef(0);
	useEffect(() => {
		const map = mapRef.current;
		if(map == null) return;
		if(panelOpenMountedRef.current < 2) {
			panelOpenMountedRef.current++;
			return;
		}
		const apply = () => {
			map.easeTo({
				center: map.getCenter(),
				padding: { top: 0, right: 0, bottom: 0, left: panelLeftPadding() },
				bearing: map.getBearing(),
				pitch: map.getPitch(),
				duration: 200
			});
		};
		if(map.isStyleLoaded()) apply();
		else map.once("load", apply);
	}, [panelOpen]);

	return (
		<div
			className={cn(
				"relative h-full overflow-hidden",
				"[&_.mapboxgl-ctrl-bottom-left]:transition-[left] [&_.mapboxgl-ctrl-bottom-left]:duration-200",
				panelOpen && "[&_.mapboxgl-ctrl-bottom-left]:left-84!"
			)}
		>
			<div ref={mapContainerRef} className="absolute top-0 left-0 w-full h-full min-h-50lvh" />
			<Presence present={panelOpen}>
				<div
					data-state={panelOpen ? "open" : "closed"}
					className="absolute top-3 left-3 bottom-3 z-20 w-80 max-w-[calc(100%-1.5rem)] bg-white rounded-lg shadow-md flex flex-col overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left duration-200"
				>
					<div className="flex items-center gap-1 p-1.5 border-b">
						<h3 className="font-semibold text-sm flex-1 truncate">Geofence Regions</h3>
						<Button type="button" size="sm" className="h-7" onClick={() => {
							const map = mapRef.current;
							let centerLng = 106.8456;
							let centerLat = -6.2088;
							let radius = 1000;
							if(map != null) {
								const canvas = map.getCanvas();
								const w = canvas.clientWidth;
								const h = canvas.clientHeight;
								const padLeft = 80 + panelLeftPadding();
								const padRight = 80;
								const padTop = 80;
								const padBottom = 80;
								const innerCx = (padLeft + (w - padRight)) / 2;
								const innerCy = (padTop + (h - padBottom)) / 2;
								const halfWPx = Math.max(10, ((w - padRight) - padLeft) / 2);
								const halfHPx = Math.max(10, ((h - padBottom) - padTop) / 2);
								const c = map.unproject([innerCx, innerCy]);
								centerLng = c.lng;
								centerLat = c.lat;
								const eastPt = map.unproject([innerCx + halfWPx, innerCy]);
								const southPt = map.unproject([innerCx, innerCy + halfHPx]);
								const halfWM = turf.distance([centerLng, centerLat], [eastPt.lng, eastPt.lat], { units: "meters" });
								const halfHM = turf.distance([centerLng, centerLat], [southPt.lng, southPt.lat], { units: "meters" });
								radius = Math.max(1, Math.min(halfWM, halfHM));
							}
							prevSelectedRef.current = null;
							const newId = generateRegionId();
							onValueChange?.([{ id: newId, operation: "union", type: "circle", latitude: centerLat, longitude: centerLng, radius }, ...value]);
							setSelectedId(newId);
						}} disabled={disabled}>
							Add Region
						</Button>
					</div>
					<ScrollArea className="flex-1 min-h-0">
						<div className="p-3">
							{value.length == 0 ? (
								<p className="text-sm text-muted-foreground">No geofence regions defined.</p>
							) : (
								<div className="space-y-3">
									{value.map((region, index) => (
										<RegionCard
											key={region.id}
											region={region}
											index={index}
											selected={selectedId === region.id}
											disabled={disabled}
											dragSource={reorderDrag?.from === index}
											dragTarget={reorderDrag != null && reorderDrag.over === index && reorderDrag.from !== index}
											registerRef={registerCardRef}
											onSelect={handleSelectRegion}
											onUpdate={handleUpdateRegion}
											onRemove={handleRemoveRegion}
											onReorderStart={handleReorderStart}
											onReorderOver={handleReorderOver}
											onReorderEnd={handleReorderEnd}
											onReorderDrop={handleReorderDrop}
										/>
									))}
								</div>
							)}
						</div>
					</ScrollArea>
				</div>
			</Presence>
			<Button
				type="button"
				variant="default"
				size="sm"
				className={cn("absolute top-1/2 transform-[translateY(-50%)] z-30 h-10 w-10 p-0 rounded-full shadow-md transition-[left] duration-200", panelOpen ? "left-85" : "left-3", interacting && "pointer-events-none opacity-60")}
				onClick={() => setPanelOpen(!panelOpen)}
				title={!panelOpen ? "Open regions panel" : "Close regions panel"}
			>
				{!panelOpen ? <PanelLeftOpenIcon className="size-4" /> : <PanelLeftCloseIcon className="size-4" />}
			</Button>
			<div className={cn("absolute z-10 flex gap-1 bg-white rounded-lg p-1 shadow-md transition-[left] duration-200 top-3", panelOpen ? "left-85" : "left-3", interacting && "pointer-events-none opacity-60")}>
					<Button type="button" size="sm" variant={mode === "pan" ? "default" : "ghost"} className="h-7 w-7 sm:h-8 sm:w-8 p-0" onClick={() => setMode("pan")} title="Pan / Select">
						<MousePointer2Icon className="size-3.5 sm:size-4" />
					</Button>
					<Button type="button" size="sm" variant={mode === "draw_polygon" ? "default" : "ghost"} className="h-7 w-7 sm:h-8 sm:w-8 p-0" onClick={() => { setMode("draw_polygon"); setSelectedId(null); }} title="Draw Polygon" disabled={disabled}>
						<PentagonIcon className="size-3.5 sm:size-4" />
					</Button>
					<Button type="button" size="sm" variant={mode === "draw_circle" ? "default" : "ghost"} className="h-7 w-7 sm:h-8 sm:w-8 p-0" onClick={() => { setMode("draw_circle"); setSelectedId(null); }} title="Draw Circle" disabled={disabled}>
						<CircleIcon className="size-3.5 sm:size-4" />
					</Button>
					<Button type="button" size="sm" variant={mode === "draw_rectangle" ? "default" : "ghost"} className="h-7 w-7 sm:h-8 sm:w-8 p-0" onClick={() => { setMode("draw_rectangle"); setSelectedId(null); }} title="Draw Rectangle" disabled={disabled}>
						<SquareIcon className="size-3.5 sm:size-4" />
					</Button>
					<div className="w-px bg-border mx-1" />
					<Button type="button" size="sm" variant={gpsTracking ? "default" : "ghost"} className="h-7 w-7 sm:h-8 sm:w-8 p-0" onClick={() => setGpsTracking(t => !t)} title={gpsTracking ? "Stop tracking" : "Track my location"}>
						{gpsTracking ? <LocateFixedIcon className="size-3.5 sm:size-4" /> : <LocateIcon className="size-3.5 sm:size-4" />}
					</Button>
					<div className="w-px bg-border mx-1" />
					<Button type="button" size="sm" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-destructive" onClick={deleteSelected} title="Delete Selected" disabled={selectedId == null || disabled}>
						<Trash2Icon className="size-3.5 sm:size-4" />
					</Button>
				</div>
				<LightPresetControls
					mapRef={mapRef}
					mapReadyTick={styleReadyTick}
					className={cn("absolute top-13 left-3 sm:top-3 sm:left-auto sm:right-3 z-10", interacting && "pointer-events-none opacity-60")}
				/>
			<MapSearchControls
				mapRef={mapRef}
				mapReadyTick={styleReadyTick}
				panelLeftPadding={panelLeftPadding}
				className={cn("absolute z-10 transition-[left] duration-200 top-24 left-3 right-3 sm:top-3 sm:right-auto sm:-translate-x-1/2", panelOpen ? "sm:left-[calc(50%+10.5rem)] sm:w-[min(70%,420px)]" : "sm:left-1/2 sm:w-[min(80%,420px)]", interacting && "pointer-events-none opacity-60")}
			/>
			<MapNavigationControls
				mapRef={mapRef}
				mapReadyTick={styleReadyTick}
				className={cn("absolute bottom-9 right-3 z-10", interacting && "pointer-events-none opacity-60")}
			/>
		</div>
	);
}

function HoldButton({ children, className, disabled, onTick, title }: { children: React.ReactNode, className?: string, disabled?: boolean, onTick: (intensity: number) => void, title: string }) {
	const rafRef = useRef<number | null>(null);
	const pressedRef = useRef(false);
	const intensityRef = useRef(0);
	const lastTimeRef = useRef(0);
	const onTickRef = useRef(onTick);
	onTickRef.current = onTick;

	const ensureLoop = useCallback(() => {
		if(rafRef.current != null) return;
		lastTimeRef.current = performance.now();
		const loop = (now: number) => {
			const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
			lastTimeRef.current = now;
			const target = pressedRef.current ? 1 : 0;
			const rate = 6;
			const diff = target - intensityRef.current;
			const step = Math.sign(diff) * Math.min(Math.abs(diff), rate * dt);
			intensityRef.current += step;
			if(intensityRef.current > 0.001) onTickRef.current(intensityRef.current);
			if(!pressedRef.current && intensityRef.current <= 0.001) {
				intensityRef.current = 0;
				rafRef.current = null;
				return;
			}
			rafRef.current = requestAnimationFrame(loop);
		};
		rafRef.current = requestAnimationFrame(loop);
	}, []);

	const start = useCallback((e: React.SyntheticEvent) => {
		e.preventDefault();
		e.stopPropagation();
		pressedRef.current = true;
		ensureLoop();
	}, [ensureLoop]);

	const stop = useCallback(() => {
		pressedRef.current = false;
	}, []);

	useEffect(() => () => {
		pressedRef.current = false;
		if(rafRef.current != null) cancelAnimationFrame(rafRef.current);
	}, []);

	return (
		<Button
			type="button"
			size="sm"
			variant="ghost"
			className={cn("h-8 w-8 p-0", className)}
			title={title}
			disabled={disabled}
			onMouseDown={start}
			onMouseUp={stop}
			onMouseLeave={stop}
			onTouchStart={start}
			onTouchEnd={stop}
			onTouchCancel={stop}
		>
			{children}
		</Button>
	);
}

function SpringSlider(
	{ bottomIcon, disabled, onTick, title, topIcon }:
	{ bottomIcon: React.ReactNode, disabled?: boolean, onTick: (offset: number) => void, title?: string, topIcon: React.ReactNode }
) {
	const trackRef = useRef<HTMLDivElement>(null);
	const thumbRef = useRef<HTMLDivElement>(null);
	const rafRef = useRef<number | null>(null);
	const offsetRef = useRef(0);
	const targetRef = useRef(0);
	const draggingRef = useRef(false);
	const lastTimeRef = useRef(0);
	const [dragging, setDragging] = useState(false);
	const onTickRef = useRef(onTick);
	onTickRef.current = onTick;

	useEffect(() => {
		if(!dragging) return;
		const previous = document.body.style.cursor;
		document.body.style.cursor = "grabbing";
		return () => { document.body.style.cursor = previous; };
	}, [dragging]);

	const applyThumb = useCallback((offset: number) => {
		const thumb = thumbRef.current;
		if(thumb == null) return;
		const pct = (1 - (offset + 1) / 2) * 100;
		thumb.style.top = `${pct}%`;
	}, []);

	const updateFromClientY = useCallback((clientY: number) => {
		const track = trackRef.current;
		if(track == null) return;
		const rect = track.getBoundingClientRect();
		const center = rect.top + rect.height / 2;
		const half = rect.height / 2;
		const raw = (center - clientY) / half;
		targetRef.current = Math.max(-1, Math.min(1, raw));
	}, []);

	const ensureLoop = useCallback(() => {
		if(rafRef.current != null) return;
		lastTimeRef.current = performance.now();
		const loop = (now: number) => {
			const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
			lastTimeRef.current = now;
			const target = draggingRef.current ? targetRef.current : 0;
			const k = 12;
			const diff = target - offsetRef.current;
			offsetRef.current += diff * Math.min(1, k * dt);
			if(Math.abs(offsetRef.current) > 0.02) onTickRef.current(offsetRef.current);
			applyThumb(offsetRef.current);
			if(!draggingRef.current && Math.abs(offsetRef.current) < 0.001) {
				offsetRef.current = 0;
				applyThumb(0);
				rafRef.current = null;
				return;
			}
			rafRef.current = requestAnimationFrame(loop);
		};
		rafRef.current = requestAnimationFrame(loop);
	}, [applyThumb]);

	const start = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		if(disabled) return;
		e.preventDefault();
		e.currentTarget.setPointerCapture(e.pointerId);
		draggingRef.current = true;
		setDragging(true);
		updateFromClientY(e.clientY);
		ensureLoop();
	}, [disabled, ensureLoop, updateFromClientY]);

	const move = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		if(!draggingRef.current) return;
		updateFromClientY(e.clientY);
	}, [updateFromClientY]);

	const stop = useCallback(() => {
		draggingRef.current = false;
		targetRef.current = 0;
		setDragging(false);
		ensureLoop();
	}, [ensureLoop]);

	useEffect(() => () => {
		if(rafRef.current != null) cancelAnimationFrame(rafRef.current);
	}, []);

	return (
		<div className="flex flex-col items-center gap-1.5 bg-white rounded-full px-2 py-2 shadow-md" title={title}>
			<span className="text-muted-foreground">{topIcon}</span>
			<div
				ref={trackRef}
				className={cn("relative w-2 h-24 sm:h-32 bg-muted rounded-full", dragging ? "cursor-grabbing" : "cursor-grab")}
				style={{ touchAction: "none" }}
				onPointerDown={start}
				onPointerMove={move}
				onPointerUp={stop}
				onPointerCancel={stop}
			>
				<div
					ref={thumbRef}
					className={cn("absolute left-1/2 w-5 h-5 rounded-full bg-white border-2 border-blue-500 shadow", dragging ? "cursor-grabbing" : "cursor-grab")}
					style={{
						top: "50%",
						transform: "translate(-50%, -50%)"
					}}
				/>
			</div>
			<span className="text-muted-foreground">{bottomIcon}</span>
		</div>
	);
}

function buildPolygon(region: GeofenceRegion): geojson.Feature<geojson.Polygon | geojson.MultiPolygon> {
	if(region.type == "circle")
		return turf.circle([region.longitude, region.latitude], region.radius, { steps: 64, units: "meters" });
	if(region.type == "rectangle") {
		return turf.polygon([[
			[region.longitudeA, region.latitudeA],
			[region.longitudeB, region.latitudeA],
			[region.longitudeB, region.latitudeB],
			[region.longitudeA, region.latitudeB],
			[region.longitudeA, region.latitudeA]
		]]);
	}
	if(region.type == "polygon")
		return turf.polygon([[...region.positions.map(([lat, lng]) => [lng, lat]), [region.positions[0][1], region.positions[0][0]]] as [number, number][]]);
	throw new Error("Unknown region type");
}

function convertRegionType(region: GeofenceRegion, newType: GeofenceRegion["type"]): GeofenceRegion {
	if(region.type === newType) return region;
	const polygon = buildPolygon(region);
	const centroidPt = turf.centroid(polygon);
	const [centerLng, centerLat] = centroidPt.geometry.coordinates as [number, number];
	const bbox = turf.bbox(polygon) as [number, number, number, number];
	const [minLng, minLat, maxLng, maxLat] = bbox;
	if(newType === "circle") {
		const halfW = turf.distance([centerLng, centerLat], [minLng, centerLat], { units: "meters" });
		const halfH = turf.distance([centerLng, centerLat], [centerLng, minLat], { units: "meters" });
		return {
			id: region.id,
			operation: region.operation,
			type: "circle",
			latitude: centerLat,
			longitude: centerLng,
			radius: Math.max(1, (halfW + halfH) / 2)
		};
	}
	if(newType === "rectangle") {
		return {
			id: region.id,
			operation: region.operation,
			type: "rectangle",
			latitudeA: minLat,
			longitudeA: minLng,
			latitudeB: maxLat,
			longitudeB: maxLng
		};
	}
	const halfW = turf.distance([centerLng, centerLat], [minLng, centerLat], { units: "meters" });
	const halfH = turf.distance([centerLng, centerLat], [centerLng, minLat], { units: "meters" });
	const r = Math.max(1, (halfW + halfH) / 2);
	const positions: [number, number][] = [];
	for(let i = 0; i < 6; i++) {
		const angle = (i * 60) - 90;
		const pt = turf.destination([centerLng, centerLat], r, angle, { units: "meters" });
		const [lng, lat] = pt.geometry.coordinates as [number, number];
		positions.push([lat, lng]);
	}
	return {
		id: region.id,
		operation: region.operation,
		type: "polygon",
		positions
	};
}

const lightPresetButtons = Object.freeze([
	{ value: "auto", title: "Auto (system time)", icon: <CloudSunIcon className="size-3.5 sm:size-4" /> },
	{ value: "dawn", title: "Dawn", icon: <CloudMoonIcon className="size-3.5 sm:size-4" /> },
	{ value: "day", title: "Day", icon: <SunIcon className="size-3.5 sm:size-4" /> },
	{ value: "dusk", title: "Dusk", icon: <SunsetIcon className="size-3.5 sm:size-4" /> },
	{ value: "night", title: "Night", icon: <MoonIcon className="size-3.5 sm:size-4" /> }
] as const);

export const LightPresetControls = React.memo(function LightPresetControls(
	{ className, mapRef, mapReadyTick }:
	{ className?: string, mapRef: React.RefObject<mapboxgl.Map | null>, mapReadyTick: number }
) {
	const [lightPreset, setLightPreset] = useState<LightPresetMode>("auto");
	const originalLightsRef = useRef<any[] | null>(null);

	// Apply light preset (and refresh in real time when auto)
	useEffect(() => {
		const map = mapRef.current;
		if(map == null) return;
		let timeoutId: ReturnType<typeof setTimeout> | null = null;
		const apply = () => {
			const preset = lightPreset === "auto" ? getAutoLightPreset() : lightPreset;
			const doSet = () => map.setConfigProperty("basemap", "lightPreset", preset);
			if(map.isStyleLoaded()) doSet();
			else map.once("load", doSet);
		};
		const scheduleNext = () => {
			if(lightPreset !== "auto") return;
			const now = new Date();
			const next = nextLightPresetBoundary(now);
			const ms = Math.max(50, next.getTime() - now.getTime() + 100);
			timeoutId = setTimeout(() => {
				apply();
				scheduleNext();
			}, ms);
		};
		apply();
		scheduleNext();
		return () => { if(timeoutId != null) clearTimeout(timeoutId); };
	}, [lightPreset, mapReadyTick, mapRef]);

	// Physically-accurate sun direction in auto mode (preserves preset-driven color/intensity/shadows)
	useEffect(() => {
		const map = mapRef.current;
		if(map == null) return;
		if(lightPreset !== "auto") return;
		const applyLights = () => {
			if(!map.isStyleLoaded()) { map.once("load", applyLights); return; }
			if(originalLightsRef.current == null)
				originalLightsRef.current = JSON.parse(JSON.stringify(map.getLights()));
			if(originalLightsRef.current == null) return;
			const center = map.getCenter();
			const { altitude, azimuth } = computeSunPosition(center.lat, center.lng, new Date());
			const polar = Math.max(0, Math.min(90, 90 - altitude));
			const lights = originalLightsRef.current.map(light => {
				if(light?.id === "directional" && light?.type === "directional") {
					return {
						...light,
						properties: {
							...light.properties,
							direction: [azimuth, polar]
						}
					};
				}
				return light;
			});
			map.setLights(lights);
		};
		applyLights();
		const interval = setInterval(applyLights, 500);
		const onMoveEnd = () => applyLights();
		map.on("moveend", onMoveEnd);
		return () => {
			clearInterval(interval);
			map.off("moveend", onMoveEnd);
			if(map.style != null && originalLightsRef.current != null) {
				map.setLights(originalLightsRef.current);
			}
		};
	}, [lightPreset, mapReadyTick, mapRef]);

	return (
		<div className={cn("flex gap-1 bg-white rounded-lg p-1 shadow-md", className)}>
			{lightPresetButtons.map(b => (
				<Button
					key={b.value}
					type="button"
					size="sm"
					variant={lightPreset === b.value ? "default" : "ghost"}
					className="h-7 w-7 sm:h-8 sm:w-8 p-0"
					onClick={() => setLightPreset(b.value)}
					title={b.title}
				>
					{b.icon}
				</Button>
			))}
		</div>
	);
});

export const MapNavigationControls = React.memo(function MapNavigationControls(
	{ className, disabled = false, mapRef, mapReadyTick }:
	{ className?: string, disabled?: boolean, mapRef: React.RefObject<mapboxgl.Map | null>, mapReadyTick: number }
) {
	const dialRef = useRef<HTMLDivElement>(null);
	const dialDragRef = useRef<{ angle: number, pointerId: number } | null>(null);
	const [dialDragging, setDialDragging] = useState(false);
	const compassNeswRef = useRef<HTMLDivElement>(null);
	const compassArrowRef = useRef<SVGSVGElement>(null);

	// Apply current bearing directly to compass DOM, no react state
	const applyBearing = useCallback((bearing: number) => {
		if(compassNeswRef.current != null)
			compassNeswRef.current.style.transform = `rotate(${-bearing}deg)`;
		if(compassArrowRef.current != null)
			compassArrowRef.current.style.transform = `rotate(${-bearing - 47}deg)`;
	}, []);

	// Subscribe to map rotate; keep compass in sync without rerendering
	useEffect(() => {
		const map = mapRef.current;
		if(map == null) return;
		applyBearing(map.getBearing());
		const onRotate = () => applyBearing(map.getBearing());
		map.on("rotate", onRotate);
		return () => { map.off("rotate", onRotate); };
	}, [applyBearing, mapReadyTick, mapRef]);

	useEffect(() => {
		if(!dialDragging) return;
		const previous = document.body.style.cursor;
		document.body.style.cursor = "grabbing";
		return () => { document.body.style.cursor = previous; };
	}, [dialDragging]);

	const panBy = useCallback((dx: number, dy: number) => {
		const map = mapRef.current;
		if(map == null) return;
		map.panBy([dx, dy], { animate: false });
	}, [mapRef]);

	const adjustPitch = useCallback((delta: number) => {
		const map = mapRef.current;
		if(map == null) return;
		const next = Math.max(0, Math.min(85, map.getPitch() + delta));
		map.setPitch(next);
	}, [mapRef]);

	const adjustZoom = useCallback((delta: number) => {
		const map = mapRef.current;
		if(map == null) return;
		map.setZoom(map.getZoom() + delta);
	}, [mapRef]);

	const resetHeading = useCallback(() => {
		const map = mapRef.current;
		if(map == null) return;
		map.easeTo({ bearing: 0, pitch: 0, duration: 400 });
	}, [mapRef]);

	const rotateByDelta = useCallback((deltaDeg: number) => {
		const map = mapRef.current;
		if(map == null) return;
		const next = map.getBearing() + deltaDeg;
		map.setBearing(next);
		applyBearing(next);
	}, [applyBearing, mapRef]);

	const dialAngleFrom = (clientX: number, clientY: number) => {
		const dial = dialRef.current;
		if(dial == null) return 0;
		const rect = dial.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		return -Math.atan2(clientY - cy, clientX - cx) * 180 / Math.PI;
	};

	const onDialPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if(disabled) return;
		const target = e.target as HTMLElement;
		if(target.closest("[data-dial-inner]") != null) return;
		e.preventDefault();
		e.currentTarget.setPointerCapture(e.pointerId);
		dialDragRef.current = { angle: dialAngleFrom(e.clientX, e.clientY), pointerId: e.pointerId };
		setDialDragging(true);
	};

	const onDialPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		const drag = dialDragRef.current;
		if(drag == null || drag.pointerId !== e.pointerId) return;
		const a = dialAngleFrom(e.clientX, e.clientY);
		let delta = a - drag.angle;
		if(delta > 180) delta -= 360;
		if(delta < -180) delta += 360;
		drag.angle = a;
		rotateByDelta(delta);
	};

	const onDialPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
		const drag = dialDragRef.current;
		if(drag != null && drag.pointerId === e.pointerId) {
			dialDragRef.current = null;
			setDialDragging(false);
		}
	};

	return (
		<div className={cn("flex items-center gap-2 sm:gap-3", className)}>
			<SpringSlider
				title="Tilt"
				disabled={disabled}
				topIcon={<MountainSnowIcon className="size-3.5 sm:size-4" />}
				bottomIcon={<ChevronDownIcon className="size-3.5 sm:size-4" />}
				onTick={offset => adjustPitch(offset * 1.5)}
			/>
			<div
				ref={dialRef}
				className={cn("relative w-36 h-36 sm:w-45 sm:h-45 rounded-full bg-white shadow-md select-none", dialDragging ? "cursor-grabbing" : "cursor-grab")}
				style={{ touchAction: "none" }}
				onPointerDown={onDialPointerDown}
				onPointerMove={onDialPointerMove}
				onPointerUp={onDialPointerEnd}
				onPointerCancel={onDialPointerEnd}
			>
				<div className="absolute inset-2 rounded-full border-2 border-border pointer-events-none" />
				<div ref={compassNeswRef} className="absolute inset-0 pointer-events-none">
					<span className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-red-500">N</span>
					<span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-muted-foreground">S</span>
					<span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted-foreground">W</span>
					<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted-foreground">E</span>
				</div>
				<div data-dial-inner className="absolute inset-0 m-auto w-24 h-24 sm:w-30 sm:h-30 pointer-events-none">
					<HoldButton className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full bg-white shadow-sm h-7 w-7 sm:h-8 sm:w-8 pointer-events-auto" onTick={i => panBy(0, -8 * i)} title="Forward" disabled={disabled}>
						<ArrowUpIcon className="size-3.5 sm:size-4" />
					</HoldButton>
					<HoldButton className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-white shadow-sm h-7 w-7 sm:h-8 sm:w-8 pointer-events-auto" onTick={i => panBy(0, 8 * i)} title="Backward" disabled={disabled}>
						<ArrowDownIcon className="size-3.5 sm:size-4" />
					</HoldButton>
					<HoldButton className="absolute left-0 top-1/2 transform-[translateY(-50%)] rounded-full bg-white shadow-sm h-7 w-7 sm:h-8 sm:w-8 pointer-events-auto" onTick={i => panBy(-8 * i, 0)} title="Left" disabled={disabled}>
						<ArrowLeftIcon className="size-3.5 sm:size-4" />
					</HoldButton>
					<HoldButton className="absolute right-0 top-1/2 transform-[translateY(-50%)] rounded-full bg-white shadow-sm h-7 w-7 sm:h-8 sm:w-8 pointer-events-auto" onTick={i => panBy(8 * i, 0)} title="Right" disabled={disabled}>
						<ArrowRightIcon className="size-3.5 sm:size-4" />
					</HoldButton>
					<Button type="button" size="sm" variant="outline" className="absolute inset-0 m-auto h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-full pointer-events-auto" onClick={resetHeading} title="Reset heading north" disabled={disabled}>
						<NavigationIcon className="size-3.5 sm:size-4" ref={compassArrowRef} />
					</Button>
				</div>
			</div>
			<SpringSlider
				title="Zoom"
				disabled={disabled}
				topIcon={<PlusIcon className="size-3.5 sm:size-4" />}
				bottomIcon={<MinusIcon className="size-3.5 sm:size-4" />}
				onTick={offset => adjustZoom(offset * 0.04)}
			/>
		</div>
	);
});

type RegionCardProps = {
	region: GeofenceRegion;
	index: number;
	selected: boolean;
	disabled: boolean;
	dragSource: boolean;
	dragTarget: boolean;
	registerRef: (id: string, el: HTMLDivElement | null) => void;
	onSelect: (id: string) => void;
	onUpdate: (region: GeofenceRegion) => void;
	onRemove: (id: string) => void;
	onReorderStart: (index: number) => void;
	onReorderOver: (index: number) => void;
	onReorderEnd: () => void;
	onReorderDrop: (index: number) => void;
};

const RegionCard = React.memo(function RegionCard(
	{ region, index, selected, disabled, dragSource, dragTarget, registerRef, onSelect, onUpdate, onRemove, onReorderStart, onReorderOver, onReorderEnd, onReorderDrop }:
	RegionCardProps
) {
	const cardRef = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		registerRef(region.id, cardRef.current);
		return () => { registerRef(region.id, null); };
	}, [region.id, registerRef]);

	return (
		<div
			ref={cardRef}
			className={cn(
				"border rounded-lg p-3 space-y-3 cursor-pointer transition-colors scroll-my-1",
				selected && "ring-2 ring-blue-500 border-blue-500",
				dragSource && "opacity-50",
				dragTarget && "border-blue-500 border-dashed"
			)}
			onClick={() => onSelect(region.id)}
			onDragOver={e => {
				e.preventDefault();
				e.dataTransfer.dropEffect = "move";
				onReorderOver(index);
			}}
			onDrop={e => {
				e.preventDefault();
				onReorderDrop(index);
			}}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span
						draggable={!disabled}
						onDragStart={e => {
							if(disabled) return;
							e.dataTransfer.effectAllowed = "move";
							e.dataTransfer.setData("text/plain", String(index));
							onReorderStart(index);
						}}
						onDragEnd={() => onReorderEnd()}
						onClick={e => e.stopPropagation()}
						className={cn("text-muted-foreground hover:text-foreground", disabled ? "cursor-not-allowed opacity-50" : "cursor-grab active:cursor-grabbing")}
						title="Drag to reorder"
					>
						<GripVerticalIcon className="size-4" />
					</span>
					<span className="size-3 rounded-full shrink-0" style={{ backgroundColor: seededRegionColor(region.id) }} />
					<span className="text-sm font-medium">Region {index + 1}</span>
				</div>
				<Button type="button" variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); onRemove(region.id); }} disabled={disabled}>
					Remove
				</Button>
			</div>
			<div className="space-y-2">
				<div className="grid grid-cols-2 gap-2">
					<div className="space-y-1">
						<Label className="text-xs">Operation</Label>
						<Select
							value={region.operation}
							onValueChange={op => onUpdate({ ...region, operation: op as GeofenceRegion["operation"] })}
							disabled={disabled}
						>
							<SelectTrigger className="w-full h-7">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{Object.entries(operationLabels).map(([key, label]) => (
									<SelectItem key={key} value={key}>{label}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1">
						<Label className="text-xs">Type</Label>
						<Select
							value={region.type}
							onValueChange={newType => onUpdate(convertRegionType(region, newType as GeofenceRegion["type"]))}
							disabled={disabled}
						>
							<SelectTrigger className="w-full h-7">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="circle">Circle</SelectItem>
								<SelectItem value="rectangle">Rectangle</SelectItem>
								<SelectItem value="polygon">Polygon</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
				{region.type == "circle" ? (
					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1">
							<Label className="text-xs">Latitude</Label>
							<Input
								type="number"
								step="any"
								disabled={disabled}
								value={region.latitude}
								onChange={e => onUpdate({ ...region, latitude: e.target.valueAsNumber || 0 })}
								className="h-7 text-xs"
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-xs">Longitude</Label>
							<Input
								type="number"
								step="any"
								disabled={disabled}
								value={region.longitude}
								onChange={e => onUpdate({ ...region, longitude: e.target.valueAsNumber || 0 })}
								className="h-7 text-xs"
							/>
						</div>
						<div className="space-y-1 col-span-2">
							<Label className="text-xs">Radius (m)</Label>
							<Input
								type="number"
								min={1}
								disabled={disabled}
								value={region.radius}
								onChange={e => onUpdate({ ...region, radius: Math.max(e.target.valueAsNumber || 0, 1) })}
								className="h-7 text-xs"
							/>
						</div>
					</div>
				) : null}
				{region.type == "rectangle" ? (
					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1">
							<Label className="text-xs">Latitude A</Label>
							<Input
								type="number"
								step="any"
								disabled={disabled}
								value={region.latitudeA}
								onChange={e => onUpdate({ ...region, latitudeA: e.target.valueAsNumber || 0 })}
								className="h-7 text-xs"
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-xs">Longitude A</Label>
							<Input
								type="number"
								step="any"
								disabled={disabled}
								value={region.longitudeA}
								onChange={e => onUpdate({ ...region, longitudeA: e.target.valueAsNumber || 0 })}
								className="h-7 text-xs"
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-xs">Latitude B</Label>
							<Input
								type="number"
								step="any"
								disabled={disabled}
								value={region.latitudeB}
								onChange={e => onUpdate({ ...region, latitudeB: e.target.valueAsNumber || 0 })}
								className="h-7 text-xs"
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-xs">Longitude B</Label>
							<Input
								type="number"
								step="any"
								disabled={disabled}
								value={region.longitudeB}
								onChange={e => onUpdate({ ...region, longitudeB: e.target.valueAsNumber || 0 })}
								className="h-7 text-xs"
							/>
						</div>
					</div>
				) : null}
				{region.type == "polygon" ? (
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label className="text-xs">Vertices</Label>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-6 text-xs px-2"
								onClick={() => {
									const positions = region.positions;
									let bestEdge = 0;
									let bestDist = -1;
									for(let i = 0; i < positions.length; i++) {
										const a = positions[i];
										const b = positions[(i + 1) % positions.length];
										const d = turf.distance([a[1], a[0]], [b[1], b[0]], { units: "meters" });
										if(d > bestDist) { bestDist = d; bestEdge = i; }
									}
									const a = positions[bestEdge];
									const b = positions[(bestEdge + 1) % positions.length];
									const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
									const newPositions = [...positions];
									newPositions.splice(bestEdge + 1, 0, mid);
									onUpdate({ ...region, positions: newPositions });
								}}
								disabled={disabled}
							>
								Add vertex
							</Button>
						</div>
						{region.positions.map((pos, posIndex) => (
							<div key={posIndex} className="flex items-end gap-1">
								<div className="flex-1 space-y-1">
									{posIndex == 0 ? <Label className="text-xs">Latitude</Label> : null}
									<Input
										type="number"
										step="any"
										disabled={disabled}
										value={pos[0]}
										onChange={e => {
											const newPositions = [...region.positions];
											newPositions[posIndex] = [e.target.valueAsNumber || 0, pos[1]];
											onUpdate({ ...region, positions: newPositions });
										}}
										className="h-7 text-xs"
									/>
								</div>
								<div className="flex-1 space-y-1">
									{posIndex == 0 ? <Label className="text-xs">Longitude</Label> : null}
									<Input
										type="number"
										step="any"
										disabled={disabled}
										value={pos[1]}
										onChange={e => {
											const newPositions = [...region.positions];
											newPositions[posIndex] = [pos[0], e.target.valueAsNumber || 0];
											onUpdate({ ...region, positions: newPositions });
										}}
										className="h-7 text-xs"
									/>
								</div>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-7 px-1.5 text-xs"
									disabled={disabled || region.positions.length <= 3}
									onClick={() => {
										if(region.positions.length <= 3) return;
										onUpdate({ ...region, positions: region.positions.toSpliced(posIndex, 1) });
									}}
								>
									<XIcon />
								</Button>
							</div>
						))}
					</div>
				) : null}
			</div>
		</div>
	);
});

export const MapSearchControls = React.memo(function MapSearchControls(
	{ className, mapRef, mapReadyTick, panelLeftPadding }:
	{
		className?: string,
		mapRef: React.RefObject<mapboxgl.Map | null>,
		mapReadyTick: number,
		panelLeftPadding?: () => number
	}
) {
	const [searchQuery, setSearchQuery] = useState("");
	const [autocompleteResults, setAutocompleteResults] = useState<GeocodeFeature[] | null>(null);
	const [autocompleteOpen, setAutocompleteOpen] = useState(false);
	const [autocompleteLoading, setAutocompleteLoading] = useState(false);
	const [searchResults, setSearchResults] = useState<GeocodeFeature[] | null>(null);
	const [searchLoading, setSearchLoading] = useState(false);
	const [activeFeatureKey, setActiveFeatureKey] = useState<string | null>(null);
	const [searchMoved, setSearchMoved] = useState(false);
	const lastAutoQueryRef = useRef<string>("");
	const lastSearchQueryRef = useRef<string>("");
	const lastSearchBoundsRef = useRef<mapboxgl.LngLatBounds | null>(null);
	const searchContainerRef = useRef<HTMLDivElement>(null);
	const searchMarkerRef = useRef<mapboxgl.Marker | null>(null);

	const featureKey = (feature: GeocodeFeature, fallbackIndex?: number) =>
		feature.properties.gid ?? feature.properties.id ?? `idx-${fallbackIndex ?? 0}`;

	const clearSearchMarker = useCallback(() => {
		searchMarkerRef.current?.remove();
		searchMarkerRef.current = null;
		setActiveFeatureKey(null);
	}, []);

	const placeSearchMarker = useCallback((feature: GeocodeFeature, key: string) => {
		const map = mapRef.current;
		if(map == null) return;
		const [lng, lat] = feature.geometry.coordinates;
		searchMarkerRef.current?.remove();
		const el = document.createElement("div");
		el.style.cssText = "width:24px;height:32px;display:flex;align-items:flex-start;justify-content:center;cursor:pointer;";
		el.innerHTML = "<svg width=\"24\" height=\"32\" viewBox=\"0 0 24 32\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M12 0C5.373 0 0 5.373 0 12c0 8.5 12 20 12 20s12-11.5 12-20C24 5.373 18.627 0 12 0z\" fill=\"#ef4444\" stroke=\"white\" stroke-width=\"1.5\"/><circle cx=\"12\" cy=\"12\" r=\"4\" fill=\"white\"/></svg>";
		el.title = "Click to remove";
		el.addEventListener("click", e => { e.stopPropagation(); clearSearchMarker(); });
		searchMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" }).setLngLat([lng, lat]).addTo(map);
		setActiveFeatureKey(key);
		if(feature.bbox != null) {
			map.fitBounds(feature.bbox, { padding: { top: 80, right: 80, bottom: 80, left: 80 + (panelLeftPadding?.() ?? 0) }, bearing: map.getBearing(), pitch: map.getPitch(), duration: animationDurationToBounds(map, feature.bbox), maxZoom: 16 });
		} else {
			map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 14), bearing: map.getBearing(), pitch: map.getPitch(), duration: animationDurationToCenter(map, [lng, lat]) });
		}
	}, [clearSearchMarker, mapRef, panelLeftPadding]);

	useEffect(() => () => { searchMarkerRef.current?.remove(); searchMarkerRef.current = null; }, []);

	// Debounced autocomplete on type
	useEffect(() => {
		const q = searchQuery.trim();
		if(q.length < 2) {
			setAutocompleteResults(null);
			setAutocompleteLoading(false);
			return;
		}
		if(q === lastAutoQueryRef.current && autocompleteResults != null) return;
		const controller = new AbortController();
		setAutocompleteLoading(true);
		const timer = setTimeout(async () => {
			try {
				const map = mapRef.current;
				const features = await fetchGeocode("autocomplete", q, map?.getBounds() ?? null, controller.signal);
				lastAutoQueryRef.current = q;
				lastSearchBoundsRef.current = map?.getBounds() ?? null;
				setSearchMoved(false);
				setAutocompleteResults(features);
			} catch(err) {
				if((err as Error).name !== "AbortError") setAutocompleteResults([]);
			} finally {
				setAutocompleteLoading(false);
			}
		}, 300);
		return () => { controller.abort(); clearTimeout(timer); };
	}, [searchQuery, mapRef]); // eslint-disable-line react-hooks/exhaustive-deps

	// Close search-result cards when query changes from the one that produced them
	useEffect(() => {
		if(searchResults != null && searchQuery.trim() !== lastSearchQueryRef.current) setSearchResults(null);
	}, [searchQuery, searchResults]);

	// Clear the search marker entirely when the query is emptied
	useEffect(() => {
		if(searchQuery.length === 0) clearSearchMarker();
	}, [searchQuery, clearSearchMarker]);

	// Track viewport movement to surface a "Search this area" prompt while results are visible
	useEffect(() => {
		const map = mapRef.current;
		if(map == null) return;
		const showsResults = searchResults != null || (autocompleteOpen && (autocompleteResults?.length ?? 0) > 0);
		if(!showsResults || lastSearchBoundsRef.current == null) {
			setSearchMoved(false);
			return;
		}
		const onMoveEnd = () => {
			const last = lastSearchBoundsRef.current;
			if(last == null) return;
			const now = map.getBounds();
			if(now == null) return;
			const lastCenter = last.getCenter();
			const nowCenter = now.getCenter();
			const dLng = Math.abs(lastCenter.lng - nowCenter.lng);
			const dLat = Math.abs(lastCenter.lat - nowCenter.lat);
			const lastWidth = last.getEast() - last.getWest();
			const lastHeight = last.getNorth() - last.getSouth();
			const threshold = 0.25;
			const moved = dLng > lastWidth * threshold || dLat > lastHeight * threshold;
			setSearchMoved(moved);
		};
		map.on("moveend", onMoveEnd);
		return () => { map.off("moveend", onMoveEnd); };
	}, [searchResults, autocompleteOpen, autocompleteResults, mapReadyTick, mapRef]);

	// Click outside the search container closes the autocomplete dropdown
	useEffect(() => {
		if(!autocompleteOpen) return;
		const onPointerDown = (e: PointerEvent) => {
			if(searchContainerRef.current?.contains(e.target as Node)) return;
			setAutocompleteOpen(false);
		};
		document.addEventListener("pointerdown", onPointerDown, true);
		return () => document.removeEventListener("pointerdown", onPointerDown, true);
	}, [autocompleteOpen]);

	const runSearch = useCallback(async () => {
		const q = searchQuery.trim();
		if(q.length < 2) return;
		setAutocompleteOpen(false);
		setSearchLoading(true);
		try {
			const map = mapRef.current;
			const features = await fetchGeocode("search", q, map?.getBounds() ?? null);
			lastSearchQueryRef.current = q;
			lastSearchBoundsRef.current = map?.getBounds() ?? null;
			setSearchMoved(false);
			setSearchResults(features);
		} catch {
			setSearchResults([]);
		} finally {
			setSearchLoading(false);
		}
	}, [searchQuery, mapRef]);

	const rerunInThisArea = useCallback(async () => {
		const map = mapRef.current;
		if(map == null) return;
		lastSearchBoundsRef.current = map.getBounds();
		setSearchMoved(false);
		if(searchResults != null) {
			await runSearch();
			return;
		}
		const q = searchQuery.trim();
		if(q.length < 2) return;
		setAutocompleteLoading(true);
		try {
			const features = await fetchGeocode("autocomplete", q, map.getBounds() ?? null);
			lastAutoQueryRef.current = q;
			setAutocompleteResults(features);
		} catch(err) {
			if((err as Error).name !== "AbortError") setAutocompleteResults([]);
		} finally {
			setAutocompleteLoading(false);
		}
	}, [searchQuery, searchResults, runSearch, mapRef]);

	return (
		<div ref={searchContainerRef} className={cn("flex flex-col", className)}>
			<div className="flex items-center gap-1 bg-white rounded-lg p-1 pl-3 shadow-md">
				<Input
					type="text"
					value={searchQuery}
					placeholder="Search a place..."
					className="h-8 border-0 shadow-none focus-visible:ring-0 px-0 text-sm"
					onChange={e => { setSearchQuery(e.target.value); setAutocompleteOpen(true); }}
					onFocus={() => setAutocompleteOpen(true)}
					onKeyDown={e => {
						if(e.key === "Enter") { e.preventDefault(); runSearch(); }
						else if(e.key === "Escape") setAutocompleteOpen(false);
					}}
				/>
				{searchQuery.length > 0 ? (
					<Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => { setSearchQuery(""); setAutocompleteResults(null); setSearchResults(null); setAutocompleteOpen(false); clearSearchMarker(); }} title="Clear">
						<XIcon className="size-4" />
					</Button>
				) : null}
				<Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={runSearch} disabled={searchQuery.trim().length < 2 || searchLoading} title="Search">
					<SearchIcon className="size-4" />
				</Button>
			</div>
			<div
				data-state={autocompleteOpen && searchQuery.trim().length >= 2 ? "open" : "closed"}
				className="grid grid-rows-[0fr] opacity-0 pointer-events-none data-[state=open]:grid-rows-[1fr] data-[state=open]:opacity-100 data-[state=open]:pointer-events-auto data-[state=open]:mt-2 transition-[grid-template-rows,margin-top,opacity] duration-200"
			>
				<div className="min-h-0 overflow-hidden">
					<div className="bg-white rounded-lg shadow-md p-2">
						{autocompleteLoading && autocompleteResults == null ? (
							<div className="px-3 py-2 text-xs text-muted-foreground">Searching...</div>
						) : autocompleteResults != null && autocompleteResults.length === 0 ? (
							<div className="px-3 py-2 text-xs text-muted-foreground">No results</div>
						) : (
							<ScrollArea className="h-full *:data-radix-scroll-area-viewport:max-h-80">
								<ul>
									{(autocompleteResults ?? []).map((feature, i) => {
										const key = featureKey(feature, i);
										const isActive = activeFeatureKey === key;
										return (
											<li key={key}>
												<button
													type="button"
													className={cn(
														"w-full text-left px-3 py-2 rounded-md hover:bg-muted flex items-start gap-2 text-sm transition-colors",
														isActive && "bg-blue-50 hover:bg-blue-100"
													)}
													onClick={() => {
														placeSearchMarker(feature, key);
														setAutocompleteOpen(false);
														setSearchQuery(v => feature.properties.name ?? v);
													}}
												>
													<MapPinIcon className={cn("size-4 mt-0.5 shrink-0", isActive ? "text-red-500" : "text-muted-foreground")} />
													<div className="min-w-0 max-w-85">
														<div className="truncate font-medium">{feature.properties.name}</div>
														<div className="truncate text-xs text-muted-foreground">{[feature.properties.neighbourhood, feature.properties.locality, feature.properties.region, feature.properties.country].filter(v => v != null).join(", ")}</div>
													</div>
												</button>
											</li>
										);
									})}
								</ul>
								<ScrollBar orientation="vertical" className="opacity-60 hover:opacity-90" />
							</ScrollArea>
						)}
					</div>
				</div>
			</div>
			<div
				data-state={searchResults != null ? "open" : "closed"}
				className="grid grid-rows-[0fr] opacity-0 pointer-events-none data-[state=open]:grid-rows-[1fr] data-[state=open]:opacity-100 data-[state=open]:pointer-events-auto data-[state=open]:mt-2 transition-[grid-template-rows,margin-top,opacity] duration-200"
			>
				<div className="min-h-0 overflow-hidden">
					<div className="bg-white rounded-lg shadow-md p-2">
						{searchLoading ? (
							<div className="px-2 py-2 text-xs text-muted-foreground">Searching...</div>
						) : searchResults != null && searchResults.length === 0 ? (
							<div className="px-2 py-2 text-xs text-muted-foreground">No results</div>
						) : (
							<ScrollArea className="w-full">
								<div className="flex gap-2">
									{(searchResults ?? []).map((feature, i) => {
										const key = featureKey(feature, i);
										const isActive = activeFeatureKey === key;
										return (
											<button
												key={key}
												type="button"
												className={cn(
													"shrink-0 w-48 text-left p-2 rounded-md border transition-colors",
													isActive ? "border-blue-500 bg-blue-50" : "hover:border-blue-500 hover:bg-muted/50"
												)}
												onClick={() => isActive ? clearSearchMarker() : placeSearchMarker(feature, key)}
											>
												<div className="flex items-start gap-2">
													<MapPinIcon className={cn("size-4 mt-0.5 shrink-0", isActive ? "text-red-500" : "text-muted-foreground")} />
													<div className="min-w-0">
														<div className="truncate font-medium text-sm">{feature.properties.name}</div>
														<div className="truncate text-xs text-muted-foreground">{[feature.properties.neighbourhood, feature.properties.locality, feature.properties.region, feature.properties.country].filter(v => v != null).join(", ")}</div>
													</div>
												</div>
											</button>
										);
									})}
								</div>
								<ScrollBar orientation="horizontal" className="opacity-60 hover:opacity-90" />
							</ScrollArea>
						)}
					</div>
				</div>
			</div>
			<div
				data-state={searchMoved ? "open" : "closed"}
				className="grid grid-rows-[1fr] opacity-0 pointer-events-none data-[state=open]:opacity-100 data-[state=open]:pointer-events-auto data-[state=open]:mt-2 transition-[margin-top,opacity] duration-200"
			>
				<div className="min-h-0 overflow-hidden">
					<div className="flex justify-center">
						<Button type="button" size="sm" variant="default" className="h-8 rounded-full shadow-md gap-1.5 text-xs" onClick={rerunInThisArea}>
							<SearchIcon className="size-3.5" />
							Search in this region
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
});
