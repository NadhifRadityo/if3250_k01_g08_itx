import { withPayload } from "@payloadcms/next/withPayload";

import withPlugins from "./build/next.config.withPlugins.js";

export default withPlugins([
	[withPayload]
], phase => ({
	cacheComponents: true,
	experimental: {
		authInterrupts: true
	},
	env: {
		BUILD_PHASE: phase
	},
	typescript: {
		ignoreBuildErrors: true
	}
}));
