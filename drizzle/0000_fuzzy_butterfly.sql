CREATE TABLE `announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`actor` text NOT NULL,
	`message` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`creator` text NOT NULL,
	`class_id` text NOT NULL,
	`title` text NOT NULL,
	`instructions` text NOT NULL,
	`mode` text NOT NULL,
	`subject` text NOT NULL,
	`topic` text NOT NULL,
	`grade` integer NOT NULL,
	`count` integer NOT NULL,
	`items` text NOT NULL,
	`state` text DEFAULT 'draft' NOT NULL,
	`due` integer,
	`published` integer,
	`attempt_limit` integer DEFAULT 1 NOT NULL,
	`minutes` integer DEFAULT 0 NOT NULL,
	`feedback` text DEFAULT 'submission' NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`creator`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`assignment_id` text,
	`title` text NOT NULL,
	`mode` text NOT NULL,
	`grade` integer NOT NULL,
	`items` text NOT NULL,
	`answers` text NOT NULL,
	`cursor` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`state` text DEFAULT 'in-progress' NOT NULL,
	`started` integer NOT NULL,
	`deadline` integer,
	`finished` integer,
	`released` integer DEFAULT 0 NOT NULL,
	`feedback` text DEFAULT '' NOT NULL,
	`override` integer,
	`notes` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_attempts_user` ON `attempts` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_attempts_assignment` ON `attempts` (`assignment_id`);--> statement-breakpoint
CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`grade` integer NOT NULL,
	`schedule` text DEFAULT '' NOT NULL,
	`state` text DEFAULT 'active' NOT NULL,
	`visible` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `content_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`state` text NOT NULL,
	`notes` text NOT NULL,
	`actor` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`grade` integer NOT NULL,
	`contact` text NOT NULL,
	`phone` text NOT NULL,
	`interest` text NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`user_id` text,
	`created` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `limits` (
	`key` text PRIMARY KEY NOT NULL,
	`hits` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_membership` ON `memberships` (`class_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_memberships_user` ON `memberships` (`user_id`);--> statement-breakpoint
CREATE TABLE `mistakes` (
	`id` text PRIMARY KEY NOT NULL,
	`attempt_id` text NOT NULL,
	`user_id` text NOT NULL,
	`item_index` integer NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`review_at` integer NOT NULL,
	`stage` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`attempt_id`) REFERENCES `attempts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_mistake` ON `mistakes` (`attempt_id`,`item_index`);--> statement-breakpoint
CREATE INDEX `idx_mistakes_user` ON `mistakes` (`user_id`);--> statement-breakpoint
CREATE TABLE `recipients` (
	`id` text PRIMARY KEY NOT NULL,
	`assignment_id` text NOT NULL,
	`user_id` text NOT NULL,
	`due` integer,
	FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_recipient` ON `recipients` (`assignment_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_recipients_user` ON `recipients` (`user_id`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`item_id` text NOT NULL,
	`message` text NOT NULL,
	`state` text DEFAULT 'new' NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`state` text DEFAULT 'active' NOT NULL,
	`enrollment` text DEFAULT 'active' NOT NULL,
	`grade` integer DEFAULT 8 NOT NULL,
	`hash` text NOT NULL,
	`must_change` integer DEFAULT 1 NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);