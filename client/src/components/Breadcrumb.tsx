import React from "react";

interface Props {
  cwd: string;
  onNavigate: (path: string) => void;
}

const Breadcrumb: React.FC<Props> = ({ cwd, onNavigate }) => {
  if (!cwd) return null;

  const parts = cwd.split("/").filter(Boolean);

  return (
    <div className="flex items-center gap-1 py-3 text-sm text-slate-500 overflow-x-auto whitespace-nowrap scrollbar-thin">
      <span
        className="cursor-pointer px-2.5 py-1.5 rounded-md transition-colors hover:bg-slate-100 hover:text-slate-800"
        onClick={() => onNavigate("")}
      >
        根目录
      </span>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          <svg className="text-slate-300 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span
            className={`cursor-pointer px-2.5 py-1.5 rounded-md transition-colors hover:bg-slate-100 hover:text-slate-800 ${
              i === parts.length - 1 ? "text-slate-800 font-medium" : ""
            }`}
            onClick={() => onNavigate(parts.slice(0, i + 1).join("/") + "/")}
          >
            {part}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};

export default React.memo(Breadcrumb);
