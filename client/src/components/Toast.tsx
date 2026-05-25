import React from "react";

interface Props {
  visible: boolean;
  message: string;
}

const Toast: React.FC<Props> = ({ visible, message }) => {
  if (!visible) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-lg text-sm z-[500] shadow-lg whitespace-nowrap animate-fade-in-up">
      {message}
    </div>
  );
};

export default Toast;
