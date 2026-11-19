ALTER TYPE "public"."invitation_status" ADD VALUE 'declined' BEFORE 'cancelled';--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "invitee_name" varchar(100);