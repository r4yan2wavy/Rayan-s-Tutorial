ALTER TABLE `users` ADD `source_inquiry` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_source_inquiry_unique` ON `users` (`source_inquiry`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_active_attempt` ON `attempts` (`user_id`) WHERE "attempts"."state" = 'in-progress';