"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

export default function Tooltip({ content, children }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
  }, [show]);

  // Adjust if tooltip goes off screen
  useEffect(() => {
    if (show && tooltipRef.current) {
      const tr = tooltipRef.current.getBoundingClientRect();
      if (tr.left < 8) {
        setPos((p) => ({ ...p, left: p.left + (8 - tr.left) }));
      }
      if (tr.right > window.innerWidth - 8) {
        setPos((p) => ({ ...p, left: p.left - (tr.right - window.innerWidth + 8) }));
      }
    }
  }, [show, pos.left]);

  return (
    <div
      ref={ref}
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={tooltipRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              transform: "translateX(-50%) translateY(-100%)",
              padding: "8px 12px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              fontSize: 12,
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
              zIndex: 99999,
              pointerEvents: "none",
            }}
          >
            {content}
          </div>,
          document.body
        )}
    </div>
  );
}
