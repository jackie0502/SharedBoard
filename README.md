# SharedBoard

## PostgreSQL 開發環境

後端未設定 `DATABASE_URL` 時仍可用記憶體模式執行；設定後會在使用者首次進入
Room 時載入 Snapshot，並將操作以批次方式寫回 PostgreSQL。

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
`BackEnd/sql/001_create_whiteboard_snapshots.sql`。

### 4. 驗證永久保存

1. 進入一個 Room 並建立物件。
2. 等待至少一秒，讓 Snapshot 寫入 PostgreSQL。
3. 關閉並重新啟動後端。
4. 再次進入相同 Room，物件應由 PostgreSQL 恢復。

查看已保存的房間：

```powershell
docker compose exec postgres psql -U sharedboard -d sharedboard -c "SELECT room_id, jsonb_array_length(objects) AS object_count, updated_at FROM whiteboard_snapshots;"
```
