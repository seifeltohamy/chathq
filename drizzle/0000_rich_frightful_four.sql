-- auth.users is Supabase-managed; reference only, do not create.
-- (drizzle-kit emits this because of the shadow pgSchema declaration in lib/db/schema.ts;
--  we keep the shadow for type-safe FK references in queries, but neuter the CREATE here.)
CREATE TABLE IF NOT EXISTS "auth"."users" (
	"id" uuid PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_collect_configs" (
	"user_id" uuid NOT NULL,
	"automation_id" text NOT NULL,
	"automation_name" text NOT NULL,
	"email_ask_text" text NOT NULL,
	"follow_up_dm" text NOT NULL,
	"email_subject" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_collect_configs_user_id_automation_id_pk" PRIMARY KEY("user_id","automation_id")
);
--> statement-breakpoint
CREATE TABLE "processed_conversations" (
	"user_id" uuid NOT NULL,
	"conversation_id" text NOT NULL,
	"last_processed_msg_id" text,
	"last_replied_at" timestamp with time zone,
	CONSTRAINT "processed_conversations_user_id_conversation_id_pk" PRIMARY KEY("user_id","conversation_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"ig_username" text,
	"zernio_api_key_enc" text,
	"zernio_profile_id" text,
	"zernio_account_id" text,
	"brevo_api_key_enc" text,
	"brevo_from_email" text,
	"onboarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_zernio_account_id_unique" UNIQUE("zernio_account_id")
);
--> statement-breakpoint
ALTER TABLE "email_collect_configs" ADD CONSTRAINT "email_collect_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processed_conversations" ADD CONSTRAINT "processed_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;