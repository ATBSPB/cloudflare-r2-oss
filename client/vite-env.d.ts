/// <reference types="vite/client" />

interface Window {
  turnstile: {
    render: (selector: string, options: any) => string;
    remove: (widgetId: string) => void;
  };
  __turnstileToken: string | null;
}
