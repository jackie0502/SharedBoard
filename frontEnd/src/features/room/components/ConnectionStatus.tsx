import type { ConnectionStatus as ConnectionStatusValue } from "../types";

type ConnectionStatusProps = {
  status: ConnectionStatusValue;
  socketId: string | null;
};

const STATUS_LABELS: Record<ConnectionStatusValue, string> = {
  connected: "即時連線",
  connecting: "連線中",
  error: "連線失敗",
  disconnected: "已離線",
};

function ConnectionStatus({ status, socketId }: ConnectionStatusProps) {
  return (
    <div
      className={`mode-pill ${status}`}
      title={socketId ? `Socket ID：${socketId}` : "尚未取得 Socket ID"}
    >
      <span className="status-dot" />
      {STATUS_LABELS[status]}
    </div>
  );
}

export default ConnectionStatus;
