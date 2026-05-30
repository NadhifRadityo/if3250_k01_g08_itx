import { postgresAdapter } from "@payloadcms/db-postgres";
import { sql } from "@payloadcms/db-postgres";
import { check, uniqueIndex } from "@payloadcms/db-postgres/drizzle";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig, databaseKVAdapter } from "payload";
import sharp from "sharp";

import { Accesses } from "./collections/AccessCollection";
import { CreditApplicationAssignments } from "./collections/CreditApplicationAssignmentCollection";
import { CreditApplications, CreditApplicationImports } from "./collections/CreditApplicationCollection";
import { DatabaseLockingPlugin } from "./collections/DatabaseLockingPlugin";
import { GenericRichtextUploads } from "./collections/GenericCollection";
import { GpsLogs } from "./collections/GpsLogCollection";
import { LoginLogs } from "./collections/LoginLogCollection";
import { OfficerTasks } from "./collections/OfficerTaskCollection";
import { OtpLogs } from "./collections/OtpLogCollection";
import { RecordingLogs, RecordingLogAudioFiles, RecordingLogTranscriptions } from "./collections/RecordingLogCollection";
import { Roles } from "./collections/RoleCollection";
import { SatisfactionSurveys } from "./collections/SatisfactionSurveyCollection";
import { SatisfactionSurveyResults } from "./collections/SatisfactionSurveyResultCollection";
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
		idType: "uuid",
		afterSchemaInit: [
			({ schema, extendTable }) => {
				extendTable({
					table: schema.tables["officer_tasks"],
					extraConfig: t => ({
						officerTaskTailUniqueIdx: uniqueIndex("officer_tasks_credit_application_assignment_tail_idx")
							.on(t.creditApplicationAssignment)
							.where(sql`"next_id" IS NULL`),
						officerTaskActiveImpliesTailCheck: check(
							"officer_tasks_active_implies_tail_check",
							sql`"settled_at" IS NOT NULL OR "next_id" IS NULL`
						),
						officerTaskApprovedImpliesTailCheck: check(
							"officer_tasks_approved_implies_tail_check",
							sql`"evaluation_approved" IS NOT TRUE OR "next_id" IS NULL`
						),
						officerTaskEvaluatedRequiresFinishedCheck: check(
							"officer_tasks_evaluated_requires_finished_check",
							sql`"evaluated_at" IS NULL OR "settlement_status" = 'finished'`
						),
						officerTaskFinishedWithSuccessorRequiresRejectedCheck: check(
							"officer_tasks_finished_with_successor_requires_rejected_check",
							sql`"settlement_status" IS DISTINCT FROM 'finished' OR "next_id" IS NULL OR "evaluation_approved" IS FALSE`
						)
					})
				});
				return schema;
			}
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
