import React from "react";
import type { R2FileInfo } from "../types";
import MimeIcon from "./MimeIcon";
import { formatSize, formatDate, fileNameFromKey, folderDisplayName } from "../utils/format";

interface Props {
  cwd: string;
  folders: string[];
  files: R2FileInfo[];
  loading: boolean;
  search: string;
  onNavigate: (path: string) => void;
  onPreview: (key: string) => void;
  onContextMenu: (target: R2FileInfo | string) => void;
}

function FolderIcon() {
  return (
    <div className="w-[46px] h-[46px] flex-shrink-0 flex items-center justify-center rounded-lg mr-3 bg-gradient-to-br from-amber-100 to-amber-200 text-amber-600">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    </div>
  );
}

function MoreButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
      onClick={onClick}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
      </svg>
    </button>
  );
}

const FileList: React.FC<Props> = ({ cwd, folders, files, loading, search, onNavigate, onPreview, onContextMenu }) => {
  const filteredFolders = search ? folders.filter((f) => f.includes(search)) : folders;
  const filteredFiles = search
    ? files.filter((f) => fileNameFromKey(f.key).includes(search))
    : files;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-sm gap-4 animate-fade-in-up">
        <div className="w-9 h-9 border-[3px] border-slate-200 border-t-primary-500 rounded-full" style={{ animation: "spin 0.8s linear infinite" }} />
        <span>加载中...</span>
      </div>
    );
  }

  if (filteredFiles.length === 0 && filteredFolders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-sm gap-4 animate-fade-in-up">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 opacity-50">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          <line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" />
        </svg>
        <span>暂无文件</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 py-3">
      {cwd && (
        <div
          className="file-card w-full md:w-[calc(33.333%-6px)] lg:w-[calc(25%-6px)]"
          onClick={() => onNavigate(cwd.replace(/[^/]+\/$/, ""))}
        >
          <FolderIcon />
          <span className="file-name">..</span>
        </div>
      )}

      {filteredFolders.map((folder) => (
        <div
          key={folder}
          className="file-card w-full md:w-[calc(33.333%-6px)] lg:w-[calc(25%-6px)] group"
          onClick={() => onNavigate(folder)}
        >
          <FolderIcon />
          <span className="flex-1 min-w-0 text-sm font-medium text-slate-800 truncate">
            {folderDisplayName(folder)}
          </span>
          <MoreButton onClick={(e) => { e.stopPropagation(); onContextMenu(folder); }} />
        </div>
      ))}

      {filteredFiles.map((file) => (
        <div
          key={file.key}
          className="file-card w-full md:w-[calc(33.333%-6px)] lg:w-[calc(25%-6px)] group"
          onClick={() => onPreview(file.key)}
        >
          <MimeIcon
            contentType={file.httpMetadata?.contentType}
            thumbnail={
              file.customMetadata?.thumbnail
                ? `/raw/_$flaredrive$/thumbnails/${file.customMetadata.thumbnail}.png`
                : null
            }
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-800 truncate">
              {fileNameFromKey(file.key)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              <span>{formatDate(file.uploaded)}</span>
              <span className="ml-2">{formatSize(file.size)}</span>
            </div>
          </div>
          <MoreButton onClick={(e) => { e.stopPropagation(); onContextMenu(file); }} />
        </div>
      ))}
    </div>
  );
};

export default React.memo(FileList);
