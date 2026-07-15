type BrandProps = {
  name: string;
  compact?: boolean;
};

export function Brand({ name, compact = false }: BrandProps) {
  return (
    <div className={`brand ${compact ? "brand--compact" : ""}`}>
      <span className="brand__mark">
        <img src="/gimb-icon.svg" alt="" aria-hidden="true" />
      </span>
      <span>
        <strong>{name}</strong>
        {!compact && <small>Health Dashboard</small>}
      </span>
    </div>
  );
}
