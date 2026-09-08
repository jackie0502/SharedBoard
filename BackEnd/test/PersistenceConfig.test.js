const test = require("node:test");
const assert = require("node:assert/strict");

const { PersistenceConfig } = require("../src/config/PersistenceConfig");

test("未設定 DATABASE_URL 時停用 PostgreSQL", () => {
    const config = PersistenceConfig.fromEnvironment({});

    assert.equal(config.enabled, false);
    assert.equal(config.repositoryOptions.saveIntervalMs, 1000);
});

test("PersistenceConfig 解析有效數值並讓無效值回復預設值", () => {
    const config = PersistenceConfig.fromEnvironment({
        DATABASE_URL: "postgresql://example/database",
        DATABASE_SSL: "true",
        DATABASE_CONNECTION_TIMEOUT_MS: "2500",
        SNAPSHOT_SAVE_INTERVAL_MS: "500",
        SNAPSHOT_RETRY_BASE_MS: "invalid",
        SNAPSHOT_RETRY_MAX_MS: "-1",
        SNAPSHOT_SHUTDOWN_FLUSH_ATTEMPTS: "5",
    });

    assert.equal(config.enabled, true);
    assert.deepEqual(config.storeOptions, {
        connectionString: "postgresql://example/database",
        ssl: true,
        connectionTimeoutMillis: 2500,
    });
    assert.deepEqual(config.repositoryOptions, {
        saveIntervalMs: 500,
        retryBaseMs: 1000,
        retryMaxMs: 30_000,
        shutdownFlushAttempts: 5,
    });
    assert.equal(Object.isFrozen(config), true);
});
