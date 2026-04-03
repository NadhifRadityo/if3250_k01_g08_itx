import { sql } from "@payloadcms/db-postgres";
import { getPayload } from "payload";

import payloadConfig from "@payload-config";

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
		END $$;
	`)
});

console.log("Force-dropped all tables in schema 'public'.");
