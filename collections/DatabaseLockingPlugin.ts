import { sql } from "@payloadcms/db-postgres";
import { Config, APIError, TaskConfig, PayloadHandler, PayloadRequest, RequestContext, CollectionConfig, GlobalBeforeOperationHook, CollectionBeforeOperationHook } from "payload";

import { getRequestTransaction } from "./shared";

declare module "payload" {
	export interface RequestContext {
		dbLockTransaction: (opts: { locks: string[], timeout?: number, req?: PayloadRequest }) => Promise<void>;
		dbLockDebounceHandles?: Map<any, { resolvers: PromiseWithResolvers<void>, locks: Set<string>, callback: () => Promise<void>, handle: TimerHandle }>;
		dbLocksAcquiredMap?: Map<any, Set<string>>;
		dbLockWait: (opts: ({ loop: () => Promise<boolean>, expiry: number } | { wait: number, sleep?: number }) & { syncRealm?: string, signal?: AbortSignal, req?: PayloadRequest }) => Promise<{ syncId: string, syncData: Promise<any> }>;
		dbLockNotify: (opts: { syncRealm?: string, syncId: string, syncData?: any, req?: PayloadRequest }) => Promise<void>;
	}
}

const newTransactionLock = (
	{ timeout: defaultTimeout, req: defaultReq }:
	{ timeout: number, req: PayloadRequest }
) => {
	return (async ({ locks, timeout, req }) => {
		timeout ??= defaultTimeout;
		req ??= defaultReq;
		const { payload, context, transactionID } = req;
		if(transactionID == null)
			throw new APIError("Transaction locking must be used within transaction", 400, undefined, false);
		const awaitedTransactionId = await transactionID;
		const db = await getRequestTransaction({ payload, transactionID });
		if(db == null)
			throw new APIError("Cannot find associated database connection for current transaction", 400, undefined, false);
		const debounceHandles = context.dbLockDebounceHandles ??= new Map() as (RequestContext["dbLockDebounceHandles"]) & object;
		const locksAcquiredMap = context.dbLocksAcquiredMap ??= new Map() as (RequestContext["dbLocksAcquiredMap"]) & object;
		let debounceHandle = debounceHandles.get(awaitedTransactionId);
		if(debounceHandle == null) {
			const handleResolvers = Promise.withResolvers<void>();
			const handleLocks = new Set<string>();
			const handleCallback = async () => {
				if(currentDebounceHandle == debounceHandles.get(awaitedTransactionId))
					debounceHandles.delete(awaitedTransactionId);
				let acquiredLocks = locksAcquiredMap.get(awaitedTransactionId);
				if(acquiredLocks == null) {
					acquiredLocks = new Set();
					locksAcquiredMap.set(awaitedTransactionId, acquiredLocks);
				}
				const processLocks = [...handleLocks.difference(acquiredLocks)];
				if(processLocks.length == 0) {
					handleResolvers.resolve();
					return;
				}
				try {
					await payload.db.execute({ db: db, sql: sql.raw(`SET LOCAL lock_timeout = '${timeout}ms'`) });
					await payload.db.execute({ db: db, sql: sql`SELECT pg_advisory_xact_lock(key) FROM unnest((SELECT array_agg(hashtext(val)) FROM unnest(ARRAY[${sql.join(processLocks.map(l => sql`${l}`), sql`,`)}]) AS t(val))) AS t(key) ORDER BY key` });
					if(acquiredLocks != null) {
						for(const lock of locks)
							acquiredLocks.add(lock);
					}
					handleResolvers.resolve();
				} catch(error) {
					handleResolvers.reject(error);
				} finally {
					await payload.db.execute({ db: db, sql: sql`RESET lock_timeout` });
				}
			};
			const currentDebounceHandle = debounceHandle = {
				resolvers: handleResolvers,
				locks: handleLocks,
				callback: handleCallback,
				handle: null as any
			};
			debounceHandles.set(awaitedTransactionId, currentDebounceHandle);
		}
		clearTimeout(debounceHandle.handle);
		for(const lock of locks)
			debounceHandle.locks.add(lock);
		debounceHandle.handle = setTimeout(debounceHandle.callback);
		return await debounceHandle.resolvers.promise;
	}) as RequestContext["dbLockTransaction"];
};

const DatabaseLockingPluginTransactionSyncs = (): CollectionConfig => ({
	slug: "database-locking-plugin-transaction-syncs",
	labels: {
		singular: "Transaction Sync",
		plural: "Transaction Syncs"
	},
	access: {
		create: () => false,
		read: () => false,
		update: () => false,
		delete: () => false,
		admin: () => false
	},
	admin: {
		hidden: true
	},
	hooks: {
		beforeChange: [
			async ({ operation, data, originalDoc, req: { payload } }) => {
				if(operation != "create") {
					if("createdAt" in data || "expiresAt" in data || "realm" in data)
						throw new APIError("Cannot modify read-only properties from database locking plugin transaction sync", 400, undefined, true);
					if(originalDoc.notified == true && ("notified" in data || "value" in data))
						throw new APIError("Cannot modify notified and value attributes after notified", 400, undefined, true);
					// Technically these two operations should be in a transaction (so that CURRENT_TIMESTAMP [a.k.a TRANSACTION_TIMESTAMP] does not change)
					// But this is non-critical, and will be eventually consistent anyway (because of prune cron job).
					const dbCurrentTimestamp = await payload.db.execute({ /* db: no inherit */ sql: sql`SELECT CURRENT_TIMESTAMP` });
					if(Date.parse(originalDoc.expiresAt) <= Date.parse(dbCurrentTimestamp)) {
						try {
							await payload.delete({
								// req: no inherit
								overrideAccess: true,
								collection: "database-locking-plugin-transaction-syncs",
								id: originalDoc.id,
								select: {}
							});
						} catch(_) {}
						throw new APIError("Cannot notify when the sync already expired", 400, undefined, true);
					}
				}
			}
		]
	},
	fields: [
		{
			name: "createdAt",
			label: "Created At",
			type: "date",
			required: true,
			index: true
		},
		{
			name: "expiresAt",
			label: "Expires At",
			type: "date",
			required: true,
			index: true
		},
		{
			name: "realm",
			label: "Realm",
			type: "text"
		},
		{
			// When marked notified, the sync will be automatically deleted by CRON job.
			name: "notified",
			label: "Notified",
			type: "checkbox",
			required: true,
			defaultValue: false
		},
		{
			name: "value",
			label: "Value",
			type: "json"
		}
	]
});
const DatabaseLockingPluginTransactionSyncsPrune = (): TaskConfig<"DatabaseLockingPluginTransactionSyncPrune"> => ({
	slug: "DatabaseLockingPluginTransactionSyncPrune",
	schedule: [
		{ cron: "* 0/5 * * * *", queue: "every-minute" }
	],
	handler: async ({ req: { payload } }) => {
		await payload.db.execute({ /* db: no inherit */ sql: sql`DELETE FROM database_locking_plugin_transaction_syncs WHERE expires_at::timestamp <= CURRENT_TIMESTAMP` });
		return { output: null };
	}
});
const newTransactionSyncWait = ({ req: defaultReq }: { req: PayloadRequest }) => {
	return (async options => {
		const syncRealm = options.syncRealm;
		let loop = "loop" in options ? options.loop : null;
		let expiry = "loop" in options ? options.expiry : null;
		if(loop == null && "wait" in options) {
			const wait = options.wait;
			const sleep = options.sleep ?? 1000;
			// If sleep duration is greater than half of wait duration, then there will be less checks,
			// so that when the transaction is notified, that transaction is pruned by CRON job before getting checked.
			if(sleep >= wait / 2)
				throw new Error("Sleep duration must be less than half of wait duration");
			expiry = wait;
			loop = async () => {
				await new Promise(resolve => setTimeout(() => resolve(null), sleep));
				return true;
			};
		}
		if(loop == null)
			throw new Error("Loop cannot be null");
		if(expiry == null)
			throw new Error("Expiry cannot be null");
		const abortSignal = options.signal;
		let abortSignalOnAbort: (() => void) | null = null;
		let abortSignalPromise: Promise<never> | null = null;
		if(abortSignal != null) {
			abortSignalPromise = new Promise((_, reject) => {
				abortSignalOnAbort = () => {
					abortSignal.removeEventListener("abort", abortSignalOnAbort!);
					reject(abortSignal.reason);
				};
				abortSignal.addEventListener("abort", abortSignalOnAbort);
			});
		}
		const req = options.req ?? defaultReq;
		const { payload } = req;
		try {
			const dbCurrentTimestamp = await payload.db.execute({ /* db: no inherit */ sql: sql`SELECT CURRENT_TIMESTAMP` });
			const initialTransactionSync = await payload.create({
				// req: no inherit
				overrideAccess: true,
				collection: "database-locking-plugin-transaction-syncs",
				data: {
					createdAt: new Date(Date.parse(dbCurrentTimestamp)).toISOString(),
					expiresAt: new Date(Date.parse(dbCurrentTimestamp) + expiry).toISOString(),
					realm: syncRealm,
					notified: false
				},
				select: { notified: true, value: true }
			});
			const deleteTransactionSync = async () => {
				for(let i = 0; i < 3; i++) {
					try {
						await payload.delete({
							// req: no inherit
							overrideAccess: true,
							collection: "database-locking-plugin-transaction-syncs",
							id: initialTransactionSync.id,
							select: {}
						});
						break;
					} catch(_) {
						// Ignoring error is okay, since the record will be deleted automatically by CRON anyway.
					}
				}
			};
			if(abortSignal?.aborted == true) {
				await deleteTransactionSync();
				throw abortSignal.reason;
			}
			const syncData = (async () => {
				try {
					if(initialTransactionSync.notified)
						return initialTransactionSync.value;
					const start = performance.now();
					while((performance.now() - start) < expiry) {
						const transactionSync = await payload.findByID({
							// req: no inherit
							overrideAccess: true,
							collection: "database-locking-plugin-transaction-syncs",
							id: initialTransactionSync.id,
							select: { notified: true, value: true }
						});
						if(transactionSync.notified)
							return transactionSync.value;
						const loopPromise = loop();
						if(abortSignalPromise == null) {
							if(await loopPromise)
								continue;
							break;
						}
						if(await Promise.race([loopPromise, abortSignalPromise]))
							continue;
						break;
					}
					throw new Error("Never receiving notification within expiry time");
				} finally {
					if(abortSignal != null && abortSignalOnAbort != null)
						abortSignal.removeEventListener("abort", abortSignalOnAbort);
					await deleteTransactionSync();
				}
			})();
			return {
				syncId: initialTransactionSync.id,
				syncData: syncData
			};
		} catch(error) {
			if(abortSignal != null && abortSignalOnAbort != null)
				abortSignal.removeEventListener("abort", abortSignalOnAbort);
			throw error;
		}
	}) as RequestContext["dbLockWait"];
};
const newTransactionSyncNotify = ({ req: defaultReq }: { req: PayloadRequest }) => {
	return (async ({ syncRealm, syncId, syncData, req }) => {
		req ??= defaultReq;
		const { payload } = req;
		await payload.update({
			// req: no inherit
			overrideAccess: true,
			collection: "database-locking-plugin-transaction-syncs",
			where: { and: [
				{ id: { equals: syncId } },
				{ syncRealm: { equals: syncRealm } }
			] },
			data: { notified: true, value: syncData }
		});
	}) as RequestContext["dbLockNotify"];
};

export const DatabaseLockingPlugin = () => {
	return (config: Config) => {
		const endpointHandlerHook = (handler: PayloadHandler) => (req => {
			req.context.dbLockTransaction = newTransactionLock({ timeout: 1000 * 5, req });
			req.context.dbLockWait = newTransactionSyncWait({ req });
			req.context.dbLockNotify = newTransactionSyncNotify({ req });
			return handler(req);
		}) as PayloadHandler;
		const collectionBeforeOperationHook: CollectionBeforeOperationHook = ({ req, req: { context } }) => {
			context.dbLockTransaction = newTransactionLock({ timeout: 1000 * 5, req });
			context.dbLockWait = newTransactionSyncWait({ req });
			context.dbLockNotify = newTransactionSyncNotify({ req });
		};
		const globalBeforeOperationHook: GlobalBeforeOperationHook = ({ req, req: { context } }) => {
			context.dbLockTransaction = newTransactionLock({ timeout: 1000 * 5, req });
			context.dbLockWait = newTransactionSyncWait({ req });
			context.dbLockNotify = newTransactionSyncNotify({ req });
		};
		config.collections = [
			...(config.collections ?? []),
			DatabaseLockingPluginTransactionSyncs()
		];
		config.jobs = {
			...config.jobs,
			tasks: [
				...(config.jobs?.tasks ?? []),
				DatabaseLockingPluginTransactionSyncsPrune()
			]
		};
		for(const collection of config.collections) {
			if(Array.isArray(collection.endpoints)) {
				for(const endpoint of collection.endpoints)
					endpoint.handler = endpointHandlerHook(endpoint.handler);
			}
			collection.hooks = {
				...collection.hooks,
				beforeOperation: [
					collectionBeforeOperationHook,
					...(collection.hooks?.beforeOperation ?? [])
				]
			};
		}
		if(config.globals != null) {
			for(const global of config.globals) {
				if(Array.isArray(global.endpoints)) {
					for(const endpoint of global.endpoints)
						endpoint.handler = endpointHandlerHook(endpoint.handler);
				}
				global.hooks = {
					...global.hooks,
					beforeOperation: [
						globalBeforeOperationHook,
						...(global.hooks?.beforeOperation ?? [])
					]
				};
			}
		}
		return config;
	};
};
