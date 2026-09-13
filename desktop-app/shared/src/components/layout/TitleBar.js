import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';

/**
 * Frameless-window title bar. Only rendered when the renderer is running
 * inside Electron (window.desktopAPI is injected by the preload script).
 * In a plain browser (or the packaged fallback) it renders nothing.
 */
const TitleBar = () => {
  const [maximized, setMaximized] = useState(false);
  const api = typeof window !== 'undefined' ? window.desktopAPI : null;

  useEffect(() => {
    if (!api?.onMaximizedChanged) return;
    const unsubscribe = api.onMaximizedChanged((isMax) => setMaximized(isMax));
    return () => unsubscribe && unsubscribe();
  }, [api]);

  if (!api) return null;

  const windowControls = [
    {
      key: 'min',
      label: 'Minimize',
      icon: Minus,
      onClick: () => api.minimize(),
    },
    {
      key: 'max',
      label: maximized ? 'Restore' : 'Maximize',
      icon: maximized ? Copy : Square,
      onClick: () => api.toggleMaximize(),
    },
    {
      key: 'close',
      label: 'Close',
      icon: X,
      onClick: () => api.close(),
    },
  ];

  return (
    <div className="kc-titlebar border-b border-[#e4eae5] bg-white">
      <div className="flex items-center gap-2 px-4">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-primary-light to-primary text-sm">
          🌱
        </div>
        <span className="text-[13px] font-bold text-[#1f2937]">KilimoChat Desktop</span>
        <span className="rounded-full bg-[#eef3ef] px-2 py-0.5 text-[10px] font-semibold text-primary">
          {api.platform === 'win32' ? 'Windows' : 'Linux'}
        </span>
      </div>

      <div className="no-drag flex h-full items-stretch" onDoubleClick={() => api.toggleMaximize()}>
        {windowControls.map((control) => {
          const Icon = control.icon;
          return (
            <button
              key={control.key}
              type="button"
              aria-label={control.label}
              title={control.label}
              onClick={control.onClick}
              className={`kc-titlebar-btn ${control.key === 'close' ? 'close' : ''}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TitleBar;