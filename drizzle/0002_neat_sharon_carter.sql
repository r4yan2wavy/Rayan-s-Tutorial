CREATE TABLE `custom_content` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`item` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`owner`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
