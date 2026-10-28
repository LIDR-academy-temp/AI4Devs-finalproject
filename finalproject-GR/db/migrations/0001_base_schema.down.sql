-- Reverses 0001_base_schema.up.sql. Dropping a table drops its policies and grants with it.

DROP TABLE IF EXISTS project_membership;
DROP TABLE IF EXISTS project;
DROP TABLE IF EXISTS workspace_membership;
DROP TABLE IF EXISTS "user";
DROP TABLE IF EXISTS workspace;
