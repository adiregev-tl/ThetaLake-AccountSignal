'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Minus, DollarSign, GripHorizontal } from 'lucide-react';
import { UsageCosts } from '@/components/admin/UsageCosts';

interface UsageCostsWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STORAGE_KEY = 'marketpulse_usage_window';
const DEFAULT_WIDTH = 700;
const DEFAULT_HEIGHT = 600;
const MIN_WIDTH = 400;
const MIN_HEIGHT = 300;

interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
}

function getDefaultState(): WindowState {
  return {
    x: Math.max(0, Math.floor((window.innerWidth - DEFAULT_WIDTH) / 2)),
    y: Math.max(0, Math.floor((window.innerHeight - DEFAULT_HEIGHT) / 2)),
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    minimized: false,
  };
}

function loadState(): WindowState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as WindowState;
      // Validate bounds
      if (
        parsed.width >= MIN_WIDTH &&
        parsed.height >= MIN_HEIGHT &&
        parsed.x >= 0 &&
        parsed.y >= 0
      ) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function saveState(state: WindowState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function UsageCostsWindow({ open, onOpenChange }: UsageCostsWindowProps) {
  const [mounted, setMounted] = useState(false);
  const [windowState, setWindowState] = useState<WindowState | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Mount portal on client only
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize window state when opened
  useEffect(() => {
    if (open && !windowState) {
      const saved = loadState();
      const state = saved || getDefaultState();
      // Clamp position to current viewport
      state.x = Math.min(state.x, window.innerWidth - 100);
      state.y = Math.min(state.y, window.innerHeight - 50);
      setWindowState(state);
    }
  }, [open, windowState]);

  // Save state on changes
  useEffect(() => {
    if (windowState) {
      saveState(windowState);
    }
  }, [windowState]);

  // Observe resize via ResizeObserver (for CSS resize: both)
  useEffect(() => {
    if (!open || !panelRef.current) return;

    const el = panelRef.current;
    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Account for border/padding
        const totalWidth = Math.max(MIN_WIDTH, Math.round(el.offsetWidth));
        const totalHeight = Math.max(MIN_HEIGHT, Math.round(el.offsetHeight));
        setWindowState((prev) => {
          if (!prev) return prev;
          if (prev.width === totalWidth && prev.height === totalHeight) return prev;
          return { ...prev, width: totalWidth, height: totalHeight };
        });
      }
    });

    resizeObserverRef.current.observe(el);
    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [open, mounted]);

  // Drag handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!windowState) return;
      e.preventDefault();
      dragOffset.current = {
        x: e.clientX - windowState.x,
        y: e.clientY - windowState.y,
      };
      setDragging(true);
    },
    [windowState]
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setWindowState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          x: Math.max(0, Math.min(e.clientX - dragOffset.current.x, window.innerWidth - 100)),
          y: Math.max(0, Math.min(e.clientY - dragOffset.current.y, window.innerHeight - 50)),
        };
      });
    };

    const handleMouseUp = () => {
      setDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleMinimize = () => {
    setWindowState((prev) => (prev ? { ...prev, minimized: !prev.minimized } : prev));
  };

  if (!mounted || !open || !windowState) return null;

  return createPortal(
    <>
      {/* Backdrop - subtle, clickable to close */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={handleClose}
        style={{ background: 'transparent' }}
      />

      {/* Floating Panel */}
      <div
        ref={panelRef}
        className="fixed z-[9999] flex flex-col bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl shadow-black/50"
        style={{
          left: windowState.x,
          top: windowState.y,
          width: windowState.width,
          height: windowState.minimized ? 'auto' : windowState.height,
          minWidth: MIN_WIDTH,
          minHeight: windowState.minimized ? undefined : MIN_HEIGHT,
          resize: windowState.minimized ? 'none' : 'both',
          overflow: 'hidden',
          userSelect: dragging ? 'none' : undefined,
        }}
      >
        {/* Title Bar - Drag Handle */}
        <div
          className="flex items-center justify-between px-4 py-2.5 bg-zinc-800 border-b border-zinc-700 rounded-t-xl flex-shrink-0"
          onMouseDown={handleMouseDown}
          style={{ cursor: dragging ? 'grabbing' : 'grab' }}
        >
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-4 h-4 text-zinc-500" />
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-white select-none">Usage & Costs</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleMinimize}
              className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={handleClose}
              className="p-1 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {!windowState.minimized && (
          <div className="flex-1 overflow-auto p-4">
            <UsageCosts />
          </div>
        )}
      </div>
    </>,
    document.body
  );
}
