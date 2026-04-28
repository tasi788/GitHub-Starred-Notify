CREATE TABLE IF NOT EXISTS watches (
    repo TEXT NOT NULL,
    chat_id TEXT NOT NULL,
    PRIMARY KEY (repo, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_watches_repo ON watches(repo);

CREATE TABLE IF NOT EXISTS stargazers (
    repo TEXT NOT NULL,
    user_id TEXT NOT NULL,
    login TEXT NOT NULL,
    PRIMARY KEY (repo, user_id)
);

CREATE INDEX IF NOT EXISTS idx_stargazers_repo ON stargazers(repo);
