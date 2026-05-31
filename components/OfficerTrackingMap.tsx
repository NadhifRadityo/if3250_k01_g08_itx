"use client";

import React, { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { PlayIcon, PauseIcon, RadioIcon, LocateIcon, LocateFixedIcon } from "lucide-react";
import mapboxgl from "mapbox-gl";

import cn from "@/utils/cn";
import { MapSearchControls, seededRegionColor, useMapGpsTracking, LightPresetControls, MAPBOX_ACCESS_TOKEN, MapNavigationControls, animationDurationToBounds } from "@/components/GeofenceRegionsEditorDialog";
import { Button } from "@/components/radix/Button";
import { Slider } from "@/components/radix/Slider";

import "mapbox-gl/dist/mapbox-gl.css";

export type OfficerTrackingPoint = {
	time: string;
	latitude: number;
	longitude: number;
	accuracy: number;
};
export type OfficerTrackingUser = {
	id: string;
	name: string;
	points: OfficerTrackingPoint[];
};

function interpolateUserPosition(points: OfficerTrackingPoint[], time: number): { latitude: number, longitude: number, accuracy: number } | null {
	if(points.length == 0)
		return null;
	const firstTime = new Date(points[0].time).getTime();
	const lastTime = new Date(points[points.length - 1].time).getTime();
	if(time <= firstTime)
		return { latitude: points[0].latitude, longitude: points[0].longitude, accuracy: points[0].accuracy };
	if(time >= lastTime)
		return { latitude: points[points.length - 1].latitude, longitude: points[points.length - 1].longitude, accuracy: points[points.length - 1].accuracy };
	let lo = 0;
	let hi = points.length - 1;
	while(lo + 1 < hi) {
		const mid = (lo + hi) >> 1;
		const midTime = new Date(points[mid].time).getTime();
		if(midTime <= time)
			lo = mid;
		else
			hi = mid;
	}
	const a = points[lo];
	const b = points[hi];
	const aTime = new Date(a.time).getTime();
	const bTime = new Date(b.time).getTime();
	const span = bTime - aTime;
	const t = span > 0 ? (time - aTime) / span : 0;
	return {
		latitude: a.latitude + (b.latitude - a.latitude) * t,
		longitude: a.longitude + (b.longitude - a.longitude) * t,
		accuracy: a.accuracy + (b.accuracy - a.accuracy) * t
	};
}

function formatSliderTime(time: number): string {
	return new Date(time).toLocaleString();
}

export function OfficerTrackingMap(
	{ className, users, periodStart, periodEnd, isLoading = false }:
	{ className?: string, users: OfficerTrackingUser[], periodStart: string, periodEnd: string | null, isLoading?: boolean }
) {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<mapboxgl.Map | null>(null);
	const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
	const renderedUserIdsRef = useRef<Set<string>>(new Set());
	const initialFitDoneRef = useRef(false);
	const [styleReadyTick, setStyleReadyTick] = useState(0);
	const styleReadyRef = useRef(false);
	const [gpsTracking, setGpsTracking] = useState(false);
	const [mounted, setMounted] = useState(false);
	useEffect(() => { setMounted(true); }, []);

	const periodStartMs = useMemo(() => new Date(periodStart).getTime(), [periodStart]);
	const periodEndMs = useMemo(() => periodEnd != null ? new Date(periodEnd).getTime() : null, [periodEnd]);
	const [nowMs, setNowMs] = useState<number | null>(null);
	useEffect(() => {
		setNowMs(Date.now());
		if(periodEndMs != null) return;
		const handle = setInterval(() => setNowMs(Date.now()), 1000);
		return () => { clearInterval(handle); };
	}, [periodEndMs]);
	const effectiveEndMs = periodEndMs ?? (nowMs != null ? Math.max(nowMs, periodStartMs + 1) : periodStartMs + 1);

	const [sliderTimeMs, setSliderTimeMs] = useState<number | null>(null);
	const [playing, setPlaying] = useState(false);
	const isLive = sliderTimeMs == null;
	const currentTimeMs = sliderTimeMs ?? effectiveEndMs;
	useEffect(() => {
		if(!playing) return;
		if(sliderTimeMs == null) return;
		const handle = setInterval(() => {
			setSliderTimeMs(previous => {
				if(previous == null) return null;
				const next = previous + 1000;
				if(next >= effectiveEndMs) {
					setPlaying(false);
					return null;
				}
				return next;
			});
		}, 50);
		return () => { clearInterval(handle); };
	}, [playing, sliderTimeMs, effectiveEndMs]);

	useMapGpsTracking({
		enabled: gpsTracking,
		mapRef,
		onError: useCallback(() => setGpsTracking(false), [])
	});

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
			styleReadyRef.current = true;
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
			markersRef.current.forEach(marker => marker.remove());
			markersRef.current.clear();
			renderedUserIdsRef.current.clear();
			styleReadyRef.current = false;
			initialFitDoneRef.current = false;
			map.remove();
			mapRef.current = null;
		};
	}, []);

	useEffect(() => {
		const map = mapRef.current;
		if(map == null) return;
		let cancelled = false;
		const run = () => {
			if(cancelled || mapRef.current != map) return;
			if(!styleReadyRef.current) { map.once("load", run); return; }

			const currentIds = new Set<string>();
			for(const user of users) {
				currentIds.add(user.id);
				const sourceId = `officer-tracking-path-${user.id}`;
				const lineId = `officer-tracking-line-${user.id}`;
				const data: GeoJSON.Feature = {
					type: "Feature",
					properties: {},
					geometry: {
						type: "LineString",
						coordinates: user.points.map(point => [point.longitude, point.latitude])
					}
				};
				const source = map.getSource(sourceId);
				if(source != null && source.type == "geojson")
					source.setData(data);
				else {
					map.addSource(sourceId, { type: "geojson", data: data });
					map.addLayer({
						id: lineId, type: "line", source: sourceId,
						layout: { "line-cap": "round", "line-join": "round" },
						paint: { "line-color": seededRegionColor(user.id), "line-width": 4, "line-opacity": 0.4 }
					});
				}
			}
			for(const id of renderedUserIdsRef.current) {
				if(currentIds.has(id)) continue;
				const lineId = `officer-tracking-line-${id}`;
				const sourceId = `officer-tracking-path-${id}`;
				if(map.getLayer(lineId) != null) map.removeLayer(lineId);
				if(map.getSource(sourceId) != null) map.removeSource(sourceId);
				const marker = markersRef.current.get(id);
				if(marker != null) {
					marker.remove();
					markersRef.current.delete(id);
				}
			}
			renderedUserIdsRef.current = currentIds;

			if(!initialFitDoneRef.current && users.length > 0) {
				const allPoints: [number, number][] = [];
				for(const user of users) {
					for(const point of user.points)
						allPoints.push([point.longitude, point.latitude]);
				}
				if(allPoints.length > 0) {
					initialFitDoneRef.current = true;
					let minLng = allPoints[0][0], maxLng = allPoints[0][0], minLat = allPoints[0][1], maxLat = allPoints[0][1];
					for(const [lng, lat] of allPoints) {
						if(lng < minLng) minLng = lng;
						if(lng > maxLng) maxLng = lng;
						if(lat < minLat) minLat = lat;
						if(lat > maxLat) maxLat = lat;
					}
					const bbox: [number, number, number, number] = [minLng, minLat, maxLng, maxLat];
					map.fitBounds(bbox, {
						padding: { top: 80, right: 80, bottom: 160, left: 80 },
						bearing: map.getBearing(),
						pitch: map.getPitch(),
						duration: animationDurationToBounds(map, bbox),
						maxZoom: 16
					});
				}
			}
		};
		run();
		return () => { cancelled = true; };
	}, [users, styleReadyTick]);

	useEffect(() => {
		const map = mapRef.current;
		if(map == null) return;
		if(!styleReadyRef.current) return;
		for(const user of users) {
			const interpolated = interpolateUserPosition(user.points, currentTimeMs);
			const marker = markersRef.current.get(user.id);
			if(interpolated == null) {
				if(marker != null) {
					marker.remove();
					markersRef.current.delete(user.id);
				}
				continue;
			}
			if(marker != null) {
				marker.setLngLat([interpolated.longitude, interpolated.latitude]);
				continue;
			}
			const element = document.createElement("div");
			element.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;";
			element.innerHTML = `
				<div style="background-color:white;color:#0f172a;border:1px solid ${seededRegionColor(user.id)};border-radius:9999px;padding:2px 8px;font-size:11px;font-weight:500;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.2);">${user.name}</div>
				<div style="width:14px;height:14px;border-radius:50%;background-color:${seededRegionColor(user.id)};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>
			`;
			const newMarker = new mapboxgl.Marker({ element: element, anchor: "bottom" })
				.setLngLat([interpolated.longitude, interpolated.latitude])
				.addTo(map);
			markersRef.current.set(user.id, newMarker);
		}
	}, [users, currentTimeMs, styleReadyTick]);

	return (
		<div className={cn("relative h-full overflow-hidden rounded-xl border", className)}>
			<div ref={mapContainerRef} className="absolute top-0 left-0 w-full h-full min-h-150" />
			<div className="absolute z-10 flex gap-1 bg-white rounded-lg p-1 shadow-md top-3 left-3">
				<Button type="button" size="sm" variant={gpsTracking ? "default" : "ghost"} className="h-7 w-7 sm:h-8 sm:w-8 p-0" onClick={() => setGpsTracking(t => !t)} title={gpsTracking ? "Stop tracking" : "Track my location"}>
					{gpsTracking ? <LocateFixedIcon className="size-3.5 sm:size-4" /> : <LocateIcon className="size-3.5 sm:size-4" />}
				</Button>
			</div>
			<LightPresetControls
				mapRef={mapRef}
				mapReadyTick={styleReadyTick}
				className="absolute top-3 right-3 z-10"
			/>
			<MapSearchControls
				mapRef={mapRef}
				mapReadyTick={styleReadyTick}
				className="absolute z-10 top-13 left-3 right-3 sm:top-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[min(70%,420px)]"
			/>
			<MapNavigationControls
				mapRef={mapRef}
				mapReadyTick={styleReadyTick}
				className="absolute bottom-30 right-3 z-10"
			/>
			<div className="absolute bottom-3 left-3 right-3 z-10 bg-white rounded-lg shadow-md p-3 flex flex-col gap-2">
				<div className="flex items-center justify-between gap-2 text-xs">
					<span className="font-medium text-foreground" suppressHydrationWarning>
						{mounted ? formatSliderTime(currentTimeMs) : ""}
					</span>
					<div className="flex items-center gap-1">
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="h-7 px-2 gap-1"
							onClick={() => {
								if(playing) {
									setPlaying(false);
									return;
								}
								if(sliderTimeMs == null) {
									setSliderTimeMs(periodStartMs);
									setPlaying(true);
									return;
								}
								setPlaying(true);
							}}
							disabled={users.length == 0 || isLoading || effectiveEndMs <= periodStartMs}
						>
							{playing ? <PauseIcon className="size-3" /> : <PlayIcon className="size-3" />}
							{playing ? "Pause" : "Play"}
						</Button>
						<Button
							type="button"
							size="sm"
							variant={isLive ? "default" : "outline"}
							className="h-7 px-2 gap-1"
							onClick={() => {
								setSliderTimeMs(null);
								setPlaying(false);
							}}
							disabled={periodEndMs != null}
						>
							<RadioIcon className="size-3" />
							Live
						</Button>
					</div>
				</div>
				<Slider
					min={periodStartMs}
					max={Math.max(effectiveEndMs, periodStartMs + 1)}
					step={1000}
					value={[currentTimeMs]}
					onValueChange={([value]) => {
						setSliderTimeMs(value);
						setPlaying(false);
					}}
					disabled={users.length == 0 || isLoading || effectiveEndMs <= periodStartMs}
				/>
				<div className="flex items-center justify-between text-[10px] text-muted-foreground">
					<span suppressHydrationWarning>{mounted ? formatSliderTime(periodStartMs) : ""}</span>
					<span suppressHydrationWarning>{periodEndMs != null ? (mounted ? formatSliderTime(periodEndMs) : "") : "Live"}</span>
				</div>
			</div>
		</div>
	);
}
