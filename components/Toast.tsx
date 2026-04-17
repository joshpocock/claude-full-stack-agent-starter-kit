"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { CheckCircle, XCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  action?: { label: string; href: string };
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, action?: { label: string; href: string }) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", action?: { label: string; href: string }) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, type, message, action }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, action ? 8000 : 3000);
    },
    []
  );

  const iconMap = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
  };

  const colorMap = {
    success: "var(--success)",
    error: "var(--error)",
    info: "var(--accent)",
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => {
          const Icon = iconMap[toast.type];
          return (
            <div
              key={toast.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 16px",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                borderRadius: 10,
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                fontSize: 13,
                color: "var(--text-primary)",
                pointerEvents: "auto",
                animation: "toast-slide-in 0.25s ease-out",
                minWidth: 240,
                maxWidth: 380,
              }}
            >
              <Icon
                size={18}
                color={colorMap[toast.type]}
                style={{ flexShrink: 0 }}
              />
              <span style={{ flex: 1 }}>{toast.message}</span>
              {toast.action && (
                <a
                  href={toast.action.href}
                  style={{
                    flexShrink: 0,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--accent)",
                    background: "var(--accent-subtle)",
                    border: "1px solid var(--accent)",
                    borderRadius: 6,
                    textDecoration: "none",
                    cursor: "pointer",
                  }}
                >
                  {toast.action.label}
                </a>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
