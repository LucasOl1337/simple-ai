import DraggableCard from "./DraggableCard";

export default function BrowserPreviewPanel({ siteUrl, onPositionChange, positions }) {
  if (!siteUrl) return null;
  return (
    <DraggableCard
      className="preview-card"
      defaultPosition={{ x: 34, y: 60 }}
      layoutId="preview"
      onPositionChange={onPositionChange}
      positions={positions}
    >
      <div className="preview-chrome" aria-label="Preview do site gerado">
        <div className="preview-toolbar">
          <span className="traffic-dot danger" />
          <span className="traffic-dot wait" />
          <span className="traffic-dot live" />
          <div className="preview-url">{siteUrl}</div>
        </div>
        <iframe className="preview-frame" src={siteUrl} title="Site gerado pelo Simple-AI" />
      </div>
    </DraggableCard>
  );
}
