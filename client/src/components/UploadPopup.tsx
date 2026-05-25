import React, { useRef } from "react";

interface Props {
  visible: boolean;
  onClose: () => void;
  onUpload: (files: FileList) => void;
  onCreateFolder: () => void;
}

const UploadPopup: React.FC<Props> = ({ visible, onClose, onUpload, onCreateFolder }) => {
  const cameraRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!visible) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/20" onClick={onClose} />
      <div className="fixed bottom-0 left-0 w-full z-[201] rounded-t-3xl bg-white shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.15)]">
        <div className="grid grid-cols-4 gap-3 p-5">
          <button className="flex flex-col items-center text-center text-xs p-3 rounded-xl transition-colors text-slate-500 hover:bg-slate-50 hover:text-slate-800" onClick={() => cameraRef.current?.click()}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-9 h-9 my-2" fill="currentColor">
              <path d="M149.1 64.8L138.7 96H64C28.7 96 0 124.7 0 160V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H373.3L362.9 64.8C356.4 45.2 338.1 32 317.4 32H194.6c-20.7 0-39 13.2-45.5 32.8zM256 384c-53 0-96-43-96-96s43-96 96-96s96 43 96 96s-43 96-96 96z" />
            </svg>
            <span>拍照上传</span>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handleChange} />
          </button>
          <button className="flex flex-col items-center text-center text-xs p-3 rounded-xl transition-colors text-slate-500 hover:bg-slate-50 hover:text-slate-800" onClick={() => mediaRef.current?.click()}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" className="w-9 h-9 my-2" fill="currentColor">
              <path d="M256 0H576c35.3 0 64 28.7 64 64V288c0 35.3-28.7 64-64 64H256c-35.3 0-64-28.7-64-64V64c0-35.3 28.7-64 64-64zM476 106.7C471.5 100 464 96 456 96s-15.5 4-20 10.7l-56 84L362.7 169c-4.6-5.7-11.5-9-18.7-9s-14.2 3.3-18.7 9l-64 80c-5.8 7.2-6.9 17.1-2.9 25.4s12.4 13.6 21.6 13.6h80 48H552c8.9 0 17-4.9 21.2-12.7s3.7-17.3-1.2-24.6l-96-144zM336 96c0-17.7-14.3-32-32-32s-32 14.3-32 32s14.3 32 32 32s32-14.3 32-32zM64 128h96V384v32c0 17.7 14.3 32 32 32H320c17.7 0 32-14.3 32-32V384H512v64c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V192c0-35.3 28.7-64 64-64zm8 64c-8.8 0-16 7.2-16 16v16c0 8.8 7.2 16 16 16H88c8.8 0 16-7.2 16-16V208c0-8.8-7.2-16-16-16H72zm0 104c-8.8 0-16 7.2-16 16v16c0 8.8 7.2 16 16 16H88c8.8 0 16-7.2 16-16V312c0-8.8-7.2-16-16-16H72zm0 104c-8.8 0-16 7.2-16 16v16c0 8.8 7.2 16 16 16H88c8.8 0 16-7.2 16-16V416c0-8.8-7.2-16-16-16H72zm336 16v16c0 8.8 7.2 16 16 16h16c8.8 0 16-7.2 16-16V416c0-8.8-7.2-16-16-16H424c-8.8 0-16 7.2-16 16z" />
            </svg>
            <span>图片/视频</span>
            <input ref={mediaRef} type="file" accept="image/*,video/*" multiple hidden onChange={handleChange} />
          </button>
          <button className="flex flex-col items-center text-center text-xs p-3 rounded-xl transition-colors text-slate-500 hover:bg-slate-50 hover:text-slate-800" onClick={() => fileRef.current?.click()}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="w-9 h-9 my-2" fill="currentColor">
              <path d="M0 64C0 28.7 28.7 0 64 0H224V128c0 17.7 14.3 32 32 32H384V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64zm384 64H256V0L384 128z" />
            </svg>
            <span>文件</span>
            <input ref={fileRef} type="file" accept="*" multiple hidden onChange={handleChange} />
          </button>
          <button className="flex flex-col items-center text-center text-xs p-3 rounded-xl transition-colors text-slate-500 hover:bg-slate-50 hover:text-slate-800" onClick={() => { onCreateFolder(); onClose(); }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-9 h-9 my-2" fill="currentColor">
              <path d="M512 416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96C0 60.7 28.7 32 64 32H181.5c17 0 33.3 6.7 45.3 18.7l26.5 26.5c12 12 28.3 18.7 45.3 18.7H448c35.3 0 64 28.7 64 64V416zM232 376c0 13.3 10.7 24 24 24s24-10.7 24-24V312h64c13.3 0 24-10.7 24-24s-10.7-24-24-24H280V200c0-13.3-10.7-24-24-24s-24 10.7-24 24v64H168c-13.3 0-24 10.7-24 24s10.7 24 24 24h64v64z" />
            </svg>
            <span>新建文件夹</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default UploadPopup;
