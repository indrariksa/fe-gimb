import { Icon } from "../atoms/Icon";

type BrandProps = {
  name: string;
  compact?: boolean;
};

export function Brand({ name, compact = false }: BrandProps) {
  return (
    <div className={`brand ${compact ? "brand--compact" : ""}`}>
      <span className="brand__mark">
        <Icon name="chart" size={compact ? 18 : 22} />
      </span>
      <span>
        <strong>{name}</strong>
        {!compact && <small>Health Dashboard</small>}
      </span>
    </div>
  );
}
