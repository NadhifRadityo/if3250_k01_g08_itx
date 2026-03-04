import dotevnx from "@dotenvx/dotenvx";
import { defineConfig } from "drizzle-kit";

dotevnx.config({ convention: "nextjs" });

export default defineConfig({
	out: "./drizzle",
	schema: "./schema.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL!
	}
});
