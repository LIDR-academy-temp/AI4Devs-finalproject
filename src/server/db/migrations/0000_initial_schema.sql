CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('pending', 'reserved', 'purchased', 'shipped', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('es', 'en');--> statement-breakpoint
CREATE TYPE "public"."link_status" AS ENUM('none', 'pending', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'ended');--> statement-breakpoint
CREATE TYPE "public"."membership_type" AS ENUM('member', 'buyer');--> statement-breakpoint
CREATE TYPE "public"."shipping_service" AS ENUM('maritime', 'air');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" varchar(50) NOT NULL,
	"account_id" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_provider_id_account_id_unique" UNIQUE("provider_id","account_id"),
	CONSTRAINT "accounts_user_id_provider_id_unique" UNIQUE("user_id","provider_id")
);
--> statement-breakpoint
CREATE TABLE "delivery_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"label" varchar(100) NOT NULL,
	"receiver_name" varchar(100) NOT NULL,
	"phone" varchar(16) NOT NULL,
	"address" varchar(500) NOT NULL,
	"country" char(2) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_addresses_phone_e164" CHECK ("delivery_addresses"."phone" ~ '^\+[1-9][0-9]{1,14}$'),
	CONSTRAINT "delivery_addresses_country_format" CHECK ("delivery_addresses"."country" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"type" "membership_type" NOT NULL,
	"code" varchar(43) NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"created_by" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_by" uuid,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"recipient_id" uuid,
	"recipient_name" varchar(100),
	"name" varchar(100) NOT NULL,
	"notes" varchar(1000),
	"url" varchar(2000),
	"store_name" varchar(100),
	"thumbnail_url" text,
	"link_status" "link_status" DEFAULT 'none' NOT NULL,
	"quantity" smallint DEFAULT 1 NOT NULL,
	"status" "item_status" DEFAULT 'pending' NOT NULL,
	"buyer_id" uuid,
	"buyer_note" varchar(1000),
	"unavailable_note" varchar(1000),
	"shipment_id" uuid,
	"added_by" uuid NOT NULL,
	"updated_after_reservation" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_quantity_range" CHECK ("items"."quantity" BETWEEN 1 AND 99),
	CONSTRAINT "items_buyer_matches_status" CHECK (("items"."status" = 'pending') = ("items"."buyer_id" IS NULL)),
	CONSTRAINT "items_shipment_only_when_shipped" CHECK ("items"."shipment_id" IS NULL OR "items"."status" = 'shipped'),
	CONSTRAINT "items_unavailable_note_required" CHECK ("items"."status" <> 'unavailable' OR "items"."unavailable_note" IS NOT NULL),
	CONSTRAINT "items_url_scheme" CHECK ("items"."url" ~* '^https?://')
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"name" varchar(50) PRIMARY KEY NOT NULL,
	"last_started_at" timestamp with time zone,
	"last_completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "membership_type" NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "memberships_group_id_user_id_unique" UNIQUE("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipient_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"name" varchar(40) NOT NULL,
	"value" varchar(150) NOT NULL,
	"position" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"notes" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_agent" varchar(500),
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"ship_date" date NOT NULL,
	"agency" varchar(80) NOT NULL,
	"service" "shipping_service" NOT NULL,
	"delivery_address_id" uuid,
	"address_label" varchar(100),
	"address_receiver_name" varchar(100),
	"address_phone" varchar(16),
	"address_text" varchar(500),
	"address_country" char(2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipments_address_phone_e164" CHECK ("shipments"."address_phone" ~ '^\+[1-9][0-9]{1,14}$'),
	CONSTRAINT "shipments_address_country_format" CHECK ("shipments"."address_country" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE TABLE "status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"from_status" "item_status",
	"to_status" "item_status" NOT NULL,
	"is_undo" boolean DEFAULT false NOT NULL,
	"author_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100),
	"email" varchar(320),
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"language" "language",
	"whatsapp_number" varchar(16),
	"terms_accepted_at" timestamp with time zone,
	"onboarded_at" timestamp with time zone,
	"receive_emails" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_whatsapp_number_e164" CHECK ("users"."whatsapp_number" ~ '^\+[1-9][0-9]{1,14}$')
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" varchar(255) NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_addresses" ADD CONSTRAINT "delivery_addresses_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_accepted_by_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_recipient_id_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipient_details" ADD CONSTRAINT "recipient_details_recipient_id_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipients" ADD CONSTRAINT "recipients_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_delivery_address_id_delivery_addresses_id_fk" FOREIGN KEY ("delivery_address_id") REFERENCES "public"."delivery_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_addresses_one_default_per_group" ON "delivery_addresses" USING btree ("group_id") WHERE "delivery_addresses"."is_default";--> statement-breakpoint
CREATE INDEX "items_list_id_status_index" ON "items" USING btree ("list_id","status");--> statement-breakpoint
CREATE INDEX "items_buyer_id_status_index" ON "items" USING btree ("buyer_id","status");--> statement-breakpoint
CREATE INDEX "items_recipient_id_index" ON "items" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "status_history_created_at_index" ON "status_history" USING btree ("created_at");