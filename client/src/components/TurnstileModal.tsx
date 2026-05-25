import React from "react";

interface Props {
  visible: boolean;
  onCancel: () => void;
}

const TurnstileModal: React.FC<Props> = ({ visible, onCancel }) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/50 flex items-center justify-center" onClick={onCancel}>
      <div className="bg-white rounded-3xl p-8 text-center shadow-2xl max-w-[340px] w-[90%]" onClick={(e) => e.stopPropagation()}>
        <div className="text-xl font-bold text-slate-800 mb-2">人机验证</div>
        <div className="text-sm text-slate-500 mb-5">请完成验证以继续操作</div>
        <div id="turnstile-widget" />
        <button
          className="mt-5 px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 text-sm transition-colors hover:bg-slate-50 hover:text-slate-700"
          onClick={onCancel}
        >
          取消
        </button>
      </div>
    </div>
  );
};

export default TurnstileModal;
