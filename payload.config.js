import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";

import { CreditApplications, CreditApplicationImports, CreditApplicationFieldMasks, CreditApplicationDefaultFieldMask } from "./collections/CreditApplicationCollection";
import { DatabaseLockingPlugin } from "./collections/DatabaseLockingPlugin";
import { SearchPlugin } from "./collections/SearchPlugin";
import { BindSelectPlugin, InternalForceSelectPlugin } from "./collections/SelectPlugin";
import { Teams } from "./collections/TeamCollection";
import { Users, StagedUsers } from "./collections/UserCollection";
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
		CreditApplicationDefaultFieldMask()
	],
	collections: [
		Users(),
		StagedUsers(),
		Teams(),
		CreditApplicationImports(),
		CreditApplications(),
		CreditApplicationFieldMasks()
	],
	plugins: [
		DatabaseLockingPlugin(),
		SearchPlugin({
			collections: [
				"users",
				"staged-users",
				"teams",
				"credit-application-imports",
				"credit-applications"
			]
		}),
		EmptyableRequiredFieldValidationPlugin(),
		SkipVirtualFieldValidationPlugin(),
		InternalForceSelectPlugin(),
		BindSelectPlugin()
	],
	typescript: {
		autoGenerate: true
	}
});
