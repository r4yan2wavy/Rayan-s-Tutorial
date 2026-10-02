CREATE TABLE `answers` (
	`session_id` text NOT NULL,
	`question_id` text NOT NULL,
	`user_id` text NOT NULL,
	`answer` text NOT NULL,
	`correct` integer NOT NULL,
	`seconds` real NOT NULL,
	`updated` integer NOT NULL,
	PRIMARY KEY(`session_id`, `question_id`),
	FOREIGN KEY (`session_id`) REFERENCES `test_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_answer_user` ON `answers` (`user_id`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_auth_user` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `content_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created` integer NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `question_exposure` (
	`user_id` text NOT NULL,
	`question_id` text NOT NULL,
	`first_seen` integer NOT NULL,
	`last_seen` integer NOT NULL,
	`times_seen` integer NOT NULL,
	`session_id` text NOT NULL,
	`session_type` text NOT NULL,
	PRIMARY KEY(`user_id`, `question_id`),
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `mistakes` (
	`user_id` text NOT NULL,
	`question_id` text NOT NULL,
	`original_answer` text NOT NULL,
	`created` integer NOT NULL,
	`status` text DEFAULT 'Needs Review' NOT NULL,
	PRIMARY KEY(`user_id`, `question_id`),
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `mock_tests` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`data` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `passages` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`difficulty` integer NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`data` text NOT NULL,
	`status` text DEFAULT 'approved' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_passage_difficulty` ON `passages` (`status`,`difficulty`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`salt` text NOT NULL,
	`role` text DEFAULT 'student' NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_email_unique` ON `profiles` (`email`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`subject` text NOT NULL,
	`skill` text NOT NULL,
	`difficulty` integer NOT NULL,
	`passage_id` text,
	`fingerprint` text NOT NULL,
	`data` text NOT NULL,
	`status` text DEFAULT 'approved' NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`passage_id`) REFERENCES `passages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `questions_fingerprint_unique` ON `questions` (`fingerprint`);--> statement-breakpoint
CREATE INDEX `idx_question_select` ON `questions` (`status`,`subject`,`skill`,`difficulty`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `results` (
	`session_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created` integer NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `test_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_results_user` ON `results` (`user_id`);--> statement-breakpoint
CREATE TABLE `test_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`created` integer NOT NULL,
	`expires` integer,
	`updated` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_session_user` ON `test_sessions` (`user_id`,`status`);