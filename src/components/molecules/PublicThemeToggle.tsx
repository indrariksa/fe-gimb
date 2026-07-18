import { Icon } from "../atoms/Icon";
import { useThemeSettings } from "../../theme/ThemeContext";

type PublicThemeToggleProps = {
  className?: string;
};

export function PublicThemeToggle({ className = "" }: PublicThemeToggleProps) {
  const { theme, updateTheme } = useThemeSettings();
  const isDark = theme.mode === "dark";

  return (
    <button
      type="button"
      className={`public-theme-toggle mode-toggle ${isDark ? "is-dark" : ""} ${className}`.trim()}
      aria-label={isDark ? "Gunakan mode terang" : "Gunakan mode gelap"}
      onClick={() => updateTheme({ mode: isDark ? "light" : "dark" })}
    >
      <span className="mode-toggle__thumb" />
      <span className="mode-toggle__option">
        <Icon name="sun" size={16} />
      </span>
      <span className="mode-toggle__option">
        <Icon name="moon" size={16} />
      </span>
    </button>
  );
}
