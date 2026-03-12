import dotevnx from "@dotenvx/dotenvx";
import { defineConfig } from "drizzle-kit";

dotevnx.config({ convention: "nextjs" });

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/schema.ts",
	out: "./migrations",
	dbCredentials: {
		url: process.env.DATABASE_URL!
	}
});
