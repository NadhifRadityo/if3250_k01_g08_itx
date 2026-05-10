
ALTER TABLE IF EXISTS "payload_locked_documents_rels"
	DROP COLUMN IF EXISTS "login_logs_id" CASCADE;

DROP TABLE IF EXISTS "login_logs" CASCADE;
