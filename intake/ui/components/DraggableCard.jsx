import { useEffect, useRef } from "react";
import { isInteractiveTarget, clampPosition } from "../utils";

const RESIZE_HANDLE_SIZE = 18;

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

  function handleMouseDown(event) {
    if (event.button !== 0 || isInteractiveTarget(event.target)) return;
    const card = cardRef.current;
    const board = card?.parentElement;
    if (!card || !board) return;

    const cardRect = card.getBoundingClientRect();
    const localX = event.clientX - cardRect.left;
    const localY = event.clientY - cardRect.top;
    if (
      localX > cardRect.width - RESIZE_HANDLE_SIZE &&
      localY > cardRect.height - RESIZE_HANDLE_SIZE
    ) {
      return;
    }

    const boardRect = board.getBoundingClientRect();
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: cardRect.left - boardRect.left,
      originY: cardRect.top - boardRect.top,
      maxX: Math.max(0, board.clientWidth - card.offsetWidth),
      maxY: Math.max(0, board.clientHeight - card.offsetHeight),
    };

    function onMove(e) {
      const d = dragRef.current;
      if (!d) return;
      const nextX = clampPosition(d.originX + e.clientX - d.startX, 0, d.maxX);
      const nextY = clampPosition(d.originY + e.clientY - d.startY, 0, d.maxY);
      onPositionChange(layoutId, { x: Math.round(nextX), y: Math.round(nextY) });
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      cardRef.current?.classList.remove("is-dragging");
      dragRef.current = null;
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    card.classList.add("is-dragging");
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

  useEffect(() => {
    return () => {
      dragRef.current = null;
    };
  }, []);

  return (
    <article
      {...props}
      aria-label={props["aria-label"] ?? "Cartão móvel da lousa"}
      className={`${className} draggable-card`}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
      ref={cardRef}
      style={{ left: position.x, top: position.y }}
      tabIndex={0}
    >
      {children}
    </article>
  );
}
