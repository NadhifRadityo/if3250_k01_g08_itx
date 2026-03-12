import dotevnx from "@dotenvx/dotenvx";
import { serve, HttpBindings } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";

import { route as routeEmployeeUsers } from "./routes/employee-users";

dotevnx.config({ convention: "nextjs" });

const app = new Hono<{ Bindings: HttpBindings }>();
const PORT = parseInt(process.env.PORT ?? "3000");

app.use("*", logger());
app.get("/health", c => c.json({ status: "ok", timestamp: new Date().toISOString() }));
app.route("/employee-users", routeEmployeeUsers);

const server = serve({
	fetch: app.fetch,
	port: PORT
});
console.log(`Server started at port ${PORT}`);

process.addListener("uncaughtException", error => {
	console.error(`Uncaught exception, Error: ${error.stack ?? error.message ?? error}`);
});
process.addListener("unhandledRejection", (reason: any) => {
	console.error(`Unhandled rejection, Error: ${reason.stack ?? reason.message ?? reason}`);
});
