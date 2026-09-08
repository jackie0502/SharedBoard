const parsePositiveInteger = (value, fallback) => {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

class PersistenceConfig {
    constructor({ enabled, storeOptions, repositoryOptions }) {
        this.enabled = enabled;
        this.storeOptions = Object.freeze(storeOptions);
        this.repositoryOptions = Object.freeze(repositoryOptions);
        Object.freeze(this);
    }

    static fromEnvironment(env = process.env) {
        return new PersistenceConfig({
            enabled: Boolean(env.DATABASE_URL),
            storeOptions: {
                connectionString: env.DATABASE_URL,
                ssl: env.DATABASE_SSL === "true",
                connectionTimeoutMillis: parsePositiveInteger(
                    env.DATABASE_CONNECTION_TIMEOUT_MS,
                    5000,
                ),
            },
            repositoryOptions: {
                saveIntervalMs: parsePositiveInteger(
                    env.SNAPSHOT_SAVE_INTERVAL_MS,
                    1000,
                ),
                retryBaseMs: parsePositiveInteger(
                    env.SNAPSHOT_RETRY_BASE_MS,
                    1000,
                ),
                retryMaxMs: parsePositiveInteger(
                    env.SNAPSHOT_RETRY_MAX_MS,
                    30_000,
                ),
                shutdownFlushAttempts: parsePositiveInteger(
                    env.SNAPSHOT_SHUTDOWN_FLUSH_ATTEMPTS,
                    3,
                ),
            },
        });
    }
}

module.exports = { PersistenceConfig };
