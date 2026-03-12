"use server";

import { logout } from "./page.actions";

export default async function Page() {
	return (
		<>
			<button onClick={logout}>Logout</button>
		</>
	);
}
