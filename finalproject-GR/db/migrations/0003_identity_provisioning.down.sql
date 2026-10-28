-- Reverses 0003_identity_provisioning.up.sql: restores the original single-condition policy.

DROP POLICY self_access ON "user";

CREATE POLICY self_access ON "user"
  USING (id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (id = nullif(current_setting('app.user_id', true), '')::uuid);
