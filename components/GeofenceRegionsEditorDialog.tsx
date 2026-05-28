"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import * as turf from "@turf/turf";
import * as geojson from "geojson";
import mapboxgl from "mapbox-gl";

import cn from "@/utils/cn";
import { Button } from "@/components/radix/Button";
import { Dialog, DialogTitle, DialogHeader, DialogContent, DialogDescription } from "@/components/radix/Dialog";
import { Input } from "@/components/radix/Input";
import { Label } from "@/components/radix/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/radix/Select"; // eslint-disable-line sort-imports

import "mapbox-gl/dist/mapbox-gl.css";
import { CircleIcon, MousePointer2Icon, PentagonIcon, SquareIcon, Trash2Icon, XIcon } from "lucide-react";

type InteractionMode = "pan" | "draw_polygon" | "draw_circle" | "draw_rectangle";

const operationLabels = Object.freeze({
	"union": "Union",
	"difference": "Difference",
	"intersect": "Intersect",
	"exclusion": "Exclusion"
});

function seededRegionColor(index: number): string {
	const h = ((index * 137.508) + 60) % 360;
	return `hsl(${h}, 65%, 50%)`;
}

function parseNum(v: string): number {
	const n = parseFloat(v);
	return Number.isNaN(n) ? 0 : n;
}

type GeofenceRegion = {
	operation: "union" | "difference" | "intersect" | "exclusion";
	type: "circle";
	latitude: number;
	longitude: number;
	radius: number;
} | {
	operation: "union" | "difference" | "intersect" | "exclusion";
	type: "polygon";
	positions: [number, number][];
} | {
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
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
	const [mode, setMode] = useState<InteractionMode>("pan");
	const drawStateRef = useRef<{ points: [number, number][], startLngLat?: [number, number] } | null>(null);
	const markersRef = useRef<mapboxgl.Marker[]>([]);
	const ghostSourceId = "ghost-preview";
	const dragStateRef = useRef<{ type: string, regionIndex: number, startLngLat: [number, number], originalRegion: GeofenceRegion, vertexIndex?: number } | null>(null);

	const clearMarkers = useCallback(() => {
		markersRef.current.forEach(m => m.remove());
		markersRef.current = [];
	}, []);

	const updateRegion = useCallback((index: number, region: GeofenceRegion) => {
		const updated = [...value];
		updated[index] = region;
		onValueChange?.(updated);
	}, [value, onValueChange]);

	useEffect(() => {
		if(mapContainerRef.current == null) return;
		mapboxgl.accessToken = "pk.eyJ1IjoibmFkaGlmcmFkaXR5byIsImEiOiJjbW80OG1menEwb2JnMm9zZ2w0YjUzMzhxIn0.D28hzAHuC353e4e_Q3YV1A";
		const map = new mapboxgl.Map({
			container: mapContainerRef.current,
			style: "mapbox://styles/mapbox/standard",
			center: [106.8456, -6.2088],
			zoom: 12
		});
		map.on("load", () => {
			map.setConfigProperty("basemap", "lightPreset", "day");
			map.setConfigProperty("basemap", "show3dObjects", true);
			map.setConfigProperty("basemap", "showTerrain", true);
		});
		mapRef.current = map;
		return () => {
			map.remove();
			mapRef.current = null;
		};
	}, []);
	// Render regions and combined geofence
	useEffect(() => {
		const map = mapRef.current;
		if(map == null || !map.isStyleLoaded()) return;
		if(map.getLayer("combined-geofence")) map.removeLayer("combined-geofence");
		if(map.getSource("combined-geofence")) map.removeSource("combined-geofence");
		if(map.getLayer(ghostSourceId)) map.removeLayer(ghostSourceId);
		if(map.getSource(ghostSourceId)) map.removeSource(ghostSourceId);
		for(let i = 0; i < 100; i++) {
			if(map.getLayer(`geofence-outline-${i}`)) map.removeLayer(`geofence-outline-${i}`);
			if(map.getLayer(`geofence-fill-${i}`)) map.removeLayer(`geofence-fill-${i}`);
			if(map.getSource(`geofence-region-${i}`)) map.removeSource(`geofence-region-${i}`);
		}
		if(value.length == 0) return;
		let currentPolygon: geojson.Feature<geojson.Polygon | geojson.MultiPolygon> | null = null;
		for(let i = value.length - 1; i >= 0; i--) {
			const geofenceRegion = value[i];
			const polygon = buildPolygon(geofenceRegion);
			if(currentPolygon == null) { currentPolygon = polygon; continue; }
			if(geofenceRegion.operation == "union")
				currentPolygon = turf.union(turf.featureCollection([currentPolygon, polygon]))!;
			else if(geofenceRegion.operation == "difference")
				currentPolygon = turf.difference(turf.featureCollection([currentPolygon, polygon]))!;
			else if(geofenceRegion.operation == "intersect")
				currentPolygon = turf.intersect(turf.featureCollection([currentPolygon, polygon]))!;
			else if(geofenceRegion.operation == "exclusion") {
				const union = turf.union(turf.featureCollection([currentPolygon, polygon]))!;
				const intersection = turf.intersect(turf.featureCollection([currentPolygon, polygon]));
				currentPolygon = intersection ? turf.difference(turf.featureCollection([union, intersection]))! : union;
			}
		}
		if(currentPolygon) {
			map.addSource("combined-geofence", { type: "geojson", data: currentPolygon });
			map.addLayer({ id: "combined-geofence", type: "fill", source: "combined-geofence", paint: { "fill-color": "#3b82f6", "fill-opacity": 0.15 } });
			const bbox = turf.bbox(currentPolygon);
			map.fitBounds(bbox as [number, number, number, number], { padding: 50 });
		}
		for(let i = 0; i < value.length; i++) {
			const polygon = buildPolygon(value[i]);
			const sourceId = `geofence-region-${i}`;
			map.addSource(sourceId, { type: "geojson", data: polygon });
			map.addLayer({
				id: `geofence-fill-${i}`, type: "fill", source: sourceId,
				paint: { "fill-color": seededRegionColor(i), "fill-opacity": selectedIndex === i ? 0.35 : 0.1 }
			});
			map.addLayer({
				id: `geofence-outline-${i}`, type: "line", source: sourceId,
				paint: { "line-color": seededRegionColor(i), "line-width": selectedIndex === i ? 4 : 2 }
			});
		}
		// Ghost preview source
		map.addSource(ghostSourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
		map.addLayer({ id: ghostSourceId, type: "fill", source: ghostSourceId, paint: { "fill-color": "#facc15", "fill-opacity": 0.3 } });
	}, [value, selectedIndex]);

	// Click-to-select regions
	useEffect(() => {
		const map = mapRef.current;
		if(!map || disabled) return;
		const onClick = (e: mapboxgl.MapMouseEvent) => {
			if(mode !== "pan") return;
			const point = e.point;
			for(let i = 0; i < value.length; i++) {
				const features = map.queryRenderedFeatures(point, { layers: [`geofence-fill-${i}`] });
				if(features.length > 0) { setSelectedIndex(i); return; }
			}
			setSelectedIndex(null);
		};
		map.on("click", onClick);
		return () => { map.off("click", onClick); };
	}, [value, mode, disabled]);

	// Editing handles for selected region
	useEffect(() => {
		clearMarkers();
		const map = mapRef.current;
		if(!map || selectedIndex == null || disabled || mode !== "pan") return;
		const region = value[selectedIndex];
		if(!region) return;

		const createHandle = (lngLat: [number, number], cursor: string, onDrag: (lngLat: mapboxgl.LngLat) => void, onDragEnd: () => void, className = "handle-vertex") => {
			const el = document.createElement("div");
			el.className = className;
			el.style.cssText = `width:14px;height:14px;border-radius:${className === "handle-midpoint" ? "2px" : "50%"};background:white;border:2px solid ${className === "handle-midpoint" ? "#f59e0b" : "#3b82f6"};cursor:${cursor};box-shadow:0 1px 3px rgba(0,0,0,0.3);`;
			const marker = new mapboxgl.Marker({ element: el, draggable: true }).setLngLat(lngLat).addTo(map);
			marker.on("drag", () => {
				onDrag(marker.getLngLat());
			});
			marker.on("dragend", () => { onDragEnd(); updateGhost(null); });
			markersRef.current.push(marker);
			return marker;
		};

		const updateGhost = (data: geojson.Feature | null) => {
			const src = map.getSource(ghostSourceId) as mapboxgl.GeoJSONSource | undefined;
			if(src) src.setData(data ?? { type: "FeatureCollection", features: [] } as any);
		};

		if(region.type === "circle") {
			// Center handle
			createHandle([region.longitude, region.latitude], "move", (lngLat) => {
				const ghost = turf.circle([lngLat.lng, lngLat.lat], region.radius, { steps: 64, units: "meters" });
				updateGhost(ghost);
			}, () => {
				const pos = markersRef.current[0]?.getLngLat();
				if(pos) updateRegion(selectedIndex, { ...region, latitude: pos.lat, longitude: pos.lng });
			});
			// Radius handles at 4 cardinal directions
			const cardinals = [0, 90, 180, 270];
			cardinals.forEach(bearing => {
				const pt = turf.destination([region.longitude, region.latitude], region.radius, bearing, { units: "meters" });
				const coords = pt.geometry.coordinates as [number, number];
				createHandle(coords, "ew-resize", (lngLat) => {
					const dist = turf.distance([region.longitude, region.latitude], [lngLat.lng, lngLat.lat], { units: "meters" });
					const ghost = turf.circle([region.longitude, region.latitude], dist, { steps: 64, units: "meters" });
					updateGhost(ghost);
				}, () => {
					const center = markersRef.current[0]?.getLngLat() ?? { lng: region.longitude, lat: region.latitude };
					const handlePos = markersRef.current[markersRef.current.length - 1]?.getLngLat();
					if(handlePos) {
						const newRadius = turf.distance([center.lng, center.lat], [handlePos.lng, handlePos.lat], { units: "meters" });
						updateRegion(selectedIndex, { ...region, radius: Math.max(10, newRadius) });
					}
				});
			});
			// Whole-region drag
			const dragEl = document.createElement("div");
			dragEl.style.cssText = "width:1px;height:1px;opacity:0;pointer-events:none;";
			const dragMarker = new mapboxgl.Marker({ element: dragEl }).setLngLat([region.longitude, region.latitude]).addTo(map);
			markersRef.current.push(dragMarker);
		} else if(region.type === "rectangle") {
			const corners: [number, number][] = [
				[region.longitudeA, region.latitudeA],
				[region.longitudeB, region.latitudeA],
				[region.longitudeB, region.latitudeB],
				[region.longitudeA, region.latitudeB]
			];
			// Corner handles
			corners.forEach((corner, ci) => {
				createHandle(corner, "nwse-resize", (lngLat) => {
					const newCorners = [...corners];
					newCorners[ci] = [lngLat.lng, lngLat.lat];
					// Adjust adjacent corners
					if(ci === 0) { newCorners[1][1] = lngLat.lat; newCorners[3][0] = lngLat.lng; }
					else if(ci === 1) { newCorners[0][1] = lngLat.lat; newCorners[2][0] = lngLat.lng; }
					else if(ci === 2) { newCorners[1][0] = lngLat.lng; newCorners[3][1] = lngLat.lat; }
					else { newCorners[0][0] = lngLat.lng; newCorners[2][1] = lngLat.lat; }
					const ghost = turf.polygon([[newCorners[0], newCorners[1], newCorners[2], newCorners[3], newCorners[0]]]);
					updateGhost(ghost);
				}, () => {
					const m = markersRef.current[ci]?.getLngLat();
					if(!m) return;
					let latA = region.latitudeA, lngA = region.longitudeA, latB = region.latitudeB, lngB = region.longitudeB;
					if(ci === 0) { latA = m.lat; lngA = m.lng; }
					else if(ci === 1) { latA = m.lat; lngB = m.lng; }
					else if(ci === 2) { latB = m.lat; lngB = m.lng; }
					else { latB = m.lat; lngA = m.lng; }
					updateRegion(selectedIndex, { ...region, latitudeA: latA, longitudeA: lngA, latitudeB: latB, longitudeB: lngB });
				});
			});
			// Edge-center handles
			const edges: [number, number][] = [
				[(corners[0][0] + corners[1][0]) / 2, corners[0][1]], // top
				[corners[1][0], (corners[1][1] + corners[2][1]) / 2], // right
				[(corners[2][0] + corners[3][0]) / 2, corners[2][1]], // bottom
				[corners[3][0], (corners[0][1] + corners[3][1]) / 2], // left
			];
			edges.forEach((edge, ei) => {
				createHandle(edge, ei % 2 === 0 ? "ns-resize" : "ew-resize", (lngLat) => {
					let latA = region.latitudeA, lngA = region.longitudeA, latB = region.latitudeB, lngB = region.longitudeB;
					if(ei === 0) latA = lngLat.lat;
					else if(ei === 1) lngB = lngLat.lng;
					else if(ei === 2) latB = lngLat.lat;
					else lngA = lngLat.lng;
					const ghost = turf.polygon([[[lngA, latA], [lngB, latA], [lngB, latB], [lngA, latB], [lngA, latA]]]);
					updateGhost(ghost);
				}, () => {
					const m = markersRef.current[4 + ei]?.getLngLat();
					if(!m) return;
					let latA = region.latitudeA, lngA = region.longitudeA, latB = region.latitudeB, lngB = region.longitudeB;
					if(ei === 0) latA = m.lat;
					else if(ei === 1) lngB = m.lng;
					else if(ei === 2) latB = m.lat;
					else lngA = m.lng;
					updateRegion(selectedIndex, { ...region, latitudeA: latA, longitudeA: lngA, latitudeB: latB, longitudeB: lngB });
				}, "handle-midpoint");
			});
		} else if(region.type === "polygon") {
			// Vertex handles
			region.positions.forEach((pos, vi) => {
				createHandle([pos[1], pos[0]], "crosshair", (lngLat) => {
					const newPositions = [...region.positions];
					newPositions[vi] = [lngLat.lat, lngLat.lng];
					const ghost = buildPolygon({ ...region, positions: newPositions });
					updateGhost(ghost);
				}, () => {
					const m = markersRef.current[vi]?.getLngLat();
					if(!m) return;
					const newPositions = [...region.positions];
					newPositions[vi] = [m.lat, m.lng];
					updateRegion(selectedIndex, { ...region, positions: newPositions });
				});
			});
			// Midpoint handles
			region.positions.forEach((pos, vi) => {
				const next = region.positions[(vi + 1) % region.positions.length];
				const midLat = (pos[0] + next[0]) / 2;
				const midLng = (pos[1] + next[1]) / 2;
				createHandle([midLng, midLat], "copy", (lngLat) => {
					const newPositions = [...region.positions];
					newPositions.splice(vi + 1, 0, [lngLat.lat, lngLat.lng]);
					const ghost = buildPolygon({ ...region, positions: newPositions });
					updateGhost(ghost);
				}, () => {
					const m = markersRef.current[region.positions.length + vi]?.getLngLat();
					if(!m) return;
					const newPositions = [...region.positions];
					newPositions.splice(vi + 1, 0, [m.lat, m.lng]);
					updateRegion(selectedIndex, { ...region, positions: newPositions });
				}, "handle-midpoint");
			});
		}
		return () => { clearMarkers(); };
	}, [selectedIndex, value, disabled, mode, clearMarkers, updateRegion]);

	// Drawing mode interactions
	useEffect(() => {
		const map = mapRef.current;
		if(!map || disabled) return;
		if(mode === "pan") { map.getCanvas().style.cursor = ""; map.dragPan.enable(); return; }
		map.dragPan.enable();
		map.getCanvas().style.cursor = "crosshair";

		const drawClickHandler = (e: mapboxgl.MapMouseEvent) => {
			const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
			if(mode === "draw_circle") {
				const newRegion: GeofenceRegion = { operation: "union", type: "circle", latitude: lngLat[1], longitude: lngLat[0], radius: 500 };
				onValueChange?.([...value, newRegion]);
				setSelectedIndex(value.length);
				setMode("pan");
			} else if(mode === "draw_rectangle") {
				if(!drawStateRef.current) {
					drawStateRef.current = { points: [], startLngLat: lngLat };
				} else {
					const start = drawStateRef.current.startLngLat!;
					const newRegion: GeofenceRegion = {
						operation: "union", type: "rectangle",
						latitudeA: start[1], longitudeA: start[0],
						latitudeB: lngLat[1], longitudeB: lngLat[0]
					};
					onValueChange?.([...value, newRegion]);
					setSelectedIndex(value.length);
					setMode("pan");
					drawStateRef.current = null;
				}
			} else if(mode === "draw_polygon") {
				if(!drawStateRef.current) drawStateRef.current = { points: [] };
				drawStateRef.current.points.push(lngLat);
			}
		};

		const drawDblClickHandler = (e: mapboxgl.MapMouseEvent) => {
			if(mode === "draw_polygon" && drawStateRef.current && drawStateRef.current.points.length >= 3) {
				e.preventDefault();
				const positions: [number, number][] = drawStateRef.current.points.map(([lng, lat]) => [lat, lng]);
				const newRegion: GeofenceRegion = { operation: "union", type: "polygon", positions };
				onValueChange?.([...value, newRegion]);
				setSelectedIndex(value.length);
				setMode("pan");
				drawStateRef.current = null;
				const src = map.getSource(ghostSourceId) as mapboxgl.GeoJSONSource | undefined;
				if(src) src.setData({ type: "FeatureCollection", features: [] } as any);
			}
		};

		const drawMoveHandler = (e: mapboxgl.MapMouseEvent) => {
			const src = map.getSource(ghostSourceId) as mapboxgl.GeoJSONSource | undefined;
			if(!src) return;
			if(mode === "draw_rectangle" && drawStateRef.current?.startLngLat) {
				const start = drawStateRef.current.startLngLat;
				const ghost = turf.polygon([[[start[0], start[1]], [e.lngLat.lng, start[1]], [e.lngLat.lng, e.lngLat.lat], [start[0], e.lngLat.lat], [start[0], start[1]]]]);
				src.setData(ghost as any);
			} else if(mode === "draw_polygon" && drawStateRef.current && drawStateRef.current.points.length >= 2) {
				const pts = [...drawStateRef.current.points, [e.lngLat.lng, e.lngLat.lat] as [number, number]];
				const closed = [...pts, pts[0]];
				const ghost = turf.polygon([closed]);
				src.setData(ghost as any);
			}
		};

		map.on("click", drawClickHandler);
		map.on("dblclick", drawDblClickHandler);
		map.on("mousemove", drawMoveHandler);
		return () => {
			map.off("click", drawClickHandler);
			map.off("dblclick", drawDblClickHandler);
			map.off("mousemove", drawMoveHandler);
			map.getCanvas().style.cursor = "";
			drawStateRef.current = null;
		};
	}, [mode, value, disabled, onValueChange]);

	const deleteSelected = useCallback(() => {
		if(selectedIndex == null) return;
		const updated = value.toSpliced(selectedIndex, 1);
		onValueChange?.(updated);
		setSelectedIndex(null);
	}, [selectedIndex, value, onValueChange]);

	return (
		<div className="flex flex-col md:flex-row h-full">
			<div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r overflow-auto p-4">
				<div className="flex items-center justify-between mb-4">
					<h3 className="font-semibold">Geofence Regions</h3>
					<Button type="button" size="sm" onClick={() => { onValueChange?.([...value, { operation: "union", type: "circle", latitude: -6.2088, longitude: 106.8456, radius: 1000 }]); setSelectedIndex(value.length); }} disabled={disabled}>
						Add Region
					</Button>
				</div>
				{value.length == 0 ? (
					<p className="text-sm text-muted-foreground">No geofence regions defined.</p>
				) : (
					<div className="space-y-3">
						{value.map((region, index) => (
							<div key={index} className={cn("border rounded-lg p-3 space-y-3 cursor-pointer transition-colors", selectedIndex === index && "ring-2 ring-blue-500 border-blue-500")} onClick={() => setSelectedIndex(index)}>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<span className="size-3 rounded-full shrink-0" style={{ backgroundColor: seededRegionColor(index) }} />
										<span className="text-sm font-medium">Region {index + 1}</span>
									</div>
									<Button type="button" variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onValueChange?.(value.toSpliced(index, 1)); if(selectedIndex === index) setSelectedIndex(null); }} disabled={disabled}>
										Remove
									</Button>
								</div>
								<div className="space-y-2">
									<div className="grid grid-cols-2 gap-2">
										<div className="space-y-1">
											<Label className="text-xs">Operation</Label>
											<Select
												value={region.operation}
												onValueChange={op => {
													const updated = [...value];
													updated[index] = { ...region, operation: op as GeofenceRegion["operation"] };
													onValueChange?.(updated);
												}}
												disabled={disabled}
											>
												<SelectTrigger className="w-full text-xs h-7">
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
												onValueChange={newType => {
													const updated = [...value];
													if(newType == "circle")
														updated[index] = { operation: region.operation, type: "circle", latitude: -6.2088, longitude: 106.8456, radius: 1000 };
													else if(newType == "rectangle")
														updated[index] = { operation: region.operation, type: "rectangle", latitudeA: -6.2, longitudeA: 106.84, latitudeB: -6.22, longitudeB: 106.86 };
													else if(newType == "polygon")
														updated[index] = { operation: region.operation, type: "polygon", positions: [[-6.2, 106.84], [-6.21, 106.85], [-6.2, 106.86]] };
													onValueChange?.(updated);
												}}
												disabled={disabled}
											>
												<SelectTrigger className="w-full text-xs h-7">
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
													onChange={e => {
														const updated = [...value];
														updated[index] = { ...region, latitude: parseNum(e.target.value) };
														onValueChange?.(updated);
													}}
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
													onChange={e => {
														const updated = [...value];
														updated[index] = { ...region, longitude: parseNum(e.target.value) };
														onValueChange?.(updated);
													}}
													className="h-7 text-xs"
												/>
											</div>
											<div className="space-y-1 col-span-2">
												<Label className="text-xs">Radius (m)</Label>
												<Input
													type="number"
													step="any"
													min="0"
													disabled={disabled}
													value={region.radius}
													onChange={e => {
														const updated = [...value];
														updated[index] = { ...region, radius: parseNum(e.target.value) };
														onValueChange?.(updated);
													}}
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
													onChange={e => {
														const updated = [...value];
														updated[index] = { ...region, latitudeA: parseNum(e.target.value) };
														onValueChange?.(updated);
													}}
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
													onChange={e => {
														const updated = [...value];
														updated[index] = { ...region, longitudeA: parseNum(e.target.value) };
														onValueChange?.(updated);
													}}
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
													onChange={e => {
														const updated = [...value];
														updated[index] = { ...region, latitudeB: parseNum(e.target.value) };
														onValueChange?.(updated);
													}}
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
													onChange={e => {
														const updated = [...value];
														updated[index] = { ...region, longitudeB: parseNum(e.target.value) };
														onValueChange?.(updated);
													}}
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
														const updated = [...value];
														updated[index] = { ...region, positions: [...region.positions, [-6.2, 106.84]] };
														onValueChange?.(updated);
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
																const updated = [...value];
																const newPositions = [...region.positions];
																newPositions[posIndex] = [parseNum(e.target.value), pos[1]];
																updated[index] = { ...region, positions: newPositions };
																onValueChange?.(updated);
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
																const updated = [...value];
																const newPositions = [...region.positions];
																newPositions[posIndex] = [pos[0], parseNum(e.target.value)];
																updated[index] = { ...region, positions: newPositions };
																onValueChange?.(updated);
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
															const updated = [...value];
															updated[index] = { ...region, positions: region.positions.toSpliced(posIndex, 1) };
															onValueChange?.(updated);
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
						))}
					</div>
				)}
			</div>
			<div className="flex-1 relative flex flex-col">
				{!disabled && (
					<div className="absolute top-3 left-3 z-10 flex gap-1 bg-white/90 backdrop-blur rounded-lg p-1 shadow-md">
						<Button type="button" size="sm" variant={mode === "pan" ? "default" : "ghost"} className="h-8 w-8 p-0" onClick={() => setMode("pan")} title="Pan / Select">
							<MousePointer2Icon className="size-4" />
						</Button>
						<Button type="button" size="sm" variant={mode === "draw_polygon" ? "default" : "ghost"} className="h-8 w-8 p-0" onClick={() => { setMode("draw_polygon"); setSelectedIndex(null); }} title="Draw Polygon">
							<PentagonIcon className="size-4" />
						</Button>
						<Button type="button" size="sm" variant={mode === "draw_circle" ? "default" : "ghost"} className="h-8 w-8 p-0" onClick={() => { setMode("draw_circle"); setSelectedIndex(null); }} title="Draw Circle">
							<CircleIcon className="size-4" />
						</Button>
						<Button type="button" size="sm" variant={mode === "draw_rectangle" ? "default" : "ghost"} className="h-8 w-8 p-0" onClick={() => { setMode("draw_rectangle"); setSelectedIndex(null); }} title="Draw Rectangle">
							<SquareIcon className="size-4" />
						</Button>
						<div className="w-px bg-border mx-1" />
						<Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={deleteSelected} disabled={selectedIndex == null} title="Delete Selected">
							<Trash2Icon className="size-4" />
						</Button>
					</div>
				)}
				<div ref={mapContainerRef} className="absolute inset-0" />
			</div>
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
