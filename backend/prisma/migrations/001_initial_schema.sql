-- ToggleTail — MySQL Initial Schema Migration
-- Generated from: backend/prisma/schema.prisma
--
-- USAGE:
--   Option A (recommended — let Prisma manage it):
--     npx prisma migrate dev --name init
--
--   Option B (manual — run this file directly in MySQL):
--     mysql -u <user> -p <database> < backend/prisma/migrations/001_initial_schema.sql
--
-- ASSUMPTIONS (update values in backend/.env before running):
--   DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE_NAME"
--   Default host : localhost
--   Default port : 3306
--   Default db   : toggletail
--
-- All tables use UTF-8 (utf8mb4) for full emoji/Unicode support.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- parents
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `parents` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `email`         VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `pin_hash`      VARCHAR(255)     NULL DEFAULT NULL,
  `created_at`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `parents_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- children
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `children` (
  `id`           INT         NOT NULL AUTO_INCREMENT,
  `parent_id`    INT         NOT NULL,
  `name`         VARCHAR(50) NOT NULL,
  `age`          TINYINT     NOT NULL,              -- valid range: 2-12
  `age_band`     VARCHAR(5)  NOT NULL DEFAULT '6-8',
  `reading_level`VARCHAR(20) NOT NULL DEFAULT 'Beginner',
  `avatar`       VARCHAR(20) NOT NULL DEFAULT 'Dino',
  `created_at`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `children_parent_id_idx` (`parent_id`),
  CONSTRAINT `fk_children_parent`
    FOREIGN KEY (`parent_id`) REFERENCES `parents` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- child_interests  (normalised from the interests[] array)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `child_interests` (
  `id`       INT         NOT NULL AUTO_INCREMENT,
  `child_id` INT         NOT NULL,
  `interest` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_child_interests_child`
    FOREIGN KEY (`child_id`) REFERENCES `children` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- stories
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `stories` (
  `id`                    INT          NOT NULL AUTO_INCREMENT,
  `title`                 VARCHAR(200) NOT NULL,
  `text`                  LONGTEXT     NOT NULL,
  `category`              VARCHAR(50)  NOT NULL DEFAULT 'General',
  `age_band`              VARCHAR(5)   NOT NULL DEFAULT 'all',
  `reading_level`         VARCHAR(20)  NOT NULL DEFAULT 'Beginner',
  `language`              VARCHAR(10)  NOT NULL DEFAULT 'en',
  `source_type`           VARCHAR(20)  NOT NULL,               -- library | parentCreated | aiGenerated
  `provider`              VARCHAR(20)  NOT NULL DEFAULT 'internal',
  `provider_story_id`     VARCHAR(255)     NULL DEFAULT NULL,
  `external_id`           VARCHAR(255)     NULL DEFAULT NULL,
  `license`               VARCHAR(50)  NOT NULL DEFAULT 'CC-BY-4.0',
  `author`                VARCHAR(255)     NULL DEFAULT NULL,
  `illustrator`           VARCHAR(255)     NULL DEFAULT NULL,
  `attribution`           TEXT             NULL DEFAULT NULL,
  `source_url`            TEXT             NULL DEFAULT NULL,
  `created_by_parent_id`  INT              NULL DEFAULT NULL,
  `created_for_child_id`  INT              NULL DEFAULT NULL,
  `cover_url`             TEXT             NULL DEFAULT NULL,
  `word_count`            INT          NOT NULL DEFAULT 0,
  `created_at`            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `stories_source_type_age_band_reading_level_idx` (`source_type`, `age_band`, `reading_level`),
  INDEX `stories_created_by_parent_id_idx` (`created_by_parent_id`),
  INDEX `stories_category_idx` (`category`),
  INDEX `stories_updated_at_idx` (`updated_at`),
  CONSTRAINT `fk_stories_parent`
    FOREIGN KEY (`created_by_parent_id`) REFERENCES `parents` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_stories_child`
    FOREIGN KEY (`created_for_child_id`) REFERENCES `children` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- story_pages  (normalised from the pages[] array)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `story_pages` (
  `id`         INT  NOT NULL AUTO_INCREMENT,
  `story_id`   INT  NOT NULL,
  `page_index` INT  NOT NULL,
  `content`    TEXT NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `story_pages_story_id_idx` (`story_id`),
  CONSTRAINT `fk_story_pages_story`
    FOREIGN KEY (`story_id`) REFERENCES `stories` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- approvals
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `approvals` (
  `id`                   INT         NOT NULL AUTO_INCREMENT,
  `child_id`             INT         NOT NULL,
  `story_id`             INT         NOT NULL,
  `is_approved`          TINYINT(1)  NOT NULL DEFAULT 0,
  `approved_by_parent_id`INT         NOT NULL,
  `is_favorite`          TINYINT(1)  NOT NULL DEFAULT 0,
  `created_at`           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `approvals_child_story_key` (`child_id`, `story_id`),
  INDEX `approvals_child_approved_idx` (`child_id`, `is_approved`),
  INDEX `approvals_updated_at_idx` (`updated_at`),
  CONSTRAINT `fk_approvals_child`
    FOREIGN KEY (`child_id`) REFERENCES `children` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_approvals_story`
    FOREIGN KEY (`story_id`) REFERENCES `stories` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_approvals_parent`
    FOREIGN KEY (`approved_by_parent_id`) REFERENCES `parents` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- approval_modes  (normalised from allowedModes[] array)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `approval_modes` (
  `id`          INT         NOT NULL AUTO_INCREMENT,
  `approval_id` INT         NOT NULL,
  `mode`        VARCHAR(20) NOT NULL,   -- nativeTTS | aiTTS | elevenlabs | readAlone
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_approval_modes_approval`
    FOREIGN KEY (`approval_id`) REFERENCES `approvals` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- narrations
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `narrations` (
  `id`             INT          NOT NULL AUTO_INCREMENT,
  `story_id`       INT          NOT NULL,
  `page_index`     INT              NULL DEFAULT NULL,
  `mode`           VARCHAR(20)  NOT NULL,
  `voice_id`       VARCHAR(255) NOT NULL,
  `voice_name`     VARCHAR(255)     NULL DEFAULT NULL,
  `audio_url`      TEXT             NULL DEFAULT NULL,
  `audio_key`      VARCHAR(255)     NULL DEFAULT NULL,
  `duration_sec`   DOUBLE       NOT NULL DEFAULT 0,
  `checksum`       VARCHAR(255)     NULL DEFAULT NULL,
  `file_size_bytes`INT          NOT NULL DEFAULT 0,
  `created_at`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `narrations_story_mode_voice_idx` (`story_id`, `mode`, `voice_id`),
  INDEX `narrations_story_page_idx` (`story_id`, `page_index`),
  CONSTRAINT `fk_narrations_story`
    FOREIGN KEY (`story_id`) REFERENCES `stories` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- playback_sessions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `playback_sessions` (
  `id`                    INT         NOT NULL AUTO_INCREMENT,
  `child_id`              INT         NOT NULL,
  `story_id`              INT         NOT NULL,
  `last_page_index`       INT         NOT NULL DEFAULT 0,
  `total_pages`           INT         NOT NULL DEFAULT 1,
  `last_position_sec`     DOUBLE      NOT NULL DEFAULT 0,
  `total_listen_time_sec` DOUBLE      NOT NULL DEFAULT 0,
  `total_read_time_sec`   DOUBLE      NOT NULL DEFAULT 0,
  `session_count`         INT         NOT NULL DEFAULT 1,
  `is_completed`          TINYINT(1)  NOT NULL DEFAULT 0,
  `completed_at`          DATETIME(3)     NULL DEFAULT NULL,
  `last_mode`             VARCHAR(20) NOT NULL DEFAULT 'readAlone',
  `started_at`            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `playback_child_story_key` (`child_id`, `story_id`),
  INDEX `playback_child_updated_idx` (`child_id`, `updated_at`),
  CONSTRAINT `fk_playback_child`
    FOREIGN KEY (`child_id`) REFERENCES `children` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_playback_story`
    FOREIGN KEY (`story_id`) REFERENCES `stories` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- daily_stats  (anonymous aggregate analytics — no PII)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `daily_stats` (
  `id`                        INT         NOT NULL AUTO_INCREMENT,
  `date`                      VARCHAR(10) NOT NULL,  -- YYYY-MM-DD
  `stories_generated`         INT         NOT NULL DEFAULT 0,
  `stories_opened`            INT         NOT NULL DEFAULT 0,
  `tts_requests`              INT         NOT NULL DEFAULT 0,
  `app_sessions`              INT         NOT NULL DEFAULT 0,
  `platform_web`              INT         NOT NULL DEFAULT 0,
  `platform_ios`              INT         NOT NULL DEFAULT 0,
  `platform_android`          INT         NOT NULL DEFAULT 0,
  `reading_level_beginner`    INT         NOT NULL DEFAULT 0,
  `reading_level_intermediate`INT         NOT NULL DEFAULT 0,
  `reading_level_advanced`    INT         NOT NULL DEFAULT 0,
  `created_at`                DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`                DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `daily_stats_date_key` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- feature_flags
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `feature_flags` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(100) NOT NULL,
  `enabled`     TINYINT(1)   NOT NULL DEFAULT 0,
  `description` TEXT             NULL DEFAULT NULL,
  `updated_at`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `feature_flags_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- voice_cache  (cached TTS voice listings)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `voice_cache` (
  `id`         INT         NOT NULL AUTO_INCREMENT,
  `provider`   VARCHAR(20) NOT NULL,
  `cached_at`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expires_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- voice_cache_entries
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `voice_cache_entries` (
  `id`             INT          NOT NULL AUTO_INCREMENT,
  `voice_cache_id` INT          NOT NULL,
  `voice_id`       VARCHAR(255) NOT NULL,
  `name`           VARCHAR(255) NOT NULL,
  `language`       VARCHAR(50)      NULL DEFAULT NULL,
  `gender`         VARCHAR(20)      NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_voice_cache_entries_cache`
    FOREIGN KEY (`voice_cache_id`) REFERENCES `voice_cache` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- Default feature flags seed
-- ─────────────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO `feature_flags` (`name`, `enabled`, `description`) VALUES
  ('aiStoriesEnabled',    1, 'Enable AI-generated stories via OpenAI'),
  ('ttsEnabled',          1, 'Enable ElevenLabs text-to-speech narration'),
  ('offlineModeEnabled',  1, 'Enable offline fallback to bundled story library');
