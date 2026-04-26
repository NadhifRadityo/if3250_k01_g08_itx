import { resolveManagementRootHref } from "../layout.actions";
import { redirect } from "next/navigation";

export default async function SurveyQuestionHeaderRootPage() {
	const href = await resolveManagementRootHref("survey-question-header");
	redirect(href);
}
