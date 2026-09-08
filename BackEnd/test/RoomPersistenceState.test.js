const test = require("node:test");
const assert = require("node:assert/strict");

const { RoomPersistenceState } = require("../src/repositories/RoomPersistenceState");

test("保存進行期間出現新變更時 Room 仍維持 dirty", () => {
    const state = new RoomPersistenceState("room-1");
    state.markLoaded(3);
    state.markDirty();
    const savingSequence = state.captureChangeSequence();

    state.markDirty();
    state.markSaveSucceeded(savingSequence, 4);

    assert.equal(state.persistedRevision, 4);
    assert.equal(state.isDirty, true);
});

test("成功保存最新變更後會清除 retry 與 conflict 狀態", () => {
    const state = new RoomPersistenceState("room-1");
    state.markDirty();
    state.markSaveFailed();
    state.markConflicted();

    state.markSaveSucceeded(state.captureChangeSequence(), 1);

    assert.equal(state.isDirty, false);
    assert.equal(state.retryAttempts, 0);
    assert.equal(state.conflicted, false);
});
