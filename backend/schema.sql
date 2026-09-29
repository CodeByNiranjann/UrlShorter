CREATE DATABASE IF NOT EXISTS url_shortener
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE url_shortener;

CREATE TABLE IF NOT EXISTS short_links (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code         VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    original_url TEXT NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_short_links_code (code)
);

CREATE TABLE IF NOT EXISTS clicks (
    id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    short_code VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    referrer   VARCHAR(2048) NOT NULL DEFAULT 'Direct',
    clicked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_clicks_code_clicked_at (short_code, clicked_at),

    CONSTRAINT fk_clicks_short_code
        FOREIGN KEY (short_code)
        REFERENCES short_links (code)
        ON DELETE CASCADE
);