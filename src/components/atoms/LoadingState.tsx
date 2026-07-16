type LoadingStateProps = {
  children: string;
  className?: string;
  inline?: boolean;
};

export function LoadingState({ children, className = "", inline = false }: LoadingStateProps) {
  const Tag = inline ? "span" : "article";
  return (
    <Tag className={`loading-state ${inline ? "loading-state--inline" : "panel empty-state"} ${className}`} aria-live="polite">
      <span className="route-loader__spinner" aria-hidden="true" />
      <span>{children}</span>
    </Tag>
  );
}
