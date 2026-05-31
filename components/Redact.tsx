"use client";

import React, { useRef, useState, useEffect, useCallback, useLayoutEffect } from "react";
import dedent from "dedent-js";

import cn from "@/utils/cn";
import useSplitRef from "@/utils/useSplitRef";

const VERTEX_GLSL = dedent`
	#version 300 es
	precision highp float;

	layout(location = 0) in vec2 inPosition;
	layout(location = 1) in vec2 inVelocity;
	layout(location = 2) in float inTime;
	layout(location = 3) in float inDuration;
	layout(location = 4) in float inAlpha;

	out vec2 outPosition;
	out vec2 outVelocity;
	out float outTime;
	out float outDuration;
	out float outAlpha;
	out float alpha;

	uniform float reset;
	uniform float time;
	uniform float deltaTime;
	uniform vec2 size;
	uniform float radius;
	uniform float seed;
	uniform float noiseScale;
	uniform float noiseSpeed;
	uniform float noiseMovement;
	uniform float dampingMult;
	uniform float forceMult;
	uniform float velocityMult;
	uniform float longevity;
	uniform float maxVelocity;
	uniform vec3 color;

	#define MAX_REGIONS 128
	uniform int regionCount;
	uniform vec4 regionsRect[MAX_REGIONS];
	uniform vec4 regionsBack[MAX_REGIONS];
	uniform vec4 regionsClip[MAX_REGIONS];
	uniform int regionParticleOffsets[MAX_REGIONS];

	float rand(vec2 n) {
		return fract(sin(dot(n, vec2(12.9898, 4.1414 - seed * 0.42))) * 43758.5453);
	}
	vec4 mod289v(vec4 x) {
		return x - floor(x * (1.0 / (289.0 + seed))) * (289.0 + seed);
	}
	vec4 perm(vec4 x) {
		return mod289v(((x * 34.0) + 1.0) * x);
	}
	vec4 loopV(vec4 p) {
		p.xy = fract(p.xy / noiseScale) * noiseScale;
		p.zw = fract(p.zw / noiseScale) * noiseScale;
		return p;
	}
	vec3 loopV3(vec3 p) {
		p.xy = fract(p.xy / noiseScale) * noiseScale;
		return p;
	}
	float noise(vec3 p) {
		vec3 a = floor(p);
		vec3 d = p - a;
		d = d * d * (3.0 - 2.0 * d);
		vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
		vec4 k1 = perm(loopV(b.xyxy));
		vec4 k2 = perm(loopV(k1.xyxy + b.zzww));
		vec4 c = k2 + a.zzzz;
		vec4 k3 = perm(c);
		vec4 k4 = perm(c + 1.0);
		vec4 o3 = fract(k4 / 41.0) * d.z + fract(k3 / 41.0) * (1.0 - d.z);
		vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);
		return o4.y * d.y + o4.x * (1.0 - d.y);
	}
	vec3 grad(vec3 p) {
		const vec2 e = vec2(0.1, 0.0);
		return vec3(
			noise(loopV3(p + e.xyy)) - noise(loopV3(p - e.xyy)),
			noise(loopV3(p + e.yxy)) - noise(loopV3(p - e.yxy)),
			noise(loopV3(p + e.yyx)) - noise(loopV3(p - e.yyx))
		) / (2.0 * e.x);
	}
	vec3 curlNoise(vec3 p) {
		p.xy /= size;
		p.x *= (size.x / size.y);
		p.xy = fract(p.xy);
		p.xy *= noiseScale;
		const vec2 e = vec2(0.01, 0.0);
		return grad(loopV3(p)).yzx - vec3(
			grad(loopV3(p + e.yxy)).z,
			grad(loopV3(p + e.yyx)).x,
			grad(loopV3(p + e.xyy)).y
		);
	}
	int getRegionIndex() {
		int vid = gl_VertexID;
		for(int i = 0; i < MAX_REGIONS; i++) {
			if(i >= regionCount)
				break;
			if(vid < regionParticleOffsets[i])
				return i;
		}
		return regionCount - 1;
	}
	int getParticleIndex(int regionIndex) {
		return gl_VertexID - (regionIndex == 0 ? 0 : regionParticleOffsets[regionIndex - 1]);
	}
	vec2 genPos(int regionIndex, int particleIndex) {
		vec4 region = regionsRect[regionIndex];
		float t = fract(time / 50.0) * 50.0;
		float fid = float(particleIndex);
		float a = cos(fid - seed) * 42.0;
		float b = t * t + sin(fid + seed) * (-3.0);
		return vec2(
			region.x + rand(vec2(a, b + 1.3)) * region.z,
			region.y + rand(vec2(b, a - 2.7)) * region.w
		);
	}
	void main() {
		int regionIndex = getRegionIndex();
		int particleIndex = getParticleIndex(regionIndex);
		vec4 regionRect = regionsRect[regionIndex];
		vec4 regionBack = regionsBack[regionIndex];
		vec4 regionClip = regionsClip[regionIndex];
		vec2 particlePosition = inPosition;
		vec2 particleVelocity = inVelocity;
		float particleDuration = inDuration;
		float particleTime  = inTime + deltaTime * particleDuration / longevity;
		float particleAlpha = inAlpha;
		particlePosition = regionRect.xy + (particlePosition - regionBack.xy) * regionRect.zw / regionBack.zw;
		if(reset > 0.0) {
			particlePosition = genPos(regionIndex, particleIndex);
			particleVelocity = vec2(0.0);
			particleDuration = 0.5 + 2.0 * rand(vec2(float(particleIndex)) + seed * 32.4);
			particleTime = rand(vec2(float(-94.3 + float(regionIndex)), 83.9) * vec2(float(particleIndex), float(particleIndex)));
			particleAlpha = 1.0;
		}
		if(particleTime >= 1.0) {
			particlePosition = genPos(regionIndex, particleIndex);
			particleVelocity = vec2(0.0);
			particleDuration = 0.5 + 2.0 * rand(vec2(float(particleIndex)) + particlePosition);
			particleTime = 0.0;
			particleAlpha = 1.0;
		}
		float msz = min(regionRect.z, regionRect.w);
		vec2 force = normalize(curlNoise(vec3(
			particlePosition + time * (noiseMovement / 100.0 * msz),
			time * noiseSpeed + rand(particlePosition) * 2.5
		)).xy);
		particleVelocity += force * forceMult * deltaTime * msz * 0.1;
		particleVelocity *= dampingMult;
		float particleVelocityLength = length(particleVelocity);
		float maxVelocityPx = maxVelocity / 100.0 * msz;
		if(particleVelocityLength > maxVelocityPx)
			particleVelocity = particleVelocity / particleVelocityLength * maxVelocityPx;
		particlePosition += particleVelocity * velocityMult * deltaTime;
		if(particlePosition.x < regionRect.x || particlePosition.x > regionRect.x + regionRect.z || particlePosition.y < regionRect.y || particlePosition.y > regionRect.y + regionRect.w) {
			particlePosition = genPos(regionIndex, particleIndex);
			particleVelocity = vec2(0.0);
			particleDuration = 0.5 + 2.0 * rand(vec2(float(particleIndex)) + particlePosition);
			particleTime = 0.0;
		}
		float clipAlpha = 1.0;
		if(particlePosition.x < regionClip.x || particlePosition.x > regionClip.x + regionClip.z || particlePosition.y < regionClip.y || particlePosition.y > regionClip.y + regionClip.w)
			clipAlpha = 0.0;
		outPosition = particlePosition;
		outVelocity = particleVelocity;
		outDuration = particleDuration;
		outTime = particleTime;
		outAlpha = particleAlpha;
		gl_PointSize = radius;
		gl_Position = vec4((particlePosition / size * 2.0 - vec2(1.0)), 0.0, 1.0);
		alpha = sin(particleTime * 3.14159) * particleAlpha * clipAlpha * (0.6 + 0.4 * rand(vec2(float(particleIndex))));
	}
`;
const FRAGMENT_GLSL = dedent`
	#version 300 es
	precision highp float;
	in float alpha;
	out vec4 fragColor;
	uniform vec3 color;
	void main() {
		vec2 c = 2.0 * gl_PointCoord - 1.0;
		if(dot(c, c) > 1.0) discard;
		fragColor = vec4(color, alpha);
	}
`;

type RedactConfig = {
	radius: number;
	seed: number;
	noiseScale: number;
	noiseSpeed: number;
	forceMult: number;
	velocityMult: number;
	dampingMult: number;
	maxVelocity: number;
	longevity: number;
	noiseMovement: number;
	timeScale: number;
	skipFrames: number;
	color: [number, number, number];
};
type RedactRegion = {
	element: HTMLElement;
	particles: number;
};
export function RedactCanvas(
	{ config, regions, className, ref, ...props }:
	{ config: Partial<RedactConfig>, regions: RedactRegion[] } & React.ComponentProps<"canvas">
) {
	const canvasRef = useSplitRef(null, ref);
	const [error, setError] = useState<unknown>(null);
	const defaultedConfig: RedactConfig = {
		radius: config.radius ?? 2,
		seed: config.seed ?? 0.73,
		noiseScale: config.noiseScale ?? 22,
		noiseSpeed: config.noiseSpeed ?? 0.6,
		forceMult: config.forceMult ?? 0.6,
		velocityMult: config.velocityMult ?? 1.0,
		dampingMult: config.dampingMult ?? 1.0,
		maxVelocity: config.maxVelocity ?? 6.0,
		longevity: config.longevity ?? 1.4,
		noiseMovement: config.noiseMovement ?? 4,
		timeScale: config.timeScale ?? 1,
		skipFrames: config.skipFrames ?? 10,
		color: config.color ?? [0, 0, 0]
	};
	const configRef = useRef(defaultedConfig);
	const regionsRef = useRef<Readonly<RedactRegion[]>>([]);
	const syncLayoutRef = useRef<(() => void) | null>(null);

	useEffect(() => {
		try {
			const canvas = canvasRef.current;
			if(canvas == null) return;
			const gl = canvas.getContext("webgl2");
			if(gl == null)
				throw new Error("Cannot get webgl2 context");
			const vertexShader = gl.createShader(gl.VERTEX_SHADER);
			if(vertexShader == null)
				throw new Error("Cannot create vertex shader");
			gl.shaderSource(vertexShader, VERTEX_GLSL);
			gl.compileShader(vertexShader);
			if(gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS) != true)
				throw new Error("Vertex shader error:\n" + gl.getShaderInfoLog(vertexShader));
			const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
			if(fragmentShader == null)
				throw new Error("Cannot create fragment shader");
			gl.shaderSource(fragmentShader, FRAGMENT_GLSL);
			gl.compileShader(fragmentShader);
			if(gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS) != true)
				throw new Error("Fragment shader error:\n" + gl.getShaderInfoLog(fragmentShader));
			const program = gl.createProgram();
			gl.attachShader(program, vertexShader);
			gl.attachShader(program, fragmentShader);
			gl.transformFeedbackVaryings(program, ["outPosition", "outVelocity", "outTime", "outDuration", "outAlpha"], gl.INTERLEAVED_ATTRIBS);
			gl.linkProgram(program);
			if(gl.getProgramParameter(program, gl.LINK_STATUS) != true)
				throw new Error("Link error:\n" + gl.getProgramInfoLog(program));
			const MAX_REGIONS = 128;
			const uniformNames = [
				...[
					"reset", "time", "deltaTime", "size", "radius", "seed", "noiseScale", "noiseSpeed", "noiseMovement",
					"dampingMult", "forceMult", "velocityMult", "longevity", "maxVelocity", "color", "regionCount"
				] as const,
				...Array.from({ length: MAX_REGIONS }, (_, i) => `regionsRect[${i}]` as const),
				...Array.from({ length: MAX_REGIONS }, (_, i) => `regionsBack[${i}]` as const),
				...Array.from({ length: MAX_REGIONS }, (_, i) => `regionsClip[${i}]` as const),
				...Array.from({ length: MAX_REGIONS }, (_, i) => `regionParticleOffsets[${i}]` as const)
			];
			const uniformLocations = Object.fromEntries(uniformNames.map(n => [n, gl.getUniformLocation(program, n)])) as Record<(typeof uniformNames)[number], WebGLUniformLocation | null>;
			const STRIDE = 7 * 4;
			let left = 0;
			let top = 0;
			let width = 0;
			let height = 0;
			let scale = 0;
			let regions = [] as RedactRegion[];
			let totalParticles = 0;
			let regionParticleOffsets = [] as number[];
			let bufferA = null as WebGLBuffer | null;
			let bufferB = null as WebGLBuffer | null;
			let alternateBuffer = false;
			let reset = true;
			let skippedFrames = 0;
			const syncLayout = syncLayoutRef.current = () => {
				const visualViewport = window.visualViewport!;
				left = visualViewport.offsetLeft;
				top = visualViewport.offsetTop;
				width = window.innerWidth * window.devicePixelRatio;
				height = window.innerHeight * window.devicePixelRatio;
				scale = visualViewport.scale * window.devicePixelRatio;
				canvas.style.left = `${visualViewport.offsetLeft}px`;
				canvas.style.top = `${visualViewport.offsetTop}px`;
				canvas.style.scale = `${1 / scale}`;
				if(canvas.width != width)
					canvas.width = width;
				if(canvas.height != height)
					canvas.height = height;
				gl.viewport(0, 0, width, height);
				regions = [...regionsRef.current];
				const newTotalParticles = regions.slice(0, 128).reduce((p, c) => p + c.particles, 0);
				regionParticleOffsets = regions.slice(0, 128).reduce((p, c) => [...p, (p.at(-1) ?? 0) + c.particles], []);
				if(newTotalParticles != totalParticles) {
					totalParticles = newTotalParticles;
					if(bufferA != null)
						gl.deleteBuffer(bufferA);
					if(bufferB != null)
						gl.deleteBuffer(bufferB);
					bufferA = gl.createBuffer();
					bufferB = gl.createBuffer();
					if(bufferA == null || bufferB == null)
						throw new Error("Cannot create buffers");
					gl.bindBuffer(gl.ARRAY_BUFFER, bufferA);
					gl.bufferData(gl.ARRAY_BUFFER, newTotalParticles * STRIDE, gl.DYNAMIC_DRAW);
					gl.bindBuffer(gl.ARRAY_BUFFER, bufferB);
					gl.bufferData(gl.ARRAY_BUFFER, newTotalParticles * STRIDE, gl.DYNAMIC_DRAW);
					gl.bindBuffer(gl.ARRAY_BUFFER, null);
					alternateBuffer = false;
					reset = true;
				}
				skippedFrames = Infinity;
			};
			const resizeObserver = new ResizeObserver(syncLayout);
			resizeObserver.observe(canvas);
			const visualViewport = window.visualViewport!;
			visualViewport.addEventListener("resize", syncLayout);
			visualViewport.addEventListener("scroll", syncLayout);
			window.addEventListener("resize", syncLayout);
			window.addEventListener("scroll", syncLayout);
			syncLayout();

			let running = true;
			let time = 0;
			let lastTime = performance.now();
			let animationFrameHandle = null as number | null;
			const frame = () => {
				try {
					if(!running) return;
					animationFrameHandle = requestAnimationFrame(frame);
					const config = configRef.current;
					const regionRects = regions.map(region => {
						const regionElement = region.element as HTMLElement & { __lastRect?: { x: number, y: number, w: number, h: number, changed: boolean } };
						const clientRects = [...regionElement.getClientRects()];
						const top = Math.min(...clientRects.map(r => r.top));
						const right = Math.min(...clientRects.map(r => r.right));
						const bottom = Math.max(...clientRects.map(r => r.bottom));
						const left = Math.max(...clientRects.map(r => r.left));
						const changed = regionElement.__lastRect == null ||
							regionElement.__lastRect.x != left || regionElement.__lastRect.y != top ||
							regionElement.__lastRect.w != right - left || regionElement.__lastRect.h != bottom - top;
						return regionElement.__lastRect = { x: left, y: top, w: right - left, h: bottom - top, changed };
					});
					if(skippedFrames < config.skipFrames && regionRects.every(r => !r.changed)) {
						skippedFrames++;
						return;
					}
					skippedFrames = 0;
					const now = performance.now();
					const dt = Math.min((now - lastTime) / 1000, 0.05) * config.timeScale;
					time += dt;
					lastTime = now;
					if(width <= 0 || height <= 0 || totalParticles <= 0) return;
					const readBuf = alternateBuffer ? bufferA : bufferB;
					const writeBuf = alternateBuffer ? bufferB : bufferA;
					if(readBuf == null || writeBuf == null) return;
					gl.viewport(0, 0, width, height);
					gl.clear(gl.COLOR_BUFFER_BIT);
					gl.useProgram(program);
					gl.uniform1f(uniformLocations.reset, reset ? 1 : 0);
					gl.uniform1f(uniformLocations.time, time);
					gl.uniform1f(uniformLocations.deltaTime, dt);
					gl.uniform2f(uniformLocations.size, width, height);
					gl.uniform1f(uniformLocations.radius, config.radius * scale);
					gl.uniform1f(uniformLocations.seed, config.seed);
					gl.uniform1f(uniformLocations.noiseScale, config.noiseScale);
					gl.uniform1f(uniformLocations.noiseSpeed, config.noiseSpeed);
					gl.uniform1f(uniformLocations.noiseMovement, config.noiseMovement);
					gl.uniform1f(uniformLocations.dampingMult, config.dampingMult);
					gl.uniform1f(uniformLocations.forceMult, config.forceMult);
					gl.uniform1f(uniformLocations.velocityMult, config.velocityMult);
					gl.uniform1f(uniformLocations.longevity, config.longevity);
					gl.uniform1f(uniformLocations.maxVelocity, config.maxVelocity);
					gl.uniform3f(uniformLocations.color, config.color[0], config.color[1], config.color[2]);
					gl.uniform1i(uniformLocations.regionCount, regions.length);
					for(let i = 0; i < Math.min(regions.length, MAX_REGIONS); i++) {
						const regionElement = regions[i].element as HTMLElement & { __back?: { x: number, y: number, w: number, h: number }, __clip?: { x: number, y: number, w: number, h: number, r: number } };
						const regionRect = regionRects[i];
						const regionBack = regionElement.__back;
						const regionClip = regionElement.__clip ??= { x: 0, y: 0, w: 0, h: 0, r: 1 };
						const rectX = (regionRect.x - left) * scale;
						const rectY = height - (regionRect.y - top + regionRect.h) * scale;
						const rectW = regionRect.w * scale;
						const rectH = regionRect.h * scale;
						const clipX = (regionClip.x - left) * scale;
						const clipY = height - (regionClip.y - top + regionClip.h) * scale;
						const clipW = regionClip.w * scale;
						const clipH = regionClip.h * scale;
						gl.uniform4f(uniformLocations[`regionsRect[${i}]`], rectX, rectY, rectW, rectH);
						if(!reset && regionBack != null)
							gl.uniform4f(uniformLocations[`regionsBack[${i}]`], regionBack.x, regionBack.y, regionBack.w, regionBack.h);
						else
							gl.uniform4f(uniformLocations[`regionsBack[${i}]`], rectX, rectY, rectW, rectH);
						if(regionClip.r < 0.97)
							gl.uniform4f(uniformLocations[`regionsClip[${i}]`], clipX, clipY, clipW, clipH);
						else
							gl.uniform4f(uniformLocations[`regionsClip[${i}]`], rectX, rectY, rectW, rectH);
						gl.uniform1i(uniformLocations[`regionParticleOffsets[${i}]`], regionParticleOffsets[i]);
						if(regionBack != null) {
							regionBack.x = rectX;
							regionBack.y = rectY;
							regionBack.w = rectW;
							regionBack.h = rectH;
						} else
							regionElement.__back = { x: rectX, y: rectY, w: rectW, h: rectH };
					}
					gl.bindBuffer(gl.ARRAY_BUFFER, readBuf);
					gl.enableVertexAttribArray(0);
					gl.enableVertexAttribArray(1);
					gl.enableVertexAttribArray(2);
					gl.enableVertexAttribArray(3);
					gl.enableVertexAttribArray(4);
					gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 7 * 4, 0);
					gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 7 * 4, 8);
					gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 7 * 4, 16);
					gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 7 * 4, 20);
					gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 7 * 4, 24);
					gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, writeBuf);
					gl.beginTransformFeedback(gl.POINTS);
					gl.drawArrays(gl.POINTS, 0, totalParticles);
					gl.endTransformFeedback();
					gl.bindBuffer(gl.ARRAY_BUFFER, null);
					gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
					alternateBuffer = !alternateBuffer;
					reset = false;
				} catch(error) {
					running = false;
					setError(error);
				}
			};
			animationFrameHandle = requestAnimationFrame(frame);
			return () => {
				running = false;
				if(animationFrameHandle != null)
					cancelAnimationFrame(animationFrameHandle);
				resizeObserver.disconnect();
				visualViewport?.removeEventListener("resize", syncLayout);
				visualViewport?.removeEventListener("scroll", syncLayout);
				window.removeEventListener("resize", syncLayout);
				window.removeEventListener("scroll", syncLayout);
				syncLayoutRef.current = null;
				if(bufferA != null)
					gl.deleteBuffer(bufferA);
				if(bufferB != null)
					gl.deleteBuffer(bufferB);
				bufferA = null;
				bufferB = null;
				gl.deleteShader(vertexShader);
				gl.deleteShader(fragmentShader);
				gl.deleteProgram(program);
			};
		} catch(error) {
			setError(error);
		}
	}, []);
	useEffect(() => {
		configRef.current = defaultedConfig;
		regionsRef.current = regions;
		syncLayoutRef.current?.();
	}, [regions, config]);
	if(error != null) {
		return (
			<div style={{ color: "red", fontFamily: "monospace", padding: 12 }}>
				WebGL error: {error instanceof Error ? error.message : `${error}`}
			</div>
		);
	}
	return (
		<canvas
			ref={canvasRef}
			className={cn("fixed origin-top-left pointer-events-none select-none", className)}
			{...props}
		/>
	);
}

type RedactContext = {
	config: Readonly<Partial<RedactConfig>>;
	regions: Readonly<RedactRegion[]>;
	setConfig: (v: Partial<RedactConfig> | ((o: Partial<RedactConfig>) => Partial<RedactConfig>)) => void;
	addRegion: (region: RedactRegion) => () => void;
};
export function RedactProvider({ canvasClassName, children }: { canvasClassName?: string, children?: React.ReactNode }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [config, setConfig] = useState({} as Partial<RedactConfig>);
	const [regions, setRegions] = useState([] as RedactRegion[]);
	const addRegion = useCallback((region: RedactRegion) => {
		const currentRegion = { ...region };
		setRegions(rs => [...rs, currentRegion]);
		return () => setRegions(rs => rs.filter(r => r != currentRegion));
	}, []);
	useLayoutEffect(() => {
		const canvasParentElement = canvasRef.current?.parentElement as HTMLElement & { __redactContext?: RedactContext };
		if(canvasParentElement == null) return;
		canvasParentElement.__redactContext = { config, regions, setConfig, addRegion };
	});
	return (
		<>
			{children}
			<RedactCanvas ref={canvasRef} regions={regions} config={config} className={canvasClassName} />
		</>
	);
}
export function RedactRegion({ ref, particles, className, ...props }: { particles?: number } & React.ComponentProps<"span">) {
	const elementRef = useSplitRef(null, ref);
	useEffect(() => {
		const element = elementRef.current!;
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
		let contextParentElement = element.parentElement as (HTMLElement & { __redactContext?: RedactContext }) | null;
		while(contextParentElement != null && contextParentElement.__redactContext == null)
			contextParentElement = contextParentElement.parentElement;
		if(contextParentElement == null) return;
		const { addRegion } = contextParentElement.__redactContext!;
		const removeRegion = addRegion({ element: element, particles: particles ?? 500 });
		const intersectionObserver = new IntersectionObserver(([entry]) => {
			const clip = (element as (typeof element) & { __clip?: { x: number, y: number, w: number, h: number, r: number } }).__clip ??= { x: 0, y: 0, w: 0, h: 0, r: 1 };
			clip.x = entry.intersectionRect.x;
			clip.y = entry.intersectionRect.y;
			clip.w = entry.intersectionRect.width;
			clip.h = entry.intersectionRect.height;
			clip.r = entry.intersectionRatio;
		}, { threshold: Array.from({ length: 200 }).map((_, i) => i / 200) });
		intersectionObserver.observe(element);
		return () => {
			intersectionObserver.disconnect();
			removeRegion();
		};
	}, [particles]);
	return (<span ref={elementRef} className={cn("block", className)} {...props} />);
}
