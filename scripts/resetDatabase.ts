import { sql } from "@payloadcms/db-postgres";
import { getPayload } from "payload";

import payloadConfig from "@payload-config";

// Skip dev schema push while resetting. The current schema may be inconsistent,
// and pushDevSchema runs before this script can drop broken objects.
process.env.PAYLOAD_MIGRATING = "true";

const payload = await getPayload({ config: payloadConfig });

await payload.db.execute({
	/* db: no inherit */
	drizzle: payload.db.drizzle,
	sql: sql.raw(`
		DO $$
		DECLARE
			target RECORD;
		BEGIN
			FOR target IN
				SELECT schemaname, tablename
				FROM pg_tables
				WHERE schemaname = 'public'
			LOOP
				EXECUTE format('DROP TABLE IF EXISTS %I.%I CASCADE', target.schemaname, target.tablename);
			END LOOP;

			FOR target IN
				SELECT n.nspname AS schemaname, t.typname
				FROM pg_type t
				JOIN pg_namespace n ON n.oid = t.typnamespace
				WHERE n.nspname = 'public'
					AND t.typtype = 'e'
			LOOP
				EXECUTE format('DROP TYPE IF EXISTS %I.%I CASCADE', target.schemaname, target.typname);
			END LOOP;
		END $$;
	`)
});

console.log("Force-dropped all tables and enum types in schema 'public'.");
