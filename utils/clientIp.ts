import { isIPv4, isIPv6 } from "node:net";

type HeaderBag = { get(name: string): string | null };

function parseIpToken(raw: string): string | null {
	const trimmed = raw.trim().replace(/^["']|["']$/g, "");
	let host = trimmed;

	if(trimmed.startsWith("[")) {
		const closing = trimmed.indexOf("]");
		if(closing <= 1)
			return null;
		host = trimmed.slice(1, closing);
		const afterBracket = trimmed.slice(closing + 1);
		if(afterBracket != "") {
			if(!(afterBracket.startsWith(":") && /^\d+$/.test(afterBracket.slice(1))))
				return null;
		}
	}

	let zoneCut = host.indexOf("%");
	if(zoneCut >= 0)
		host = host.slice(0, zoneCut);
	host = host.replace(/^::ffff:/i, "");

	const dottedWithPortMatch = /^((?:\d{1,3}\.){3}\d{1,3})(?::(\d+))?$/.exec(host);
	if(dottedWithPortMatch != null) {
		const addr = dottedWithPortMatch[1];
		if(addr != null && isIPv4(addr))
			host = addr;
	}

	host = host.trim();
	if(host.length == 0)
		return null;
	return host;
}

export function normalizeAndValidateIpCandidate(raw: string): string | null {
	const host = parseIpToken(raw);
	if(host == null)
		return null;
	if(isIPv4(host))
		return host;
	if(isIPv6(host))
		return host.toLowerCase();
	return null;
}

export function getClientIpFromHeaders(headers: HeaderBag): string {
	const realIp = headers.get("x-real-ip")?.trim();
	if(realIp != null && realIp.length > 0) {
		const normalized = normalizeAndValidateIpCandidate(realIp);
		if(normalized != null)
			return normalized;
	}
	const forwarded = headers.get("x-forwarded-for");
	if(forwarded != null && forwarded.trim().length > 0) {
		const first = forwarded.split(",")[0]?.trim();
		const normalized = normalizeAndValidateIpCandidate(first ?? "");
		if(normalized != null)
			return normalized;
	}
	return "unknown";
}
