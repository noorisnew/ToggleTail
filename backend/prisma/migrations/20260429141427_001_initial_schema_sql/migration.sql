-- CreateTable
CREATE TABLE `parents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `pin_hash` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `parents_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `children` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `parent_id` INTEGER NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `age` TINYINT NOT NULL,
    `age_band` VARCHAR(5) NOT NULL DEFAULT '6-8',
    `reading_level` VARCHAR(20) NOT NULL DEFAULT 'Beginner',
    `avatar` VARCHAR(20) NOT NULL DEFAULT 'Dino',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `children_parent_id_idx`(`parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `child_interests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `child_id` INTEGER NOT NULL,
    `interest` VARCHAR(50) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `text` LONGTEXT NOT NULL,
    `category` VARCHAR(50) NOT NULL DEFAULT 'General',
    `age_band` VARCHAR(5) NOT NULL DEFAULT 'all',
    `reading_level` VARCHAR(20) NOT NULL DEFAULT 'Beginner',
    `language` VARCHAR(10) NOT NULL DEFAULT 'en',
    `source_type` VARCHAR(20) NOT NULL,
    `provider` VARCHAR(20) NOT NULL DEFAULT 'internal',
    `provider_story_id` VARCHAR(255) NULL,
    `external_id` VARCHAR(255) NULL,
    `license` VARCHAR(50) NOT NULL DEFAULT 'CC-BY-4.0',
    `author` VARCHAR(255) NULL,
    `illustrator` VARCHAR(255) NULL,
    `attribution` TEXT NULL,
    `source_url` TEXT NULL,
    `created_by_parent_id` INTEGER NULL,
    `created_for_child_id` INTEGER NULL,
    `cover_url` TEXT NULL,
    `word_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `stories_source_type_age_band_reading_level_idx`(`source_type`, `age_band`, `reading_level`),
    INDEX `stories_created_by_parent_id_idx`(`created_by_parent_id`),
    INDEX `stories_category_idx`(`category`),
    INDEX `stories_updated_at_idx`(`updated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `story_pages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `story_id` INTEGER NOT NULL,
    `page_index` INTEGER NOT NULL,
    `content` TEXT NOT NULL,

    INDEX `story_pages_story_id_idx`(`story_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `approvals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `child_id` INTEGER NOT NULL,
    `story_id` INTEGER NOT NULL,
    `is_approved` BOOLEAN NOT NULL DEFAULT false,
    `approved_by_parent_id` INTEGER NOT NULL,
    `is_favorite` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `approvals_child_id_is_approved_idx`(`child_id`, `is_approved`),
    INDEX `approvals_updated_at_idx`(`updated_at`),
    UNIQUE INDEX `approvals_child_id_story_id_key`(`child_id`, `story_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `approval_modes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `approval_id` INTEGER NOT NULL,
    `mode` VARCHAR(20) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `narrations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `story_id` INTEGER NOT NULL,
    `page_index` INTEGER NULL,
    `mode` VARCHAR(20) NOT NULL,
    `voice_id` VARCHAR(255) NOT NULL,
    `voice_name` VARCHAR(255) NULL,
    `audio_url` TEXT NULL,
    `audio_key` VARCHAR(255) NULL,
    `duration_sec` DOUBLE NOT NULL DEFAULT 0,
    `checksum` VARCHAR(255) NULL,
    `file_size_bytes` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `narrations_story_id_mode_voice_id_idx`(`story_id`, `mode`, `voice_id`),
    INDEX `narrations_story_id_page_index_idx`(`story_id`, `page_index`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `playback_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `child_id` INTEGER NOT NULL,
    `story_id` INTEGER NOT NULL,
    `last_page_index` INTEGER NOT NULL DEFAULT 0,
    `total_pages` INTEGER NOT NULL DEFAULT 1,
    `last_position_sec` DOUBLE NOT NULL DEFAULT 0,
    `total_listen_time_sec` DOUBLE NOT NULL DEFAULT 0,
    `total_read_time_sec` DOUBLE NOT NULL DEFAULT 0,
    `session_count` INTEGER NOT NULL DEFAULT 1,
    `is_completed` BOOLEAN NOT NULL DEFAULT false,
    `completed_at` DATETIME(3) NULL,
    `last_mode` VARCHAR(20) NOT NULL DEFAULT 'readAlone',
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `playback_sessions_child_id_updated_at_idx`(`child_id`, `updated_at`),
    UNIQUE INDEX `playback_sessions_child_id_story_id_key`(`child_id`, `story_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_stats` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` VARCHAR(10) NOT NULL,
    `stories_generated` INTEGER NOT NULL DEFAULT 0,
    `stories_opened` INTEGER NOT NULL DEFAULT 0,
    `tts_requests` INTEGER NOT NULL DEFAULT 0,
    `app_sessions` INTEGER NOT NULL DEFAULT 0,
    `platform_web` INTEGER NOT NULL DEFAULT 0,
    `platform_ios` INTEGER NOT NULL DEFAULT 0,
    `platform_android` INTEGER NOT NULL DEFAULT 0,
    `reading_level_beginner` INTEGER NOT NULL DEFAULT 0,
    `reading_level_intermediate` INTEGER NOT NULL DEFAULT 0,
    `reading_level_advanced` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `daily_stats_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `feature_flags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `description` TEXT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `feature_flags_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `voice_cache` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `provider` VARCHAR(20) NOT NULL,
    `cached_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `voice_cache_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `voice_cache_id` INTEGER NOT NULL,
    `voice_id` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `language` VARCHAR(50) NULL,
    `gender` VARCHAR(20) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `children` ADD CONSTRAINT `children_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `parents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `child_interests` ADD CONSTRAINT `child_interests_child_id_fkey` FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stories` ADD CONSTRAINT `stories_created_by_parent_id_fkey` FOREIGN KEY (`created_by_parent_id`) REFERENCES `parents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stories` ADD CONSTRAINT `stories_created_for_child_id_fkey` FOREIGN KEY (`created_for_child_id`) REFERENCES `children`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `story_pages` ADD CONSTRAINT `story_pages_story_id_fkey` FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `approvals` ADD CONSTRAINT `approvals_child_id_fkey` FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `approvals` ADD CONSTRAINT `approvals_story_id_fkey` FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `approvals` ADD CONSTRAINT `approvals_approved_by_parent_id_fkey` FOREIGN KEY (`approved_by_parent_id`) REFERENCES `parents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `approval_modes` ADD CONSTRAINT `approval_modes_approval_id_fkey` FOREIGN KEY (`approval_id`) REFERENCES `approvals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `narrations` ADD CONSTRAINT `narrations_story_id_fkey` FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `playback_sessions` ADD CONSTRAINT `playback_sessions_child_id_fkey` FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `playback_sessions` ADD CONSTRAINT `playback_sessions_story_id_fkey` FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `voice_cache_entries` ADD CONSTRAINT `voice_cache_entries_voice_cache_id_fkey` FOREIGN KEY (`voice_cache_id`) REFERENCES `voice_cache`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
