ALTER TABLE `assignments` ADD `recipient_selection` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `recipients` ADD `attempt_limit` integer;