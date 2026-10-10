CREATE TABLE `calibrations` (
	`id` text PRIMARY KEY NOT NULL,
	`grade` integer NOT NULL,
	`payload` text NOT NULL,
	`notes` text NOT NULL,
	`actor` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`actor`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_calibrations_grade` ON `calibrations` (`grade`,`created`);--> statement-breakpoint
CREATE TABLE `exposures` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`item_id` text NOT NULL,
	`source` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_exposures_user` ON `exposures` (`user_id`,`item_id`);--> statement-breakpoint
ALTER TABLE `attempts` ADD `score_json` text;--> statement-breakpoint
ALTER TABLE `attempts` ADD `conditions` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `revoked_by` text;--> statement-breakpoint
ALTER TABLE `users` ADD `revoked_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `revoke_reason` text;