import { useRef } from "react";
import { isInteractiveTarget, clampPosition } from "../utils";

export default function DraggableCard({
  children,
  className,
  defaultPosition,
  layoutId,
  onPositionChange,
  positions,
  ...props
}) {
  const cardRef = useRef(null);
  const dragRef = useRef(null);
  const position = positions[layoutId] ?? defaultPosition;

  function handlePointerDown(event) {
    if (event.button !== 0 || isInteractiveTarget(event.target)) return;
    const card = cardRef.current;
    const board = card?.parentElement;
    if (!card || !board) return;
    const boardRect = board.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: cardRect.left - boardRect.left,
      originY: cardRect.top - boardRect.top,
      maxX: board.clientWidth - card.offsetWidth,
      maxY: board.clientHeight - card.offsetHeight,
    };
    card.setPointerCapture(event.pointerId);
    card.classList.add("is-dragging");
  }

  function handlePointerMove(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const nextX = clampPosition(drag.originX + event.clientX - drag.startX, 0, drag.maxX);
    const nextY = clampPosition(drag.originY + event.clientY - drag.startY, 0, drag.maxY);
    onPositionChange(layoutId, { x: Math.round(nextX), y: Math.round(nextY) });
  }

  function handlePointerUp(event) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    cardRef.current?.classList.remove("is-dragging");
    dragRef.current = null;
  }

  function handleKeyDown(event) {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const card = cardRef.current;
    const board = card?.parentElement;
    if (!card || !board) return;
    event.preventDefault();
    const step = event.shiftKey ? 40 : 12;
    const delta = {
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
    }[event.key];
    onPositionChange(layoutId, {
      x: Math.round(clampPosition(position.x + delta.x, 0, board.clientWidth - card.offsetWidth)),
      y: Math.round(clampPosition(position.y + delta.y, 0, board.clientHeight - card.offsetHeight)),
    });
  }

  return (
    <article
      {...props}
      aria-label={props["aria-label"] ?? "Cartão móvel da lousa"}
      className={`${className} draggable-card`}
      onKeyDown={handleKeyDown}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={cardRef}
      style={{ left: position.x, top: position.y }}
      tabIndex={0}
    >
      {children}
    </article>
  );
}
