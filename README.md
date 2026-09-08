# SharedBoard

## PostgreSQL 開發環境

後端未設定 `DATABASE_URL` 時仍可用記憶體模式執行；設定後會在使用者首次進入
Room 時載入 Snapshot，並將操作以批次方式寫回 PostgreSQL。

每筆 Snapshot 都有遞增的 `revision`。如果另一個後端程序已先更新相同 Room，
舊的 Snapshot 會被拒絕，避免在不知情的情況下覆蓋新資料。一般連線或暫時性資料庫
錯誤會以指數退避方式自動重試。

### 1. 啟動 PostgreSQL

在專案根目錄執行：

```powershell
docker compose up -d postgres
docker compose ps
```

### 2. 建立後端環境變數

```powershell
Copy-Item BackEnd\.env.example BackEnd\.env
```

本機 Docker 預設連線：

```text
postgresql://sharedboard:sharedboard_dev@localhost:5432/sharedboard
```

正式環境應改用平台提供的 `DATABASE_URL` 和安全密碼；如果平台要求 SSL，設定：

```text
DATABASE_SSL=true
```

### 3. 啟動後端

```powershell
cd BackEnd
npm install
npm run dev
```

成功時會看到：

```text
PostgreSQL Snapshot 持久化已啟用
Server is running at http://localhost:3000
```

資料表會由後端自動建立，也可以手動執行
`BackEnd/sql/001_create_whiteboard_snapshots.sql`。既有資料庫可執行
`BackEnd/sql/002_add_snapshot_revision.sql`；新版後端啟動時也會自動補上欄位。
Room 管理資料表由 `BackEnd/sql/003_create_rooms.sql` 建立；後端也會自動執行
相同 migration，並把既有 Snapshot 對應的 Room 匯入列表。

### 4. 驗證永久保存

1. 進入一個 Room 並建立物件。
2. 等待至少一秒，讓 Snapshot 寫入 PostgreSQL。
3. 關閉並重新啟動後端。
4. 再次進入相同 Room，物件應由 PostgreSQL 恢復。

查看已保存的房間：

```powershell
docker compose exec postgres psql -U sharedboard -d sharedboard -c "SELECT room_id, revision, jsonb_array_length(objects) AS object_count, updated_at FROM whiteboard_snapshots;"
```

## Room 管理

前端首頁會顯示 Room List，白板網址格式為：

```text
/room/:roomId
```

Room REST API：

```text
GET    /api/rooms
GET    /api/rooms/:roomId
POST   /api/rooms
PATCH  /api/rooms/:roomId
DELETE /api/rooms/:roomId
```

直接以 Room ID 加入時，後端會自動建立不存在的 Room。仍有使用者在線的 Room
不能刪除；刪除離線 Room 時，其白板 Snapshot 會一併刪除。
