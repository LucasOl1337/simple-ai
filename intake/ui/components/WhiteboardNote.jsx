import DraggableCard from "./DraggableCard";

export default function WhiteboardNote({
  items,
  layoutId,
  onPositionChange,
  positions,
  title,
  tone = "plain",
  defaultPosition,
}) {
  return (
    <DraggableCard
      className={`whiteboard-note whiteboard-note-${tone}`}
      defaultPosition={defaultPosition}
      layoutId={layoutId}
      onPositionChange={onPositionChange}
      positions={positions}
    >
      <span>{title}</span>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </DraggableCard>
  );
}
