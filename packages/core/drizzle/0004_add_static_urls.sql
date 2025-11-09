ALTER TABLE `worktrees` ADD COLUMN IF NOT EXISTS `start_command` text;--> statement-breakpoint
ALTER TABLE `worktrees` ADD COLUMN IF NOT EXISTS `stop_command` text;--> statement-breakpoint
ALTER TABLE `worktrees` ADD COLUMN IF NOT EXISTS `health_check_url` text;--> statement-breakpoint
ALTER TABLE `worktrees` ADD COLUMN IF NOT EXISTS `app_url` text;--> statement-breakpoint
ALTER TABLE `worktrees` ADD COLUMN IF NOT EXISTS `logs_command` text;
