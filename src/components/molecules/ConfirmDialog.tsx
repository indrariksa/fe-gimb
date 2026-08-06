import type { ComponentProps, ReactNode } from "react";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";

type ConfirmDialogProps = {
  titleId: string;
  icon: ComponentProps<typeof Icon>["name"];
  danger?: boolean;
  title: string;
  message: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  isBusy?: boolean;
  variant?: "dashboard" | "plain";
};

export function ConfirmDialog({
  titleId,
  icon,
  danger,
  title,
  message,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  isBusy,
  variant = "plain",
}: ConfirmDialogProps) {
  const isDashboard = variant === "dashboard";
  return (
    <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="confirm-dialog__card">
        <span className={`confirm-dialog__icon${danger ? " confirm-dialog__icon--danger" : ""}`}>
          <Icon name={icon} size={34} />
        </span>
        <h2 id={titleId}>{title}</h2>
        <p>{message}</p>
        <div className="confirm-dialog__actions">
          <Button className={isDashboard ? "btn--dashboard-hover" : ""} variant="secondary" onClick={onCancel} disabled={isBusy}>
            {cancelLabel}
          </Button>
          <Button className={isDashboard ? "btn--shiny-dashboard" : ""} onClick={onConfirm} disabled={isBusy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
