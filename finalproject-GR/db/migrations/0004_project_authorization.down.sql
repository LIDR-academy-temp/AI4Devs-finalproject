-- Reverses 0004_project_authorization.up.sql.

DROP POLICY self_project_membership ON project_membership;
DROP POLICY member_visible ON project;
