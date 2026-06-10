import { unstable_rethrow } from "next/navigation";

// wsa: wrap server action
export function wsa<P extends any[], R>(fn: (...args: P) => R): (...args: P) => Promise<[null, Awaited<R>] | [any, null]> {
	return async (...args: P) => {
		try {
			return [null, await fn(...args)];
		} catch(error) {
			unstable_rethrow(error);
			if(process.env.NODE_ENV == "production")
				return [error, null];
			if(error instanceof Error) {
				for(const key of Object.keys(error)) {
					if(key == "name" || key == "message") continue;
					delete error[key];
				}
			}
			return [error, null];
		}
	};
}
const cachedUnwrappedServerActions = new WeakMap();
// uwsa: unwrap server action
export function uwsa<
	F extends (...args: any[]) => Promise<[null, any] | [any, null]>,
	P extends Parameters<F> = Parameters<F>,
	R extends rwsa<F> = rwsa<F>
>(fn: F) {
	let unwrappedFn = cachedUnwrappedServerActions.get(fn) as ((...args: P) => Promise<R>) | null;
	if(unwrappedFn != null)
		return unwrappedFn;
	unwrappedFn = async (...args: P) => {
		const result = await fn(...args);
		if(result[0] != null)
			throw result[0];
		return result[1] as R;
	};
	cachedUnwrappedServerActions.set(fn, unwrappedFn);
	return unwrappedFn;
}
// rsa: result of server action - extracts the success result type from a wsa-wrapped function
export type rwsa<F extends (...args: any[]) => Promise<[null, any] | [any, null]>> = F extends (...args: any[]) => Promise<[null, infer R] | [any, null]> ? R : never;
