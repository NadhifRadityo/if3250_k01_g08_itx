import { redirect, RedirectType } from "next/navigation";

export default function LoginActivityLogRootPage() {
	return redirect("/login-activity-log/viewer", RedirectType.push);
}
