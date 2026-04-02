import { withPayload } from "@payloadcms/next/withPayload";

import withBuildMetadata from "./build/next.config.withBuildMetadata.js";
import withPlugins from "./build/next.config.withPlugins.js";

export default withPlugins([
	[withBuildMetadata],
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
