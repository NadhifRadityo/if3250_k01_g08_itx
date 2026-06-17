import { redirect } from "next/navigation";

export default function Unauthorized() {
	return redirect("/login");
}
