import { useState, useCallback, useRef } from "react";

export function useToast(duration = 2000) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback(
    (msg: string) => {
      setMessage(msg);
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), duration);
    },
    [duration]
  );

  return { visible, message, showToast };
}
