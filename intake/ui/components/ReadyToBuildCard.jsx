import DraggableCard from "./DraggableCard";

export default function ReadyToBuildCard({ isStarting, onConfirm, onPositionChange, positions }) {
  return (
    <DraggableCard
      className="build-card build-card-ready"
      defaultPosition={{ x: 360, y: 260 }}
      layoutId="ready"
      onPositionChange={onPositionChange}
      positions={positions}
    >
      <span className="build-card-eyebrow">Tudo pronto</span>
      <h3>Posso começar a construir?</h3>
      <p>Já tenho o suficiente sobre seu negócio. Quando você confirmar, o Agente 02 começa.</p>
      <button
        className="build-cta"
        disabled={isStarting}
        onClick={onConfirm}
        type="button"
      >
        {isStarting ? "Iniciando..." : "Pode construir"}
      </button>
    </DraggableCard>
  );
}
