import React, { useEffect, useRef } from "react";

interface MenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface Props {
  visible: boolean;
  title: string;
  items: MenuItem[];
  onClose: () => void;
}

const ContextMenu: React.FC<Props> = ({ visible, title, items, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={ref}
        className="bg-white rounded-2xl shadow-xl max-w-[90vw] overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-4 min-w-[256px] max-w-[320px] text-sm font-semibold text-slate-800 truncate">
          {title}
        </div>
        <ul>
          {items.map((item, i) => (
            <li key={i}>
              <button
                className="w-full text-left px-4 py-3 text-sm transition-colors hover:bg-slate-50"
                style={{ color: item.danger ? "#ef4444" : undefined }}
                onClick={() => {
                  item.onClick();
                  onClose();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ContextMenu;
