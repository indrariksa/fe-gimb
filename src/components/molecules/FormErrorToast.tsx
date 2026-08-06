import { useEffect } from "react";
import { Icon } from "../atoms/Icon";

type FormErrorToastProps = {
  message: string;
  onDismiss: () => void;
};

export function FormErrorToast({ message, onDismiss }: FormErrorToastProps) {
  useEffect(() => {
    const timeout = window.setTimeout(onDismiss, 6000);
    return () => window.clearTimeout(timeout);
  }, [message, onDismiss]);

  return (
    <div className="error-toast" role="alert">
      <span className="error-toast__icon"><Icon name="alert" size={20} /></span>
      <p>{message}</p>
      <button type="button" onClick={onDismiss} aria-label="Tutup pesan error">
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
