export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";
  return (
    <button
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      className="theme-toggle"
      onClick={onToggle}
      type="button"
    >
      <span aria-hidden="true" className="theme-toggle-track">
        <i />
      </span>
      <strong>{isDark ? "Dark" : "Light"}</strong>
    </button>
  );
}
