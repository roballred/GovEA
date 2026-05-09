-- ============================================================================
-- audit_log immutability — issue #417
--
-- Block UPDATE and DELETE on the audit_log table at the DB level so that even
-- a caller with full INSERT/SELECT access (the application role, or a
-- compromised admin) cannot rewrite history.
--
-- INSERT remains permitted — that is how new audit rows get written.
--
-- This file is idempotent: it can safely be re-run after every `db:push`.
-- It is applied by `pnpm --filter govea db:apply-triggers` and by CI in the
-- integration / smoke jobs.
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_log_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only — UPDATE and DELETE are not permitted';
END;
$$;

DROP TRIGGER IF EXISTS audit_log_no_update ON audit_log;
CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

DROP TRIGGER IF EXISTS audit_log_no_delete ON audit_log;
CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
