import React, { useMemo, useLayoutEffect } from "react";

export type RefCallbackAndObject<T> = React.RefCallback<T> & React.RefObject<T>;
type CompatibleRefCallback<T> = { bivarianceHack(instance: T | null): void | (() => void) }["bivarianceHack"];
type CompatibleRef<T> = CompatibleRefCallback<T> | React.RefObject<T | null> | null;
export default function useSplitRef<T>(initialValue: T | null, ...refs: (CompatibleRef<T> | undefined)[]): RefCallbackAndObject<T | null>;
export default function useSplitRef<T>(initialValue: T | undefined, ...refs: (CompatibleRef<T> | undefined)[]): RefCallbackAndObject<T | undefined>;
export default function useSplitRef<T>(initialValue: T, ...refs: (CompatibleRef<T> | undefined)[]): RefCallbackAndObject<T> {
	const refCallback = useMemo(() => {
		const result = (object: T) => {
			if(refCallback._current == object)
				return;
			refCallback._current = object;
			for(const ref of refCallback._refs) {
				if(typeof ref == "function") {
					const cleanup = ref(object);
					if(cleanup != null)
						result._refCleanups.set(ref, cleanup);
				} else if(ref != null)
					ref.current = object;
			}
			return () => {
				for(const ref of refCallback._refs) {
					if(typeof ref == "function") {
						const cleanup = refCallback._refCleanups.get(ref);
						if(cleanup != null)
							cleanup();
						else
							ref(null);
					} else if(ref != null)
						ref.current = null;
				}
				refCallback._refs.clear();
				refCallback._refCleanups.clear();
			};
		};
		Object.defineProperty(result, "current", {
			configurable: true,
			enumerable: true,
			get: () => result._current,
			set: object => result(object)
		});
		result._current = initialValue;
		result._refs = new Set<React.Ref<T> | undefined>();
		result._refCleanups = new Map<React.RefCallback<T>, () => any>();
		return result as (typeof result & { current: T });
	}, []);
	useLayoutEffect(() => {
		const _refs = new Set<React.Ref<T> | undefined>(refs);
		for(const ref of refCallback._refs.difference(_refs)) {
			if(typeof ref == "function") {
				const cleanup = refCallback._refCleanups.get(ref);
				if(cleanup != null)
					cleanup();
				else
					ref(null);
			} else if(ref != null)
				ref.current = null;
		}
		refCallback._refCleanups.clear();
		for(const ref of _refs.difference(refCallback._refs)) {
			if(typeof ref == "function") {
				const cleanup = ref(refCallback._current);
				if(cleanup != null)
					refCallback._refCleanups.set(ref, cleanup);
			} else if(ref != null)
				ref.current = refCallback._current;
		}
		refCallback._refs = _refs;
	});
	return refCallback;
}
