import type { WhiteboardObject } from "../../../types";

type ObjectInspectorProps = {
  selectedObject?: WhiteboardObject;
  onUpdateObject: (id: string, changes: Partial<WhiteboardObject>) => void;
};

const objectName = (type: WhiteboardObject["type"]) =>
  ({ rect: "矩形", circle: "圓形", text: "文字", stroke: "筆畫" })[type];

function ObjectInspector({ selectedObject, onUpdateObject }: ObjectInspectorProps) {
  return (
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
                onChange={(event) =>
                  onUpdateObject(selectedObject.id, { color: event.target.value })}
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
                onChange={(event) =>
                  onUpdateObject(selectedObject.id, {
                    strokeWidth: Number(event.target.value),
                  })}
              />
            </label>
          )}
          <label>
            X
            <input
              type="number"
              value={Math.round(selectedObject.x)}
              onChange={(event) =>
                onUpdateObject(selectedObject.id, { x: Number(event.target.value) })}
            />
          </label>
          <label>
            Y
            <input
              type="number"
              value={Math.round(selectedObject.y)}
              onChange={(event) =>
                onUpdateObject(selectedObject.id, { y: Number(event.target.value) })}
            />
          </label>
          <p className="version">版本 {selectedObject.version}</p>
        </div>
      ) : (
        <div className="no-selection">
          <span>◇</span>
          <p>尚未選取物件</p>
          <small>點擊畫布上的物件查看屬性</small>
        </div>
      )}
    </aside>
  );
}

export default ObjectInspector;
