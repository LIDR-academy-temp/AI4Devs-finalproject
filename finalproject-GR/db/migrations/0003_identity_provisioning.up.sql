-- Widens "user"'s self_access policy (ADR 0003 point 4 / identity-provisioning design.md):
-- first contact needs to find a row by clerk_user_id before the caller's own internal id
-- is known at all, which the original single-condition policy can't serve.
-- Run as railgun_migrator.

DROP POLICY self_access ON "user";

CREATE POLICY self_access ON "user"
  USING (
    id = nullif(current_setting('app.user_id', true), '')::uuid
    OR clerk_user_id = nullif(current_setting('app.clerk_user_id', true), '')
  )
  WITH CHECK (id = nullif(current_setting('app.user_id', true), '')::uuid);
