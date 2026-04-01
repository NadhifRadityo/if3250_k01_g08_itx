import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";

import { DatabaseLockingPlugin } from "./collections/DatabaseLockingPlugin";
import { SearchPlugin } from "./collections/SearchPlugin";
import { BindSelectPlugin, InternalForceSelectPlugin } from "./collections/SelectPlugin";
import { SkipVirtualFieldValidationPlugin, EmptyableRequiredFieldValidationPlugin } from "./collections/ValidationPlugin";

export default buildConfig({
	secret: process.env.PAYLOAD_SECRET,
	serverURL: process.env.PROJECT_WEB_ORIGIN,
	db: postgresAdapter({
		pool: { connectionString: process.env.PAYLOAD_POSTGRES },
		idType: "uuid"
	}),
	sharp: sharp,
	editor: lexicalEditor(),
	globals: [
	],
	collections: [
	],
	plugins: [
		DatabaseLockingPlugin(),
		SearchPlugin({
			collections: [
				"users",
				"products",
				"product-categories",
				"product-media",
				"transaction-orders",
				"transaction-payments",
				"suggestions",
				"media"
			]
		}),
		SearchProducts(),
		EmptyableRequiredFieldValidationPlugin(),
		SkipVirtualFieldValidationPlugin(),
		InternalForceSelectPlugin(),
		BindSelectPlugin()
	],
	typescript: {
		autoGenerate: true
	}
});
