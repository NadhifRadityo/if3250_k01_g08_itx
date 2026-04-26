import { resolveManagementRootHref } from "../layout.actions";
import { redirect } from "next/navigation";

export default async function SurveyQuestionDetailRootPage() {
	const href = await resolveManagementRootHref("survey-question-detail");
	redirect(href);
}
