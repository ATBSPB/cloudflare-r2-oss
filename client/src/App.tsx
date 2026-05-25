import { useState, useEffect, useCallback } from "react";
import type { R2FileInfo, SortMode } from "./types";
import { fetchFiles, uploadFile, deleteFile, renameFile, moveFile, createFolder, uploadThumbnail } from "./utils/api";
import { generateThumbnail, blobDigest } from "./utils/thumbnail";
import { fileNameFromKey } from "./utils/format";
import { useTurnstile } from "./hooks/useTurnstile";
import { useToast } from "./hooks/useToast";
import Breadcrumb from "./components/Breadcrumb";
import FileList from "./components/FileList";
import ContextMenu from "./components/ContextMenu";
import UploadPopup from "./components/UploadPopup";
import TurnstileModal from "./components/TurnstileModal";
import Toast from "./components/Toast";

const SORT_MENU_ITEMS = [
  { label: "名称 A-Z", mode: "name" as SortMode },
  { label: "大小 ↑", mode: "size-asc" as SortMode },
  { label: "大小 ↓", mode: "size-desc" as SortMode },
];

export default function App() {
  const [cwd, setCwd] = useState(() => new URL(window.location.href).searchParams.get("p") || "");
  const [rawFiles, setRawFiles] = useState<R2FileInfo[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [showMenu, setShowMenu] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [ctxTarget, setCtxTarget] = useState<R2FileInfo | string | null>(null);
  const [showCtx, setShowCtx] = useState(false);
  const [clipboard, setClipboard] = useState<string | null>(null);
  const { showModal, ensureToken, cancel } = useTurnstile();
  const { visible: toastVisible, message: toastMsg, showToast } = useToast();

  const sortFiles = useCallback(
    (items: R2FileInfo[], mode: SortMode) => {
      const sorted = [...items];
      switch (mode) {
        case "size-asc":
          return sorted.sort((a, b) => a.size - b.size);
        case "size-desc":
          return sorted.sort((a, b) => b.size - a.size);
        default:
          return sorted.sort((a, b) => a.key.localeCompare(b.key));
      }
    },
    []
  );

  const loadFiles = useCallback(async (path: string) => {
    setRawFiles([]);
    setFolders([]);
    setLoading(true);
    try {
      const data = await fetchFiles(path);
      setRawFiles(data.value);
      setFolders(data.folders);
    } catch (e) {
      console.error("Failed to load files:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const files = sortFiles(rawFiles, sortMode);

  useEffect(() => {
    loadFiles(cwd);
    const url = new URL(window.location.href);
    if ((url.searchParams.get("p") || "") !== cwd) {
      cwd ? url.searchParams.set("p", cwd) : url.searchParams.delete("p");
      window.history.pushState(null, "", url.toString());
    }
    const name = cwd.replace(/.*\/(?!$)|\//g, "") || "/";
    document.title = `${name} - 文件库`;
  }, [cwd, loadFiles]);

  useEffect(() => {
    const handler = () => {
      const p = new URL(window.location.href).searchParams.get("p") || "";
      if (p !== cwd) setCwd(p);
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [cwd]);

  const navigateTo = useCallback((path: string) => setCwd(path), []);

  const preview = useCallback((key: string) => window.open(`/raw/${key}`), []);

  const handleCopyLink = useCallback(
    (path: string) => {
      const url = new URL(path, window.location.origin);
      navigator.clipboard.writeText(url.toString());
      showToast("链接已复制");
    },
    [showToast]
  );

  const handleUpload = useCallback(
    async (files: FileList) => {
      try {
        const token = await ensureToken();
        const basedir = cwd ? (cwd.endsWith("/") ? cwd : cwd + "/") : "";
        const total = files.length;
        for (let i = 0; i < total; i++) {
          const file = files[i];
          let thumbnailDigest: string | null = null;

          const thumb = await generateThumbnail(file);
          if (thumb) {
            const digest = await blobDigest(thumb);
            try {
              await uploadThumbnail(thumb, digest, token);
              thumbnailDigest = digest;
            } catch (e) {
              console.warn("Thumbnail upload failed:", e);
            }
          }

          await uploadFile(`${basedir}${file.name}`, file, token, thumbnailDigest, (loaded, total) => {
            setUploadProgress((loaded / total) * 100);
          });
        }
        showToast(`${total > 1 ? total + " 个文件" : "文件"}上传成功`);
        loadFiles(cwd);
      } catch (e) {
        if ((e as Error).message !== "Cancelled") console.error("Upload failed:", e);
      } finally {
        setUploadProgress(null);
      }
    },
    [cwd, ensureToken, loadFiles, showToast]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const dt = e.dataTransfer;
      const fileList = dt.files;
      if (fileList.length > 0) {
        handleUpload(fileList);
      }
    },
    [handleUpload]
  );

  const handleDelete = useCallback(
    async (key: string) => {
      if (!window.confirm(`确定要删除 ${key} 吗？`)) return;
      try {
        const token = await ensureToken();
        await deleteFile(key, token);
        showToast("删除成功");
        loadFiles(cwd);
      } catch (e) {
        if ((e as Error).message !== "Cancelled") console.error("Delete failed:", e);
      }
    },
    [cwd, ensureToken, loadFiles, showToast]
  );

  const handleRename = useCallback(
    async (key: string) => {
      const newName = window.prompt("重命名为:");
      if (!newName) return;
      try {
        const token = await ensureToken();
        await renameFile(key, newName, cwd, token);
        showToast("重命名成功");
        loadFiles(cwd);
      } catch (e) {
        if ((e as Error).message !== "Cancelled") console.error("Rename failed:", e);
      }
    },
    [cwd, ensureToken, loadFiles, showToast]
  );

  const handleMove = useCallback(
    async (key: string) => {
      const currentPath = cwd;
      const allFolders = [...folders];
      if (currentPath !== "") {
        const parent = currentPath.replace(/[^/]+\/$/, "");
        if (!allFolders.includes(parent) && parent !== "") allFolders.unshift(parent);
      }
      if (!allFolders.includes("")) allFolders.unshift("");

      const options = allFolders.map((f) => (f === "" ? "根目录" : f === currentPath ? "当前目录" : f.replace(/.*\/(?!$)|\//g, "") + "/"));
      const promptText = `请选择目标目录(输入数字):\n${options.map((o, i) => `${i + 1}. ${o}`).join("\n")}\n`;
      const selection = window.prompt(promptText);
      if (!selection) return;

      const idx = parseInt(selection) - 1;
      if (isNaN(idx) || idx < 0 || idx >= allFolders.length) {
        alert("无效的选择");
        return;
      }

      const targetPath = allFolders[idx];
      const fileName = fileNameFromKey(key).replace(/_\$folder$/, "");
      const normalized = targetPath === "" ? "" : targetPath.endsWith("/") ? targetPath : targetPath + "/";
      const targetKey = normalized + fileName;

      try {
        const token = await ensureToken();
        await moveFile(key, targetKey, token);
        showToast("移动成功");
        loadFiles(cwd);
      } catch (e) {
        if ((e as Error).message !== "Cancelled") {
          console.error("Move failed:", e);
          alert("移动失败，请检查目标路径");
        }
      }
    },
    [cwd, folders, ensureToken, loadFiles, showToast]
  );

  const handleCreateFolder = useCallback(async () => {
    const name = window.prompt("请输入文件夹名称");
    if (!name) return;
    try {
      const token = await ensureToken();
      await createFolder(cwd, name, token);
      showToast("文件夹创建成功");
      loadFiles(cwd);
    } catch (e) {
      if ((e as Error).message !== "Cancelled") console.error("Create folder failed:", e);
    }
  }, [cwd, ensureToken, loadFiles, showToast]);

  const handleDownload = useCallback(
    async (key: string) => {
      try {
        await ensureToken();
        const a = document.createElement("a");
        a.href = `/raw/${key}`;
        a.download = fileNameFromKey(key);
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast("已开始下载");
      } catch {
        // cancelled
      }
    },
    [ensureToken, showToast]
  );

  const handleCopyToClipboard = useCallback(
    (key: string) => {
      setClipboard(key);
      showToast("已复制到剪贴板");
    },
    [showToast]
  );

  const handlePaste = useCallback(async () => {
    if (!clipboard) {
      showToast("剪贴板为空");
      return;
    }
    const newName = window.prompt("重命名为:");
    if (newName === null) return;
    const finalName = newName || fileNameFromKey(clipboard);
    try {
      const token = await ensureToken();
      const targetKey = `${cwd}${finalName}`;
      await moveFile(clipboard, targetKey, token);
      setClipboard(null);
      showToast("粘贴成功");
      loadFiles(cwd);
    } catch (e) {
      if ((e as Error).message !== "Cancelled") console.error("Paste failed:", e);
    }
  }, [clipboard, cwd, ensureToken, loadFiles, showToast]);

  const ctxTitle = ctxTarget
    ? typeof ctxTarget === "string"
      ? ctxTarget
      : ctxTarget.key
    : "";

  const ctxItems =
    ctxTarget && typeof ctxTarget === "string"
      ? [
          { label: "复制链接", onClick: () => handleCopyLink(`/?p=${encodeURIComponent(ctxTarget)}`) },
          { label: "复制", onClick: () => handleCopyToClipboard(ctxTarget + "_$folder$") },
          { label: "移动", onClick: () => handleMove(ctxTarget + "_$folder$") },
          { label: "删除", onClick: () => handleDelete(ctxTarget + "_$folder$"), danger: true },
        ]
      : ctxTarget
        ? (() => {
            const file = ctxTarget as R2FileInfo;
            return [
              { label: "重命名", onClick: () => handleRename(file.key) },
              { label: "下载", onClick: () => handleDownload(file.key) },
              { label: "复制", onClick: () => handleCopyToClipboard(file.key) },
              { label: "移动", onClick: () => handleMove(file.key) },
              { label: "复制链接", onClick: () => handleCopyLink(`/raw/${file.key}`) },
              { label: "删除", onClick: () => handleDelete(file.key), danger: true },
            ];
          })()
        : [];

  return (
    <div
      className="h-full max-w-[1200px] mx-auto px-5"
      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={handleDrop}
    >
      {uploadProgress !== null && (
        <div className="fixed bottom-0 left-0 w-full h-[3px] z-50">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      <UploadPopup
        visible={showUpload}
        onClose={() => setShowUpload(false)}
        onUpload={handleUpload}
        onCreateFolder={handleCreateFolder}
      />

      <TurnstileModal visible={showModal} onCancel={cancel} />

      <div className="sticky top-0 py-4 bg-slate-50/95 backdrop-blur-xl flex items-center gap-3 z-10">
        <div className="flex-1 relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索文件..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-100 border border-slate-200 rounded-xl outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>
        <div className="relative">
          <button className="btn-icon w-[42px] h-[42px]" onClick={() => setShowMenu(!showMenu)}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
            </svg>
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-popup border border-slate-200 min-w-[160px] overflow-hidden">
                {SORT_MENU_ITEMS.map((item) => (
                  <div
                    key={item.mode}
                    className={`px-4 py-3 text-sm cursor-pointer transition-colors hover:bg-slate-50 ${sortMode === item.mode ? "text-primary-600 font-medium" : "text-slate-800"}`}
                    onClick={() => {
                      setSortMode(item.mode);
                      setShowMenu(false);
                    }}
                  >
                    {item.label}
                  </div>
                ))}
                <div
                  className="px-4 py-3 text-sm cursor-pointer transition-colors hover:bg-slate-50 text-slate-800 border-t border-slate-100"
                  onClick={() => {
                    setShowMenu(false);
                    handlePaste();
                  }}
                >
                  粘贴
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Breadcrumb cwd={cwd} onNavigate={navigateTo} />

      <FileList
        cwd={cwd}
        folders={folders}
        files={files}
        loading={loading}
        search={search}
        onNavigate={navigateTo}
        onPreview={preview}
        onContextMenu={(target) => {
          setCtxTarget(target);
          setShowCtx(true);
        }}
      />

      <button
        className="fixed right-5 bottom-5 w-14 h-14 flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-full shadow-lg border-none cursor-pointer transition-all hover:scale-105 hover:shadow-xl active:scale-95 z-[100]"
        onClick={() => setShowUpload(true)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </button>

      <ContextMenu visible={showCtx} title={ctxTitle} items={ctxItems} onClose={() => setShowCtx(false)} />
      <Toast visible={toastVisible} message={toastMsg} />
    </div>
  );
}
