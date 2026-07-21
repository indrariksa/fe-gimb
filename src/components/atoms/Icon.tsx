type IconProps = {
  name: "chart" | "dashboard" | "home" | "alert" | "grid" | "bulb" | "settings" | "logout" | "download" | "file" | "bell" | "menu" | "close" | "arrow" | "palette" | "sun" | "moon" | "chevron" | "check" | "search" | "filter" | "refresh" | "maximize" | "eye";
  size?: number;
};

const paths: Record<IconProps["name"], string[]> = {
  chart: ["M4 19V9", "M10 19V5", "M16 19v-7", "M22 19V3"],
  dashboard: ["M4 14a8 8 0 1 1 16 0", "M12 14l4-4", "M7 14h.01", "M9 9h.01", "M15 9h.01", "M17 14h.01", "M6 19h12"],
  home: ["M3 11l9-8 9 8", "M5 10v10h14V10", "M9 20v-6h6v6"],
  alert: ["M12 3 2 21h20L12 3Z", "M12 9v5", "M12 17h.01"],
  grid: ["M4 4h6v6H4z", "M14 4h6v6h-6z", "M4 14h6v6H4z", "M14 14h6v6h-6z"],
  bulb: ["M9 18h6", "M10 22h4", "M8 14a6 6 0 1 1 8 0c-1.2 1-1.6 2-1.6 3H9.6c0-1-.4-2-1.6-3Z"],
  settings: ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.5-.2-.1a1.7 1.7 0 0 0-1.9.3l-.2.1-3.5-2 .1-.2a1.7 1.7 0 0 0-.3-1.9", "M4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3.5.2.1a1.7 1.7 0 0 0 1.9-.3l.2-.1 3.5 2-.1.2a1.7 1.7 0 0 0 .3 1.9"],
  logout: ["M10 17l5-5-5-5", "M15 12H3", "M21 3v18"],
  download: ["M12 3v12", "M7 10l5 5 5-5", "M5 21h14"],
  file: ["M6 3h9l3 3v15H6z", "M14 3v4h4", "M9 13h6", "M9 17h6"],
  bell: ["M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9", "M10 21h4"],
  menu: ["M4 6h16", "M4 12h16", "M4 18h16"],
  close: ["M6 6l12 12", "M18 6 6 18"],
  arrow: ["M5 12h14", "M13 5l7 7-7 7"],
  palette: ["M12 3a9 9 0 1 0 0 18h1.5a1.8 1.8 0 0 0 1.2-3.1 1.8 1.8 0 0 1 1.2-3.1H18a6 6 0 0 0 0-12h-6Z", "M7.5 10h.01", "M10 7h.01", "M14 7h.01"],
  sun: ["M12 4V2", "M12 22v-2", "M4.93 4.93 3.52 3.52", "M20.48 20.48l-1.41-1.41", "M4 12H2", "M22 12h-2", "M4.93 19.07l-1.41 1.41", "M20.48 3.52l-1.41 1.41", "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"],
  moon: ["M21 14.2A7.5 7.5 0 0 1 9.8 3 8.5 8.5 0 1 0 21 14.2Z"],
  chevron: ["M6 9l6 6 6-6"],
  check: ["M20 6 9 17l-5-5"],
  search: ["M21 21l-4.35-4.35", "M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"],
  filter: ["M3 5h18l-7 8v5l-4 2v-7L3 5Z"],
  refresh: ["M21 12a9 9 0 0 1-15.5 6.2", "M3 12A9 9 0 0 1 18.5 5.8", "M18 3v4h-4", "M6 21v-4h4"],
  maximize: ["M8 3H3v5", "M3 3l6 6", "M16 3h5v5", "M21 3l-6 6", "M8 21H3v-5", "M3 21l6-6", "M16 21h5v-5", "M21 21l-6-6"],
  eye: ["M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"],
};

export function Icon({ name, size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {paths[name].map((d) => (
        <path key={d} d={d} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}
