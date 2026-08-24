import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import { Ellipse, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import { socket } from "./socket";
import type { Tool, WhiteboardObject } from "./types";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";
type JoinResponse = {
  success: boolean;
  roomId?: string;
  socketId?: string;
  objects?: WhiteboardObject[];
  message: string;
};

type RoomCredentials = {
  roomId: string;
  userName: string;
};

type ObjectCreateResponse = {
  success: boolean;
  message: string;
};

type ObjectDeleteResponse = ObjectCreateResponse & {
  currentObject?: WhiteboardObject;
};

const ROOM_STORAGE_KEY = "sharedboard:last-room";

const loadStoredCredentials = (): RoomCredentials | null => {
  try {
    const saved = window.localStorage.getItem(ROOM_STORAGE_KEY);
    if (!saved) return null;
    const credentials = JSON.parse(saved) as Partial<RoomCredentials>;
    return typeof credentials.roomId === "string" && typeof credentials.userName === "string"
      ? { roomId: credentials.roomId, userName: credentials.userName }
      : null;
  } catch {
    return null;
  }
};

const TOOL_LABELS: { tool: Tool; icon: string; label: string; shortcut: string }[] = [
  { tool: "select", icon: "↖", label: "選取", shortcut: "V" },
  { tool: "rect", icon: "□", label: "矩形", shortcut: "R" },
  { tool: "circle", icon: "○", label: "圓形", shortcut: "C" },
  { tool: "text", icon: "T", label: "文字", shortcut: "T" },
  { tool: "draw", icon: "✎", label: "畫筆", shortcut: "P" },
];

const objectName = (type: WhiteboardObject["type"]) =>
  ({ rect: "矩形", circle: "圓形", text: "文字", stroke: "筆畫" })[type];

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const drawingIdRef = useRef<string | null>(null);
  const drawingObjectRef = useRef<WhiteboardObject | null>(null);
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const shapeDraftRef = useRef<WhiteboardObject | null>(null);
  const objectsRef = useRef<WhiteboardObject[]>([]);
  const joinedCredentialsRef = useRef<RoomCredentials | null>(loadStoredCredentials());
  const [stageSize, setStageSize] = useState({ width: 900, height: 620 });
  const [tool, setTool] = useState<Tool>("select");
  const [objects, setObjects] = useState<WhiteboardObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawColor, setDrawColor] = useState("#202431");
  const [drawWidth, setDrawWidth] = useState(5);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [socketId, setSocketId] = useState<string | null>(null);
  const [userName, setUserName] = useState(
    joinedCredentialsRef.current?.userName ?? "Person B",
  );
  const [roomId, setRoomId] = useState(
    joinedCredentialsRef.current?.roomId ?? "room-001",
  );
  const [joinedRoomId, setJoinedRoomId] = useState<string | null>(null);
  const [joinedUserName, setJoinedUserName] = useState<string | null>(null);
  const [roomMessage, setRoomMessage] = useState("請加入一個房間");

  const selectedObject = objects.find((object) => object.id === selectedId);

  const commitObjects = (
    updater: (current: WhiteboardObject[]) => WhiteboardObject[],
  ) => {
    const next = updater(objectsRef.current);
    objectsRef.current = next;
    setObjects(next);
  };

  const applyRoomSnapshot = (
    credentials: RoomCredentials,
    response: JoinResponse,
    message = response.message,
  ) => {
    if (!response.success) {
      setRoomMessage(response.message);
      return;
    }

    joinedCredentialsRef.current = credentials;
    window.localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify(credentials));
    setUserName(credentials.userName);
    setRoomId(credentials.roomId);
    setJoinedRoomId(credentials.roomId);
    setJoinedUserName(credentials.userName);
    setSelectedId(null);
    commitObjects(() => response.objects ?? []);
    setRoomMessage(message);
  };

  useEffect(() => {
    const handleConnect = () => {
      setConnectionStatus("connected");
      setSocketId(socket.id ?? null);

      const credentials = joinedCredentialsRef.current;
      if (credentials) {
        socket.emit("room:join", credentials, (response: JoinResponse) => {
          applyRoomSnapshot(credentials, response, `已重新加入 ${credentials.roomId}`);
        });
      }
    };

    const handleDisconnect = () => {
      setConnectionStatus("disconnected");
      setSocketId(null);
      if (joinedCredentialsRef.current) setRoomMessage("連線中斷，等待自動重新加入");
    };

    const handleConnectError = (error: Error) => {
      console.error("Socket.IO 連線失敗：", error.message);
      setConnectionStatus("error");
      setSocketId(null);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    setConnectionStatus("connecting");
    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleUserJoined = (data: { userName: string }) => {
      setRoomMessage(`${data.userName} 加入了房間`);
    };

    const handleUserLeft = (data: { userName: string }) => {
      setRoomMessage(`${data.userName} 離開了房間`);
    };

    const handleObjectCreate = (data: { object: WhiteboardObject; userName: string }) => {
      commitObjects((current) =>
        current.some((object) => object.id === data.object.id)
          ? current
          : [...current, data.object],
      );
      setRoomMessage(`${data.userName} 建立了一個物件`);
    };

    const handleObjectUpdate = (data: { object: WhiteboardObject; userName: string }) => {
      commitObjects((current) =>
        current.map((object) =>
          object.id === data.object.id && data.object.version > object.version
            ? data.object
            : object,
        ),
      );
      setRoomMessage(`${data.userName} 更新了一個物件`);
    };

    const handleObjectDelete = (data: { objectId: string; userName: string }) => {
      commitObjects((current) =>
        current.filter((object) => object.id !== data.objectId),
      );
      setSelectedId((current) => current === data.objectId ? null : current);
      setRoomMessage(`${data.userName} 刪除了一個物件`);
    };

    socket.on("user:joined", handleUserJoined);
    socket.on("user:left", handleUserLeft);
    socket.on("object:create", handleObjectCreate);
    socket.on("object:update", handleObjectUpdate);
    socket.on("object:delete", handleObjectDelete);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("user:left", handleUserLeft);
      socket.off("object:create", handleObjectCreate);
      socket.off("object:update", handleObjectUpdate);
      socket.off("object:delete", handleObjectDelete);
    };
  }, []);

  const handleJoinRoom = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextUserName = userName.trim();
    const nextRoomId = roomId.trim();

    if (!nextUserName || !nextRoomId) {
      setRoomMessage("使用者名稱和 Room ID 都不能空白");
      return;
    }

    if (!socket.connected) {
      setRoomMessage("尚未連上伺服器，請稍後再試");
      return;
    }

    setRoomMessage("正在加入房間…");
    socket.emit(
      "room:join",
      { roomId: nextRoomId, userName: nextUserName },
      (response: JoinResponse) => {
        applyRoomSnapshot(
          { roomId: nextRoomId, userName: nextUserName },
          response,
        );
      },
    );
  };

  useEffect(() => {
    const resize = () => {
      if (!containerRef.current) return;
      setStageSize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = transformer?.getStage();
    const node = selectedId ? stage?.findOne(`#${selectedId}`) : undefined;
    transformer?.nodes(node ? [node] : []);
    transformer?.getLayer()?.batchDraw();
  }, [selectedId, objects]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        event.preventDefault();
        deleteObject(selectedId);
        return;
      }
      if (event.target instanceof HTMLInputElement) return;
      const shortcuts: Record<string, Tool> = { v: "select", r: "rect", c: "circle", t: "text", p: "draw" };
      const nextTool = shortcuts[event.key.toLowerCase()];
      if (nextTool) setTool(nextTool);
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId]);

  const emitObjectUpdate = (object: WhiteboardObject) => {
    if (!joinedCredentialsRef.current || !socket.connected) {
      setRoomMessage("尚未加入房間，變更只保留在本機");
      return;
    }

    socket.emit(
      "object:update",
      { object },
      (response: ObjectCreateResponse) => {
        if (!response.success) setRoomMessage(response.message);
      },
    );
  };

  const updateObject = (id: string, changes: Partial<WhiteboardObject>) => {
    const currentObject = objectsRef.current.find((object) => object.id === id);
    if (!currentObject) return;

    const updatedObject = {
      ...currentObject,
      ...changes,
      id: currentObject.id,
      type: currentObject.type,
      version: currentObject.version + 1,
    };

    commitObjects((current) =>
      current.map((object) => object.id === id ? updatedObject : object),
    );
    emitObjectUpdate(updatedObject);
  };

  const deleteObject = (id: string) => {
    const objectToDelete = objectsRef.current.find((object) => object.id === id);
    if (!objectToDelete) return;

    commitObjects((current) => current.filter((object) => object.id !== id));
    setSelectedId(null);

    if (!joinedCredentialsRef.current || !socket.connected) {
      setRoomMessage("尚未加入房間，刪除只套用在本機");
      return;
    }

    socket.emit(
      "object:delete",
      {
        objectId: id,
        version: objectToDelete.version + 1,
      },
      (response: ObjectDeleteResponse) => {
        if (response.success) return;

        setRoomMessage(response.message);
        if (!response.currentObject) return;
        commitObjects((current) =>
          current.some((object) => object.id === id)
            ? current
            : [...current, response.currentObject!],
        );
      },
    );
  };

  const emitObjectCreate = (object: WhiteboardObject) => {
    if (!joinedCredentialsRef.current || !socket.connected) {
      setRoomMessage("尚未加入房間，物件只建立在本機");
      return;
    }

    socket.emit(
      "object:create",
      { object },
      (response: ObjectCreateResponse) => {
        if (!response.success) setRoomMessage(response.message);
      },
    );
  };

  const createObject = (x: number, y: number) => {
    if (tool === "select") {
      setSelectedId(null);
      return;
    }
    if (tool !== "text") return;

    const id = crypto.randomUUID();
    const common = { id, x, y, version: 1 };
    const next: WhiteboardObject = {
      ...common,
      type: "text",
      width: 180,
      height: 44,
      text: "雙擊編輯文字",
      color: "#202431",
    };
    commitObjects((current) => [...current, next]);
    emitObjectCreate(next);
    setSelectedId(id);
    setTool("select");
  };

  const startShapePlacement = (stage: Konva.Stage) => {
    if (tool !== "rect" && tool !== "circle") return;
    const position = stage.getPointerPosition();
    if (!position) return;

    const draft: WhiteboardObject = {
      id: crypto.randomUUID(),
      type: tool,
      x: position.x,
      y: position.y,
      width: 0,
      height: 0,
      color: tool === "rect" ? "#8b5cf6" : "#22c55e",
      version: 1,
    };

    shapeStartRef.current = position;
    shapeDraftRef.current = draft;
    setSelectedId(null);
    commitObjects((current) => [...current, draft]);
  };

  const continueShapePlacement = (stage: Konva.Stage) => {
    const start = shapeStartRef.current;
    const draft = shapeDraftRef.current;
    const position = stage.getPointerPosition();
    if (!start || !draft || !position) return;

    const nextDraft: WhiteboardObject = {
      ...draft,
      x: Math.min(start.x, position.x),
      y: Math.min(start.y, position.y),
      width: Math.abs(position.x - start.x),
      height: Math.abs(position.y - start.y),
    };

    shapeDraftRef.current = nextDraft;
    commitObjects((current) =>
      current.map((object) => object.id === draft.id ? nextDraft : object),
    );
  };

  const finishShapePlacement = () => {
    const draft = shapeDraftRef.current;
    if (!draft) return;

    const finishedShape: WhiteboardObject = {
      ...draft,
      width: Math.max(10, draft.width ?? 0),
      height: Math.max(10, draft.height ?? 0),
    };

    shapeStartRef.current = null;
    shapeDraftRef.current = null;
    commitObjects((current) =>
      current.map((object) => object.id === draft.id ? finishedShape : object),
    );
    emitObjectCreate(finishedShape);
    setSelectedId(finishedShape.id);
    setTool("select");
  };

  const startDrawing = (stage: Konva.Stage) => {
    const position = stage.getPointerPosition();
    if (!position) return;
    const id = crypto.randomUUID();
    const nextStroke: WhiteboardObject = {
      id,
      type: "stroke",
      x: 0,
      y: 0,
      points: [position.x, position.y],
      color: drawColor,
      strokeWidth: drawWidth,
      version: 1,
    };
    drawingIdRef.current = id;
    drawingObjectRef.current = nextStroke;
    setSelectedId(null);
    commitObjects((current) => [...current, nextStroke]);
  };

  const continueDrawing = (stage: Konva.Stage) => {
    const id = drawingIdRef.current;
    const drawingObject = drawingObjectRef.current;
    const position = stage.getPointerPosition();
    if (!id || !drawingObject || !position) return;
    const nextStroke = {
      ...drawingObject,
      points: [...(drawingObject.points ?? []), position.x, position.y],
    };
    drawingObjectRef.current = nextStroke;
    commitObjects((current) =>
      current.map((object) =>
        object.id === id ? nextStroke : object,
      ),
    );
  };

  const finishDrawing = () => {
    const id = drawingIdRef.current;
    const drawingObject = drawingObjectRef.current;
    if (!id || !drawingObject) return;
    const finishedStroke = { ...drawingObject, version: drawingObject.version + 1 };
    drawingIdRef.current = null;
    drawingObjectRef.current = null;
    commitObjects((current) =>
      current.map((object) => object.id === id ? finishedStroke : object),
    );
    emitObjectCreate(finishedStroke);
  };

  const renderObject = (object: WhiteboardObject) => {
    const shared = {
      id: object.id,
      key: object.id,
      x: object.x,
      y: object.y,
      draggable: tool === "select",
      onClick: (event: Konva.KonvaEventObject<MouseEvent>) => {
        event.cancelBubble = true;
        setSelectedId(object.id);
      },
      onTap: (event: Konva.KonvaEventObject<TouchEvent>) => {
        event.cancelBubble = true;
        setSelectedId(object.id);
      },
      onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) =>
        updateObject(object.id, { x: event.target.x(), y: event.target.y() }),
      onTransformEnd: (event: Konva.KonvaEventObject<Event>) => {
        const node = event.target;
        const width = Math.max(20, (object.width ?? 100) * node.scaleX());
        const height = Math.max(20, (object.height ?? 100) * node.scaleY());
        node.scaleX(1);
        node.scaleY(1);
        updateObject(object.id, { x: node.x(), y: node.y(), width, height, rotation: node.rotation() });
      },
    };

    if (object.type === "rect") {
      return <Rect {...shared} width={object.width} height={object.height} fill={object.color ?? "#8b5cf6"} cornerRadius={12} shadowColor="#5b21b6" shadowBlur={12} shadowOpacity={0.16} />;
    }
    if (object.type === "circle") {
      const width = object.width ?? 120;
      const height = object.height ?? 120;
      return (
        <Ellipse
          {...shared}
          x={object.x + width / 2}
          y={object.y + height / 2}
          radiusX={width / 2}
          radiusY={height / 2}
          fill={object.color ?? "#22c55e"}
          shadowColor="#15803d"
          shadowBlur={12}
          shadowOpacity={0.16}
          onDragEnd={(event) =>
            updateObject(object.id, {
              x: event.target.x() - width / 2,
              y: event.target.y() - height / 2,
            })
          }
          onTransformEnd={(event) => {
            const node = event.target;
            const nextWidth = Math.max(20, width * node.scaleX());
            const nextHeight = Math.max(20, height * node.scaleY());
            node.scaleX(1);
            node.scaleY(1);
            updateObject(object.id, {
              x: node.x() - nextWidth / 2,
              y: node.y() - nextHeight / 2,
              width: nextWidth,
              height: nextHeight,
              rotation: node.rotation(),
            });
          }}
        />
      );
    }
    if (object.type === "text") {
      return (
        <Text
          {...shared}
          text={object.text}
          width={object.width}
          height={object.height}
          fontSize={24}
          fontFamily="system-ui, sans-serif"
          fill={object.color ?? "#202431"}
          verticalAlign="middle"
          onDblClick={() => {
            const value = window.prompt("請輸入文字", object.text);
            if (value !== null && value.trim()) updateObject(object.id, { text: value.trim() });
          }}
        />
      );
    }
    if (object.type === "stroke") {
      return (
        <Line
          {...shared}
          points={object.points ?? []}
          stroke={object.color ?? "#202431"}
          strokeWidth={object.strokeWidth ?? 5}
          lineCap="round"
          lineJoin="round"
          tension={0.25}
          hitStrokeWidth={Math.max(12, object.strokeWidth ?? 5)}
        />
      );
    }
    return null;
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">S</span><span>SharedBoard</span></div>
        <div className="realtime-controls">
          <div
            className={`mode-pill ${connectionStatus}`}
            title={socketId ? `Socket ID：${socketId}` : "尚未取得 Socket ID"}
          >
            <span className="status-dot" />
            {connectionStatus === "connected"
              ? "即時連線"
              : connectionStatus === "connecting"
                ? "連線中"
                : connectionStatus === "error"
                  ? "連線失敗"
                  : "已離線"}
          </div>
          <form className="room-form" onSubmit={handleJoinRoom}>
            <input
              aria-label="使用者名稱"
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              placeholder="使用者名稱"
              maxLength={30}
            />
            <input
              aria-label="Room ID"
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
              placeholder="Room ID"
              maxLength={50}
            />
            <button type="submit" disabled={connectionStatus !== "connected"}>
              {joinedRoomId ? "切換房間" : "加入房間"}
            </button>
          </form>
          <span className="room-message" title={roomMessage}>
            {joinedRoomId ? `${joinedUserName} · ${joinedRoomId}` : roomMessage}
          </span>
        </div>
        <div className="object-count">{objects.length} 個物件</div>
      </header>

      <section className="workspace">
        <aside className="toolbar" aria-label="白板工具列">
          {TOOL_LABELS.map((item) => (
            <button
              className={tool === item.tool ? "tool active" : "tool"}
              key={item.tool}
              onClick={() => setTool(item.tool)}
              title={`${item.label} (${item.shortcut})`}
            >
              <span className="tool-icon">{item.icon}</span><span>{item.label}</span><kbd>{item.shortcut}</kbd>
            </button>
          ))}
          {tool === "draw" && (
            <div className="draw-controls">
              <label title="畫筆顏色">
                顏色
                <input type="color" value={drawColor} onChange={(event) => setDrawColor(event.target.value)} />
              </label>
              <label title="畫筆粗細">
                粗細 <strong>{drawWidth}</strong>
                <input type="range" min="1" max="30" value={drawWidth} onChange={(event) => setDrawWidth(Number(event.target.value))} />
              </label>
            </div>
          )}
          <div className="toolbar-divider" />
          <button
            className="tool danger"
            disabled={!selectedId}
            onClick={() => {
              if (selectedId) deleteObject(selectedId);
            }}
          ><span className="tool-icon">⌫</span><span>刪除</span><kbd>Del</kbd></button>
        </aside>

        <div className="board-wrap" ref={containerRef}>
          {objects.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">✦</div>
              <h1>開始你的白板</h1>
              <p>從左側選擇一個工具，然後點擊畫布建立物件。</p>
            </div>
          )}
          <Stage
            width={stageSize.width}
            height={stageSize.height}
            onMouseDown={(event) => {
              if (event.target !== event.target.getStage()) return;
              if (tool === "draw") {
                startDrawing(event.target.getStage()!);
                return;
              }
              if (tool === "rect" || tool === "circle") {
                startShapePlacement(event.target.getStage()!);
                return;
              }
              const position = event.target.getStage()?.getPointerPosition();
              if (position) createObject(position.x, position.y);
            }}
            onMouseMove={(event) => {
              if (tool === "draw") continueDrawing(event.target.getStage()!);
              continueShapePlacement(event.target.getStage()!);
            }}
            onMouseUp={() => {
              finishDrawing();
              finishShapePlacement();
            }}
            onMouseLeave={() => {
              finishDrawing();
              finishShapePlacement();
            }}
            onTouchStart={(event) => {
              if (event.target !== event.target.getStage()) return;
              if (tool === "draw") {
                startDrawing(event.target.getStage()!);
                return;
              }
              if (tool === "rect" || tool === "circle") {
                startShapePlacement(event.target.getStage()!);
                return;
              }
              const position = event.target.getStage()?.getPointerPosition();
              if (position) createObject(position.x, position.y);
            }}
            onTouchMove={(event) => {
              if (tool === "draw") continueDrawing(event.target.getStage()!);
              continueShapePlacement(event.target.getStage()!);
            }}
            onTouchEnd={() => {
              finishDrawing();
              finishShapePlacement();
            }}
          >
            <Layer>
              {objects.map(renderObject)}
              <Transformer
                ref={transformerRef}
                rotateEnabled={selectedObject?.type !== "stroke"}
                resizeEnabled={selectedObject?.type !== "stroke"}
                flipEnabled={false}
                borderStroke="#6d4aff"
                anchorFill="#ffffff"
                anchorStroke="#6d4aff"
                anchorSize={9}
                boundBoxFunc={(oldBox, newBox) =>
                  Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20 ? oldBox : newBox
                }
              />
            </Layer>
          </Stage>
          <div className="board-hint">
            {tool === "select"
              ? "點選物件進行移動或縮放"
              : tool === "rect" || tool === "circle"
                ? `在畫布上拖曳以建立${TOOL_LABELS.find((item) => item.tool === tool)?.label}`
                : `點擊畫布建立${TOOL_LABELS.find((item) => item.tool === tool)?.label}`}
          </div>
        </div>

        <aside className="inspector">
          <h2>屬性</h2>
          {selectedObject ? (
            <div className="property-card">
              <span className="type-badge">{objectName(selectedObject.type)}</span>
              <label className="color-property">
                顏色
                <span className="color-input-wrap">
                  <input
                    type="color"
                    value={selectedObject.color ?? "#202431"}
                    onChange={(event) => updateObject(selectedObject.id, { color: event.target.value })}
                  />
                  <code>{selectedObject.color ?? "#202431"}</code>
                </span>
              </label>
              {selectedObject.type === "stroke" && (
                <label className="width-property">
                  粗細 <strong>{selectedObject.strokeWidth ?? 5}</strong>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={selectedObject.strokeWidth ?? 5}
                    onChange={(event) => updateObject(selectedObject.id, { strokeWidth: Number(event.target.value) })}
                  />
                </label>
              )}
              <label>X<input type="number" value={Math.round(selectedObject.x)} onChange={(e) => updateObject(selectedObject.id, { x: Number(e.target.value) })} /></label>
              <label>Y<input type="number" value={Math.round(selectedObject.y)} onChange={(e) => updateObject(selectedObject.id, { y: Number(e.target.value) })} /></label>
              <p className="version">版本 {selectedObject.version}</p>
            </div>
          ) : (
            <div className="no-selection"><span>◇</span><p>尚未選取物件</p><small>點擊畫布上的物件查看屬性</small></div>
          )}
        </aside>
      </section>
    </main>
  );
}

export default App;
