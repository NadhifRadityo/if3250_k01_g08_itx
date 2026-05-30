import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig, databaseKVAdapter } from "payload";
import sharp from "sharp";

import { Accesses, AccessesSchemaHook } from "./collections/AccessCollection";
import { CreditApplicationAssignments, CreditApplicationAssignmentsSchemaHook } from "./collections/CreditApplicationAssignmentCollection";
import { CreditApplications, CreditApplicationImports, CreditApplicationsSchemaHook, CreditApplicationImportsSchemaHook } from "./collections/CreditApplicationCollection";
import { DatabaseLockingPlugin } from "./collections/DatabaseLockingPlugin";
import { GenericRichtextUploads } from "./collections/GenericCollection";
import { GpsLogs } from "./collections/GpsLogCollection";
import { LoginLogs } from "./collections/LoginLogCollection";
import { OfficerTasks, OfficerTasksSchemaHook } from "./collections/OfficerTaskCollection";
import { MessageLogs } from "./collections/MessageLogCollection";
import { RecordingLogs, RecordingLogAudioFiles, RecordingLogTranscriptions } from "./collections/RecordingLogCollection";
import { Roles, RolesSchemaHook } from "./collections/RoleCollection";
import { SatisfactionSurveys, SatisfactionSurveysSchemaHook } from "./collections/SatisfactionSurveyCollection";
import { SatisfactionSurveyResults } from "./collections/SatisfactionSurveyResultCollection";
import { SearchPlugin } from "./collections/SearchPlugin";
import { BindSelectPlugin, InternalForceSelectPlugin } from "./collections/SelectPlugin";
import { Surveys, SurveysSchemaHook } from "./collections/SurveyCollection";
import { SurveyResults } from "./collections/SurveyResultCollection";
import { Teams, TeamsSchemaHook } from "./collections/TeamCollection";
import { Users, StagedUsers, StagedUsersSchemaHook } from "./collections/UserCollection";
import { SkipVirtualFieldValidationPlugin, EmptyableRequiredFieldValidationPlugin } from "./collections/ValidationPlugin";

export default buildConfig({
	secret: process.env.PAYLOAD_SECRET,
	serverURL: process.env.PROJECT_WEB_ORIGIN,
	db: postgresAdapter({
		pool: { connectionString: process.env.PAYLOAD_POSTGRES },
		idType: "uuid",
		afterSchemaInit: [
			StagedUsersSchemaHook(),
			RolesSchemaHook(),
			TeamsSchemaHook(),
			AccessesSchemaHook(),
			CreditApplicationsSchemaHook(),
			CreditApplicationImportsSchemaHook(),
			CreditApplicationAssignmentsSchemaHook(),
			OfficerTasksSchemaHook(),
			SurveysSchemaHook(),
			SatisfactionSurveysSchemaHook()
		]
	}),
	kv: databaseKVAdapter(),
	sharp: sharp,
	editor: lexicalEditor(),
	globals: [
	],
	collections: [
		GenericRichtextUploads(),
		Users(),
		StagedUsers(),
		Roles(),
		Teams(),
		Accesses(),
		CreditApplications(),
		CreditApplicationImports(),
		CreditApplicationAssignments(),
		OfficerTasks(),
		Surveys(),
		SurveyResults(),
		SatisfactionSurveys(),
		SatisfactionSurveyResults(),
		LoginLogs(),
		GpsLogs(),
		MessageLogs(),
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
