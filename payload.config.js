import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig, databaseKVAdapter } from "payload";
import sharp from "sharp";

import { CreditApplicationAssignments } from "./collections/CreditApplicationAssignmentCollection";
import { CreditApplications, CreditApplicationImports, CreditApplicationFieldMasks, CreditApplicationDefaultFieldMask } from "./collections/CreditApplicationCollection";
import { DatabaseLockingPlugin } from "./collections/DatabaseLockingPlugin";
import { GenericRichtextUploads } from "./collections/GenericCollection";
import { GpsLogs } from "./collections/GpsLogCollection";
import { LoginLogs } from "./collections/LoginLogCollection";
import { OtpLogs } from "./collections/OtpLogCollection";
import { RecordingLogs, RecordingLogAudioFiles, RecordingLogTranscriptions } from "./collections/RecordingLogCollection";
import { Roles } from "./collections/RoleCollection";
import { SatisfactionSurveys } from "./collections/SatisfactionSurveyCollection";
import { SearchPlugin } from "./collections/SearchPlugin";
import { BindSelectPlugin, InternalForceSelectPlugin } from "./collections/SelectPlugin";
import { Surveys } from "./collections/SurveyCollection";
import { SurveyResults } from "./collections/SurveyResultCollection";
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
	kv: databaseKVAdapter(),
	sharp: sharp,
	editor: lexicalEditor(),
	globals: [
		CreditApplicationDefaultFieldMask()
	],
	collections: [
		GenericRichtextUploads(),
		Users(),
		StagedUsers(),
		Roles(),
		Teams(),
		CreditApplicationAssignments(),
		CreditApplicationImports(),
		CreditApplications(),
		CreditApplicationFieldMasks(),
		Surveys(),
		SurveyResults(),
		SatisfactionSurveys(),
		LoginLogs(),
		GpsLogs(),
		OtpLogs(),
		RecordingLogs(),
		RecordingLogAudioFiles(),
		RecordingLogTranscriptions()
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
