import debug from "next/dist/compiled/debug/index.js";

const log = debug("build:plugin:withPlugins");

export const OPTIONAL_SYMBOL = Symbol.for("__NEXT_COMPOSE_PLUGINS_OPTIONAL__");
export const isOptional = plugin => {
	return typeof plugin[OPTIONAL_SYMBOL] != "undefined";
};
export const markOptional = plugin => {
	plugin[OPTIONAL_SYMBOL] = true;
	return plugin;
};
export default function withPlugins(plugins, nextConfig = {}) {
	const frozenProxiesCache = new WeakMap();
	function createFrozenProxy(target) {
		if(target == null || typeof target != "object") return target;
		const cached = frozenProxiesCache.get(target);
		if(cached != null) return cached;
		const proxy = new Proxy(target, {
			get: (target, property, receiver) => {
				return createFrozenProxy(Reflect.get(target, property, receiver));
			},
			set: (_, property, __) => {
				throw new TypeError(`Cannot assign to property "${property}" - object is frozen`);
			},
			defineProperty: (_, property, __) => {
				throw new TypeError(`Cannot define property "${property}" - object is frozen`);
			},
			deleteProperty: (_, property) => {
				throw new TypeError(`Cannot delete property "${property}" - object is frozen`);
			},
			setPrototypeOf: (_, __) => {
				throw new TypeError("Cannot set prototype - object is frozen");
			},
			preventExtensions: _ => {
				return false;
			},
			isExtensible: _ => {
				return false;
			}
		});
		frozenProxiesCache.set(target, proxy);
		return proxy;
	}
	const isInCurrentPhase = (phase, phaseTest) => {
		const phaseTestString = Array.isArray(phaseTest) ? phaseTest.join("") : phaseTest;
		if(phaseTestString.substr(0, 1) == "!")
			return phaseTestString.indexOf(phase) < 0;
		return phaseTestString.indexOf(phase) >= 0;
	};
	const mergePhaseConfiguration = (phase, config) => {
		const mergedConfig = {};
		for(const key in config) {
			if(key.startsWith("phase-") || key.startsWith("!phase-")) {
				if(!isInCurrentPhase(phase, key)) continue;
				Object.defineProperties(mergedConfig, Object.getOwnPropertyDescriptors(config[key]));
				continue;
			}
			Object.defineProperty(mergedConfig, key, Object.getOwnPropertyDescriptor(config, key));
		}
		return mergedConfig;
	};
	const parsePluginConfig = plugin => {
		if(!Array.isArray(plugin)) {
			return {
				pluginFunction: plugin,
				pluginConfig: {},
				phases: null
			};
		}
		if(plugin.length > 2) {
			return {
				pluginFunction: plugin[0],
				pluginConfig: plugin[1],
				phases: plugin[2]
			};
		}
		if(plugin.length > 1 && plugin[1] instanceof Array) {
			return {
				pluginFunction: plugin[0],
				pluginConfig: {},
				phases: plugin[1]
			};
		}
		return {
			pluginFunction: plugin[0],
			pluginConfig: plugin[1] || {},
			phases: null
		};
	};
	const composePlugins = (phase, config) => {
		const mergedConfig = mergePhaseConfiguration(phase, config);
		let pluginIndex = 0;
		const composeNext = () => {
			if(pluginIndex >= plugins.length)
				return mergedConfig;
			const plugin = plugins[pluginIndex++];
			const { pluginFunction, pluginConfig, phases } = parsePluginConfig(plugin);
			if(phases != null && !isInCurrentPhase(phase, phases))
				return composeNext();
			const resolvedPlugin = !isOptional(pluginFunction) ? pluginFunction : pluginFunction();
			const mergedPluginConfig = mergePhaseConfiguration(phase, pluginConfig);
			const parsePluginConfigResult = pluginConfigResult => {
				const pluginPhases = pluginConfigResult.phases;
				if(pluginPhases != null) {
					if(!isInCurrentPhase(phase, pluginPhases))
						return composeNext();
					delete pluginConfigResult.phases;
				}
				Object.defineProperties(mergedConfig, Object.getOwnPropertyDescriptors(pluginConfigResult));
				return composeNext();
			};
			if(typeof resolvedPlugin == "object")
				return parsePluginConfigResult(resolvedPlugin);
			if(typeof resolvedPlugin == "function") {
				const pluginSpecificConfig = {};
				Object.defineProperties(pluginSpecificConfig, Object.getOwnPropertyDescriptors(mergedConfig));
				Object.defineProperties(pluginSpecificConfig, Object.getOwnPropertyDescriptors(mergedPluginConfig));
				const additionalInfo = { nextComposePlugin: true, phase };
				const pluginResult = resolvedPlugin(pluginSpecificConfig, additionalInfo);
				if(pluginResult instanceof Promise)
					return pluginResult.then(parsePluginConfigResult);
				return parsePluginConfigResult(pluginResult);
			}
			throw new Error("Incompatible plugin: plugin needs to export either a function or an object!");
		};
		return composeNext();
	};
	return (phase, { defaultConfig = {} }) => {
		log("Composing plugins...");
		const optionalPromise = (value, callback) => {
			if(!(value instanceof Promise))
				return callback(value);
			return value.then(callback);
		};
		const initialConfig = optionalPromise({}, config => {
			Object.assign(config, defaultConfig);
			if(typeof nextConfig == "object") {
				Object.defineProperties(config, Object.getOwnPropertyDescriptors(nextConfig));
				return config;
			}
			if(typeof nextConfig == "function") {
				return optionalPromise(nextConfig(phase, { defaultConfig: createFrozenProxy(config) }), resolvedNextConfig => {
					Object.defineProperties(config, Object.getOwnPropertyDescriptors(resolvedNextConfig));
					return config;
				});
			}
			throw new Error("Incompatible entry: entry must be a function or an object!");
		});
		const composedConfig = optionalPromise(initialConfig, config => {
			return optionalPromise(composePlugins(phase, config), composedConfig => {
				log("Plugins composed");
				return composedConfig;
			});
		});
		return composedConfig;
	};
}
