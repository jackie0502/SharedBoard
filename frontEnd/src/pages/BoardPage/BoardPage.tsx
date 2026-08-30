import { useCallback, useEffect, useRef, useState } from "react";
import type Konva from "konva";
import BoardLayout from "../../layouts/BoardLayout";
import type { ConnectionStatus } from "../../features/room/types";
import {
  saveActiveRoom,
  saveLastRoom,
  type RoomCredentials,
} from "../../features/room/storage";
import BoardCanvas from "../../features/whiteboard/components/BoardCanvas";
import BoardHeader from "../../features/whiteboard/components/BoardHeader";
import ObjectInspector from "../../features/whiteboard/components/ObjectInspector";
import WhiteboardToolbar from "../../features/whiteboard/components/WhiteboardToolbar";
import WhiteboardObjectRenderer from "../../features/whiteboard/components/WhiteboardObjectRenderer";
import { useKeyboardShortcuts } from "../../features/whiteboard/hooks/useKeyboardShortcuts";
import { useStageSize } from "../../features/whiteboard/hooks/useStageSize";
import { socket } from "../../socket";
import type { Tool, WhiteboardObject } from "../../types";

type JoinResponse = {
  success: boolean;
  roomId?: string;
  socketId?: string;
  objects?: WhiteboardObject[];
  message: string;
};

type ObjectCreateResponse = {
  success: boolean;
  message: string;
};

type ObjectDeleteResponse = ObjectCreateResponse & {
  currentObject?: WhiteboardObject;
};

type Point = { x: number; y: number };

type BoardPageProps = {
  initialCredentials: RoomCredentials;
  onLeaveRoom: () => void;
};

function BoardPage({ initialCredentials, onLeaveRoom }: BoardPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingIdRef = useRef<string | null>(null);
  const drawingObjectRef = useRef<WhiteboardObject | null>(null);
  const eraserIdRef = useRef<string | null>(null);
  const eraserObjectRef = useRef<WhiteboardObject | null>(null);
  const lastEraserSyncRef = useRef(0);
  const lastDrawingSyncRef = useRef(0);
  const lastDragSyncRef = useRef<Map<string, number>>(new Map());
  const lastTransformSyncRef = useRef<Map<string, number>>(new Map());
  const transformBaseRef = useRef<Map<string, WhiteboardObject>>(new Map());
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const shapeDraftRef = useRef<WhiteboardObject | null>(null);
  const objectsRef = useRef<WhiteboardObject[]>([]);
  const joinedCredentialsRef = useRef<RoomCredentials | null>(initialCredentials);
  const stageSize = useStageSize(containerRef);
  const [tool, setTool] = useState<Tool>("select");
  const [objects, setObjects] = useState<WhiteboardObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawColor, setDrawColor] = useState("#202431");
  const [drawWidth, setDrawWidth] = useState(5);
  const [eraserSize, setEraserSize] = useState(32);
  const [eraserPosition, setEraserPosition] = useState<Point | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [socketId, setSocketId] = useState<string | null>(null);
  const [userName, setUserName] = useState(
    initialCredentials.userName,
  );
  const [roomId, setRoomId] = useState(
    initialCredentials.roomId,
  );
  const [joinedRoomId, setJoinedRoomId] = useState<string | null>(null);
  const [joinedUserName, setJoinedUserName] = useState<string | null>(null);
  const [roomMessage, setRoomMessage] = useState("請加入一個房間");

  const selectedObject = objects.find((object) => object.id === selectedId);

  const commitObjects = useCallback((
    updater: (current: WhiteboardObject[]) => WhiteboardObject[],
  ) => {
    const next = updater(objectsRef.current);
    objectsRef.current = next;
    setObjects(next);
  }, []);

  const applyRoomSnapshot = useCallback((
    credentials: RoomCredentials,
    response: JoinResponse,
    message = response.message,
  ) => {
    if (!response.success) {
      setRoomMessage(response.message);
      return;
    }

    joinedCredentialsRef.current = credentials;
    saveLastRoom(credentials);
    saveActiveRoom(credentials);
    setUserName(credentials.userName);
    setRoomId(credentials.roomId);
    setJoinedRoomId(credentials.roomId);
    setJoinedUserName(credentials.userName);
    setSelectedId(null);
    commitObjects(() => response.objects ?? []);
    setRoomMessage(message);
  }, [commitObjects]);

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
  }, [applyRoomSnapshot]);

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
  }, [commitObjects]);

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

  const syncObjectPosition = (
    id: string,
    x: number,
    y: number,
    force = false,
  ) => {
    const now = performance.now();
    const lastSync = lastDragSyncRef.current.get(id) ?? 0;

    if (!force && now - lastSync < 50) return;

    if (force) {
      lastDragSyncRef.current.delete(id);
    } else {
      lastDragSyncRef.current.set(id, now);
    }

    updateObject(id, { x, y });
  };

  const startObjectTransform = (id: string) => {
    const object = objectsRef.current.find((candidate) => candidate.id === id);
    if (!object) return;

    transformBaseRef.current.set(id, object);
    lastTransformSyncRef.current.delete(id);
  };

  const syncObjectTransform = (
    id: string,
    node: Konva.Node,
    force = false,
  ) => {
    const now = performance.now();
    const lastSync = lastTransformSyncRef.current.get(id) ?? 0;

    if (!force && now - lastSync < 50) return;

    const baseObject = transformBaseRef.current.get(id);
    const currentObject = objectsRef.current.find((object) => object.id === id);
    if (!baseObject || !currentObject) return;

    const width = Math.max(20, (baseObject.width ?? 100) * Math.abs(node.scaleX()));
    const height = Math.max(20, (baseObject.height ?? 100) * Math.abs(node.scaleY()));
    const updatedObject: WhiteboardObject = {
      ...currentObject,
      x: baseObject.type === "circle" ? node.x() - width / 2 : node.x(),
      y: baseObject.type === "circle" ? node.y() - height / 2 : node.y(),
      width,
      height,
      rotation: node.rotation(),
      version: currentObject.version + 1,
    };

    objectsRef.current = objectsRef.current.map((object) =>
      object.id === id ? updatedObject : object,
    );
    emitObjectUpdate(updatedObject);

    if (force) {
      lastTransformSyncRef.current.delete(id);
      transformBaseRef.current.delete(id);
      setObjects(objectsRef.current);
    } else {
      lastTransformSyncRef.current.set(id, now);
    }
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
    lastDrawingSyncRef.current = 0;
    setSelectedId(null);
    commitObjects((current) => [...current, nextStroke]);
    emitObjectCreate(nextStroke);
  };

  const continueDrawing = (stage: Konva.Stage) => {
    const id = drawingIdRef.current;
    const drawingObject = drawingObjectRef.current;
    const position = stage.getPointerPosition();
    if (!id || !drawingObject || !position) return;
    let nextStroke = {
      ...drawingObject,
      points: [...(drawingObject.points ?? []), position.x, position.y],
    };

    const now = performance.now();
    if (now - lastDrawingSyncRef.current >= 50) {
      nextStroke = { ...nextStroke, version: nextStroke.version + 1 };
      lastDrawingSyncRef.current = now;
      emitObjectUpdate(nextStroke);
    }

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
    lastDrawingSyncRef.current = 0;
    commitObjects((current) =>
      current.map((object) => object.id === id ? finishedStroke : object),
    );
    emitObjectUpdate(finishedStroke);
  };

  const startErasing = (stage: Konva.Stage) => {
    const position = stage.getPointerPosition();
    if (!position) return;
    const eraser: WhiteboardObject = {
      id: crypto.randomUUID(),
      type: "eraser",
      x: 0,
      y: 0,
      points: [position.x, position.y],
      strokeWidth: eraserSize,
      version: 1,
    };

    eraserIdRef.current = eraser.id;
    eraserObjectRef.current = eraser;
    lastEraserSyncRef.current = 0;
    setEraserPosition(position);
    setSelectedId(null);
    commitObjects((current) => [...current, eraser]);
    emitObjectCreate(eraser);
  };

  const continueErasing = (stage: Konva.Stage) => {
    const id = eraserIdRef.current;
    const currentEraser = eraserObjectRef.current;
    const position = stage.getPointerPosition();
    if (!position) return;

    setEraserPosition(position);
    if (!id || !currentEraser) return;

    let nextEraser: WhiteboardObject = {
      ...currentEraser,
      points: [...(currentEraser.points ?? []), position.x, position.y],
    };
    const now = performance.now();
    if (now - lastEraserSyncRef.current >= 50) {
      nextEraser = { ...nextEraser, version: nextEraser.version + 1 };
      lastEraserSyncRef.current = now;
      emitObjectUpdate(nextEraser);
    }

    eraserObjectRef.current = nextEraser;
    commitObjects((current) =>
      current.map((object) => object.id === id ? nextEraser : object),
    );
  };

  const finishErasing = () => {
    const id = eraserIdRef.current;
    const currentEraser = eraserObjectRef.current;
    if (!id || !currentEraser) return;

    const finishedEraser = {
      ...currentEraser,
      version: currentEraser.version + 1,
    };
    eraserIdRef.current = null;
    eraserObjectRef.current = null;
    lastEraserSyncRef.current = 0;
    commitObjects((current) =>
      current.map((object) => object.id === id ? finishedEraser : object),
    );
    emitObjectUpdate(finishedEraser);
  };

  const renderObject = (object: WhiteboardObject) => (
    <WhiteboardObjectRenderer
      key={object.id}
      object={object}
      tool={tool}
      onSelect={setSelectedId}
      onDragStart={(id) => lastDragSyncRef.current.delete(id)}
      onPositionChange={syncObjectPosition}
      onTransformStart={startObjectTransform}
      onTransform={syncObjectTransform}
      onUpdateObject={updateObject}
    />
  );

  const handleCanvasPointerDown = (stage: Konva.Stage) => {
    if (tool === "eraser") {
      startErasing(stage);
      return;
    }

    if (tool === "draw") {
      startDrawing(stage);
      return;
    }

    if (tool === "rect" || tool === "circle") {
      startShapePlacement(stage);
      return;
    }

    const position = stage.getPointerPosition();
    if (position) createObject(position.x, position.y);
  };

  const handleCanvasPointerMove = (stage: Konva.Stage) => {
    if (tool === "eraser") {
      continueErasing(stage);
      return;
    }
    if (tool === "draw") continueDrawing(stage);
    continueShapePlacement(stage);
  };

  const handleCanvasPointerUp = () => {
    finishErasing();
    finishDrawing();
    finishShapePlacement();
  };

  useKeyboardShortcuts({
    selectedId,
    onDelete: deleteObject,
    onToolChange: setTool,
    onClearSelection: () => setSelectedId(null),
  });

  return (
    <BoardLayout
      header={(
        <BoardHeader
          connectionStatus={connectionStatus}
          socketId={socketId}
          userName={userName}
          roomId={roomId}
          joinedUserName={joinedUserName}
          joinedRoomId={joinedRoomId}
          roomMessage={roomMessage}
          objectCount={objects.filter((object) => object.type !== "eraser").length}
          onLeaveRoom={onLeaveRoom}
          onUserNameChange={setUserName}
          onRoomIdChange={setRoomId}
          onJoinRoom={handleJoinRoom}
        />
      )}
      toolbar={(
        <WhiteboardToolbar
          tool={tool}
          selectedId={selectedId}
          drawColor={drawColor}
          drawWidth={drawWidth}
          eraserSize={eraserSize}
          onToolChange={setTool}
          onDrawColorChange={setDrawColor}
          onDrawWidthChange={setDrawWidth}
          onEraserSizeChange={setEraserSize}
          onDeleteSelected={() => {
            if (selectedId) deleteObject(selectedId);
          }}
        />
      )}
      canvas={(
        <BoardCanvas
          containerRef={containerRef}
          stageSize={stageSize}
          tool={tool}
          objects={objects}
          selectedId={selectedId}
          selectedObject={selectedObject}
          eraserSize={eraserSize}
          eraserPosition={eraserPosition}
          renderObject={renderObject}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
        />
      )}
      inspector={(
        <ObjectInspector
          selectedObject={selectedObject}
          onUpdateObject={updateObject}
        />
      )}
    />
  );
}

export default BoardPage;
