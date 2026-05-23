import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig, databaseKVAdapter } from "payload";
import sharp from "sharp";

import { CreditApplicationAssignments, CreditApplicationAssignmentAccesses, CreditApplicationAssignmentAccessMasks } from "./collections/CreditApplicationAssignmentCollection";
import { CreditApplications, CreditApplicationImports, CreditApplicationAccesses, CreditApplicationAccessMasks, CreditApplicationImportAccesses, CreditApplicationImportAccessMasks } from "./collections/CreditApplicationCollection";
import { DatabaseLockingPlugin } from "./collections/DatabaseLockingPlugin";
import { GenericRichtextUploads } from "./collections/GenericCollection";
import { GpsLogs, GpsLogAccesses, GpsLogAccessMasks } from "./collections/GpsLogCollection";
import { LoginLogs, LoginLogAccesses, LoginLogAccessMasks } from "./collections/LoginLogCollection";
import { OtpLogs, OtpLogAccesses, OtpLogAccessMasks } from "./collections/OtpLogCollection";
import { RecordingLogs, RecordingLogAudioFiles, RecordingLogTranscriptions, RecordingLogAccesses, RecordingLogAccessMasks } from "./collections/RecordingLogCollection";
import { Roles, RoleAccesses, RoleAccessMasks } from "./collections/RoleCollection";
import { SatisfactionSurveys, SatisfactionSurveyAccesses, SatisfactionSurveyAccessMasks } from "./collections/SatisfactionSurveyCollection";
import { SearchPlugin } from "./collections/SearchPlugin";
import { BindSelectPlugin, InternalForceSelectPlugin } from "./collections/SelectPlugin";
import { Surveys, SurveyAccesses, SurveyAccessMasks } from "./collections/SurveyCollection";
import { SurveyResults, SurveyResultAccesses, SurveyResultAccessMasks } from "./collections/SurveyResultCollection";
import { Teams, TeamAccesses, TeamAccessMasks } from "./collections/TeamCollection";
import { Users, StagedUsers, StagedUserAccesses, StagedUserAccessMasks } from "./collections/UserCollection";
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
	],
	collections: [
		GenericRichtextUploads(),
		Users(),
		StagedUsers(),
		StagedUserAccesses(),
		StagedUserAccessMasks(),
		Roles(),
		RoleAccesses(),
		RoleAccessMasks(),
		Teams(),
		TeamAccesses(),
		TeamAccessMasks(),
		CreditApplicationAssignments(),
		CreditApplicationAssignmentAccesses(),
		CreditApplicationAssignmentAccessMasks(),
		CreditApplicationImports(),
		CreditApplicationImportAccesses(),
		CreditApplicationImportAccessMasks(),
		CreditApplications(),
		CreditApplicationAccesses(),
		CreditApplicationAccessMasks(),
		Surveys(),
		SurveyAccesses(),
		SurveyAccessMasks(),
		SurveyResults(),
		SurveyResultAccesses(),
		SurveyResultAccessMasks(),
		SatisfactionSurveys(),
		SatisfactionSurveyAccesses(),
		SatisfactionSurveyAccessMasks(),
		LoginLogs(),
		LoginLogAccesses(),
		LoginLogAccessMasks(),
		GpsLogs(),
		GpsLogAccesses(),
		GpsLogAccessMasks(),
		OtpLogs(),
		OtpLogAccesses(),
		OtpLogAccessMasks(),
		RecordingLogs(),
		RecordingLogAccesses(),
		RecordingLogAccessMasks(),
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
