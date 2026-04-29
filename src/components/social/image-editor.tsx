/**
 * Arquivo: src/components/social/image-editor.tsx
 * Propósito: Editor de imagem profissional com crop, filtros preset, rotação livre, flip, undo/redo e zoom
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Crop, RotateCw, Sun, Droplets, Contrast,
  Sparkles, RotateCcw, Check, X,
  FlipHorizontal2, FlipVertical2,
  Undo2, Redo2,
  ZoomIn, ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AspectRatio = "1:1" | "4:5" | "16:9" | "9:16" | "free";

type ImageFilters = {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  hueRotate: number;
  sepia: number;
};

type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ImageEditorProps = {
  imageUrl: string;
  onSave: (editedImageBlob: Blob) => void;
  onCancel: () => void;
};

type EditorState = {
  filters: ImageFilters;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  cropArea: CropArea | null;
  activePreset: string;
};

type HandleType = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "move";

type FilterPreset = {
  name: string;
  filters: ImageFilters;
};

const ASPECT_RATIOS: Record<AspectRatio, number | null> = {
  "1:1": 1,
  "4:5": 4 / 5,
  "16:9": 16 / 9,
  "9:16": 9 / 16,
  "free": null,
};

const DEFAULT_FILTERS: ImageFilters = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  hueRotate: 0,
  sepia: 0,
};

const FILTER_PRESETS: FilterPreset[] = [
  { name: "Normal", filters: { ...DEFAULT_FILTERS } },
  { name: "Clarendon", filters: { brightness: 110, contrast: 130, saturation: 120, blur: 0, hueRotate: 0, sepia: 0 } },
  { name: "Gingham", filters: { brightness: 105, contrast: 90, saturation: 80, blur: 0, hueRotate: 0, sepia: 20 } },
  { name: "Moon", filters: { brightness: 110, contrast: 110, saturation: 0, blur: 0, hueRotate: 0, sepia: 0 } },
  { name: "Lark", filters: { brightness: 115, contrast: 90, saturation: 110, blur: 0, hueRotate: 0, sepia: 0 } },
  { name: "Reyes", filters: { brightness: 110, contrast: 85, saturation: 75, blur: 0, hueRotate: 0, sepia: 25 } },
  { name: "Juno", filters: { brightness: 100, contrast: 120, saturation: 140, blur: 0, hueRotate: 0, sepia: 0 } },
  { name: "Vintage", filters: { brightness: 95, contrast: 80, saturation: 60, blur: 0, hueRotate: 15, sepia: 40 } },
  { name: "Dramatic", filters: { brightness: 90, contrast: 150, saturation: 80, blur: 0, hueRotate: 0, sepia: 0 } },
];

const HANDLE_SIZE = 10;

function buildFilterString(f: ImageFilters): string {
  return [
    `brightness(${f.brightness}%)`,
    `contrast(${f.contrast}%)`,
    `saturate(${f.saturation}%)`,
    `blur(${f.blur}px)`,
    `hue-rotate(${f.hueRotate}deg)`,
    `sepia(${f.sepia}%)`,
  ].join(" ");
}

export function ImageEditor({ imageUrl, onSave, onCancel }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  // Core state
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("free");
  const [filters, setFilters] = useState<ImageFilters>({ ...DEFAULT_FILTERS });
  const [activePreset, setActivePreset] = useState("Normal");

  // Crop state
  const [cropMode, setCropMode] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragHandle, setDragHandle] = useState<HandleType | null>(null);

  // Zoom (view only)
  const [zoom, setZoom] = useState(1);

  // History (undo/redo)
  const [history, setHistory] = useState<EditorState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      setCropArea({ x: 0, y: 0, width: img.width, height: img.height });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Initialize history
  useEffect(() => {
    if (image && history.length === 0) {
      const initial: EditorState = {
        filters: { ...DEFAULT_FILTERS },
        rotation: 0,
        flipH: false,
        flipV: false,
        cropArea: { x: 0, y: 0, width: image.width, height: image.height },
        activePreset: "Normal",
      };
      setHistory([initial]);
      setHistoryIndex(0);
    }
  }, [image]); // eslint-disable-line react-hooks/exhaustive-deps

  const pushHistory = useCallback(() => {
    const entry: EditorState = {
      filters: { ...filters },
      rotation,
      flipH,
      flipV,
      cropArea: cropArea ? { ...cropArea } : null,
      activePreset,
    };
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), entry]);
    setHistoryIndex((prev) => prev + 1);
  }, [filters, rotation, flipH, flipV, cropArea, activePreset, historyIndex]);

  const restoreState = useCallback((entry: EditorState) => {
    setFilters(entry.filters);
    setRotation(entry.rotation);
    setFlipH(entry.flipH);
    setFlipV(entry.flipV);
    setCropArea(entry.cropArea);
    setActivePreset(entry.activePreset);
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    restoreState(history[newIndex]);
  }, [canUndo, historyIndex, history, restoreState]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    restoreState(history[newIndex]);
  }, [canRedo, historyIndex, history, restoreState]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo]);

  // Render canvas
  const renderCanvas = useCallback(() => {
    if (!canvasRef.current || !image || !cropArea) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = cropArea.width;
    canvas.height = cropArea.height;

    ctx.filter = buildFilterString(filters);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    ctx.drawImage(
      image,
      cropArea.x, cropArea.y, cropArea.width, cropArea.height,
      -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height
    );
    ctx.restore();
  }, [image, cropArea, filters, rotation, flipH, flipV]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Apply aspect ratio
  const applyCropAspectRatio = useCallback((ratio: AspectRatio) => {
    if (!image || !cropArea) return;
    setAspectRatio(ratio);
    if (ratio === "free") return;

    const targetRatio = ASPECT_RATIOS[ratio];
    if (targetRatio === null) return;

    let newWidth = cropArea.width;
    let newHeight = cropArea.height;

    if (cropArea.width / cropArea.height > targetRatio) {
      newWidth = cropArea.height * targetRatio;
    } else {
      newHeight = cropArea.width / targetRatio;
    }

    const newX = cropArea.x + (cropArea.width - newWidth) / 2;
    const newY = cropArea.y + (cropArea.height - newHeight) / 2;

    setCropArea({
      x: Math.max(0, newX),
      y: Math.max(0, newY),
      width: Math.min(newWidth, image.width),
      height: Math.min(newHeight, image.height),
    });
  }, [image, cropArea]);

  // Rotation
  const handleRotate90 = (degrees: number) => {
    setRotation((prev) => {
      let next = prev + degrees;
      if (next > 180) next -= 360;
      if (next < -180) next += 360;
      return next;
    });
    setTimeout(pushHistory, 0);
  };

  const handleFreeRotation = (degrees: number) => {
    setRotation(degrees);
  };

  // Flip
  const handleFlipH = () => {
    setFlipH((prev) => !prev);
    setTimeout(pushHistory, 0);
  };

  const handleFlipV = () => {
    setFlipV((prev) => !prev);
    setTimeout(pushHistory, 0);
  };

  // Presets
  const applyPreset = (preset: FilterPreset) => {
    setFilters({ ...preset.filters });
    setActivePreset(preset.name);
    setTimeout(pushHistory, 0);
  };

  // Reset
  const handleResetFilters = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setActivePreset("Normal");
    setTimeout(pushHistory, 0);
  };

  // Save
  const handleSave = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (blob) onSave(blob);
    }, "image/jpeg", 0.95);
  };

  // Crop drag handlers (document-level for smooth drag)
  const handleCropMouseDown = useCallback((e: React.MouseEvent, handle: HandleType) => {
    if (!cropMode || !cropArea) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [cropMode, cropArea]);

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent) => {
      if (!dragStart || !cropArea || !image || !dragHandle || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = (image.width) / (rect.width / zoom);
      const scaleY = (image.height) / (rect.height / zoom);
      const dx = (e.clientX - dragStart.x) * scaleX;
      const dy = (e.clientY - dragStart.y) * scaleY;

      let { x, y, width, height } = cropArea;
      const minSize = 50;

      if (dragHandle === "move") {
        x = Math.max(0, Math.min(x + dx, image.width - width));
        y = Math.max(0, Math.min(y + dy, image.height - height));
      } else {
        if (dragHandle.includes("w")) { x += dx; width -= dx; }
        if (dragHandle.includes("e")) { width += dx; }
        if (dragHandle.includes("n")) { y += dy; height -= dy; }
        if (dragHandle.includes("s")) { height += dy; }

        if (width < minSize) width = minSize;
        if (height < minSize) height = minSize;

        const targetRatio = ASPECT_RATIOS[aspectRatio];
        if (targetRatio !== null) {
          if (dragHandle.includes("w") || dragHandle.includes("e")) {
            height = width / targetRatio;
          } else {
            width = height * targetRatio;
          }
        }

        x = Math.max(0, x);
        y = Math.max(0, y);
        width = Math.min(width, image.width - x);
        height = Math.min(height, image.height - y);
      }

      setCropArea({ x, y, width, height });
      setDragStart({ x: e.clientX, y: e.clientY });
    };

    const onUp = () => {
      setIsDragging(false);
      setDragStart(null);
      setDragHandle(null);
      pushHistory();
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, dragStart, cropArea, image, dragHandle, aspectRatio, zoom, pushHistory]);

  // Compute crop overlay positions
  const cropOverlay = (() => {
    if (!cropMode || !cropArea || !image || !canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const displayW = rect.width / zoom;
    const displayH = rect.height / zoom;
    const sX = displayW / image.width;
    const sY = displayH / image.height;

    const cx = cropArea.x * sX;
    const cy = cropArea.y * sY;
    const cw = cropArea.width * sX;
    const ch = cropArea.height * sY;

    const handles: { id: HandleType; left: number; top: number; cursor: string }[] = [
      { id: "nw", left: cx, top: cy, cursor: "nw-resize" },
      { id: "n", left: cx + cw / 2, top: cy, cursor: "n-resize" },
      { id: "ne", left: cx + cw, top: cy, cursor: "ne-resize" },
      { id: "e", left: cx + cw, top: cy + ch / 2, cursor: "e-resize" },
      { id: "se", left: cx + cw, top: cy + ch, cursor: "se-resize" },
      { id: "s", left: cx + cw / 2, top: cy + ch, cursor: "s-resize" },
      { id: "sw", left: cx, top: cy + ch, cursor: "sw-resize" },
      { id: "w", left: cx, top: cy + ch / 2, cursor: "w-resize" },
    ];

    return { cx, cy, cw, ch, handles };
  })();

  if (!image) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted">Carregando imagem...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Preview Canvas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Preview com Edições
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center bg-background rounded-lg p-4 overflow-auto">
            <div
              ref={containerRef}
              className="relative inline-block"
              style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
            >
              <canvas
                ref={canvasRef}
                className={`max-w-full max-h-[400px] border-2 ${
                  cropMode ? "border-primary" : "border-border"
                } rounded-lg shadow-lg`}
              />
              {/* Crop overlay */}
              {cropOverlay && (
                <>
                  {/* Draggable crop area */}
                  <div
                    className="absolute border-2 border-white/80 cursor-move shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]"
                    style={{
                      left: cropOverlay.cx,
                      top: cropOverlay.cy,
                      width: cropOverlay.cw,
                      height: cropOverlay.ch,
                    }}
                    onMouseDown={(e) => handleCropMouseDown(e, "move")}
                  >
                    {/* Rule of thirds grid */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
                      <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
                      <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
                      <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
                    </div>
                  </div>
                  {/* 8 resize handles */}
                  {cropOverlay.handles.map((h) => (
                    <div
                      key={h.id}
                      className="absolute bg-white border-2 border-[var(--module-accent,#8B5CF6)] rounded-sm z-10"
                      style={{
                        left: h.left - HANDLE_SIZE / 2,
                        top: h.top - HANDLE_SIZE / 2,
                        width: HANDLE_SIZE,
                        height: HANDLE_SIZE,
                        cursor: h.cursor,
                      }}
                      onMouseDown={(e) => handleCropMouseDown(e, h.id)}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zoom */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ZoomIn className="h-4 w-4" />
            Zoom (Visualização)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Button type="button" size="sm" variant="secondary" onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <input
              type="range"
              min="25"
              max="300"
              value={zoom * 100}
              onChange={(e) => setZoom(Number(e.target.value) / 100)}
              className="flex-1"
            />
            <Button type="button" size="sm" variant="secondary" onClick={() => setZoom((z) => Math.min(3, z + 0.25))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <span className="text-xs text-text font-mono w-12 text-right">{Math.round(zoom * 100)}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Crop */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Crop className="h-4 w-4" />
              Recortar (Crop)
            </CardTitle>
            <Button
              type="button"
              size="sm"
              variant={cropMode ? "default" : "secondary"}
              onClick={() => {
                setCropMode(!cropMode);
                if (cropMode) pushHistory();
              }}
            >
              {cropMode ? "Aplicar" : "Ativar Crop"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ASPECT_RATIOS) as AspectRatio[]).map((ratio) => (
              <Button
                key={ratio}
                type="button"
                size="sm"
                variant={aspectRatio === ratio ? "default" : "secondary"}
                onClick={() => applyCropAspectRatio(ratio)}
                disabled={!cropMode}
              >
                {ratio === "free" ? "Livre" : ratio}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rotação & Flip */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <RotateCw className="h-4 w-4" />
            Rotação & Flip
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Free rotation slider */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text">
              Rotação livre: {rotation}°
            </label>
            <input
              type="range"
              min="-180"
              max="180"
              value={rotation}
              onChange={(e) => handleFreeRotation(Number(e.target.value))}
              onMouseUp={() => pushHistory()}
              onTouchEnd={() => pushHistory()}
              className="w-full"
            />
          </div>
          {/* Quick buttons */}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => handleRotate90(-90)}>
              <RotateCcw className="h-4 w-4" />
              90° Esquerda
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => handleRotate90(90)}>
              <RotateCw className="h-4 w-4" />
              90° Direita
            </Button>
            <Button type="button" size="sm" variant={flipH ? "default" : "secondary"} onClick={handleFlipH}>
              <FlipHorizontal2 className="h-4 w-4" />
              Flip H
            </Button>
            <Button type="button" size="sm" variant={flipV ? "default" : "secondary"} onClick={handleFlipV}>
              <FlipVertical2 className="h-4 w-4" />
              Flip V
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filtros Predefinidos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Filtros Predefinidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {FILTER_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`relative rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                  activePreset === preset.name
                    ? "border-[var(--module-accent,#8B5CF6)] ring-2 ring-[var(--module-accent,#8B5CF6)]/20"
                    : "border-border hover:border-[var(--module-accent,#8B5CF6)]/50"
                }`}
              >
                <div
                  className="aspect-square bg-gray-200"
                  style={{
                    backgroundImage: `url(${imageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: buildFilterString(preset.filters),
                  }}
                />
                <p className={`text-[10px] text-center py-1 font-medium ${
                  activePreset === preset.name ? "text-[var(--module-accent,#8B5CF6)]" : "text-text"
                }`}>
                  {preset.name}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filtros Manuais */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sun className="h-4 w-4" />
              Ajustes Manuais
            </CardTitle>
            <Button type="button" size="sm" variant="ghost" onClick={handleResetFilters}>
              Resetar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Brilho */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text flex items-center gap-2">
              <Sun className="h-3.5 w-3.5" />
              Brilho: {filters.brightness}%
            </label>
            <input
              type="range" min="0" max="200" value={filters.brightness}
              onChange={(e) => setFilters((prev) => ({ ...prev, brightness: Number(e.target.value) }))}
              onMouseUp={() => pushHistory()} className="w-full"
            />
          </div>

          {/* Contraste */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text flex items-center gap-2">
              <Contrast className="h-3.5 w-3.5" />
              Contraste: {filters.contrast}%
            </label>
            <input
              type="range" min="0" max="200" value={filters.contrast}
              onChange={(e) => setFilters((prev) => ({ ...prev, contrast: Number(e.target.value) }))}
              onMouseUp={() => pushHistory()} className="w-full"
            />
          </div>

          {/* Saturação */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text flex items-center gap-2">
              <Droplets className="h-3.5 w-3.5" />
              Saturação: {filters.saturation}%
            </label>
            <input
              type="range" min="0" max="200" value={filters.saturation}
              onChange={(e) => setFilters((prev) => ({ ...prev, saturation: Number(e.target.value) }))}
              onMouseUp={() => pushHistory()} className="w-full"
            />
          </div>

          {/* Desfoque */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text">
              Desfoque: {filters.blur}px
            </label>
            <input
              type="range" min="0" max="10" value={filters.blur}
              onChange={(e) => setFilters((prev) => ({ ...prev, blur: Number(e.target.value) }))}
              onMouseUp={() => pushHistory()} className="w-full"
            />
          </div>

          {/* Matiz */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text">
              Matiz (Hue): {filters.hueRotate}°
            </label>
            <input
              type="range" min="0" max="360" value={filters.hueRotate}
              onChange={(e) => setFilters((prev) => ({ ...prev, hueRotate: Number(e.target.value) }))}
              onMouseUp={() => pushHistory()} className="w-full"
            />
          </div>

          {/* Sépia */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text">
              Sépia: {filters.sepia}%
            </label>
            <input
              type="range" min="0" max="100" value={filters.sepia}
              onChange={(e) => setFilters((prev) => ({ ...prev, sepia: Number(e.target.value) }))}
              onMouseUp={() => pushHistory()} className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex gap-3 justify-between">
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleUndo} disabled={!canUndo} title="Desfazer (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
            Desfazer
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={handleRedo} disabled={!canRedo} title="Refazer (Ctrl+Shift+Z)">
            <Redo2 className="h-4 w-4" />
            Refazer
          </Button>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="ghost" onClick={onCancel}>
            <X className="h-4 w-4" />
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave}>
            <Check className="h-4 w-4" />
            Salvar Edições
          </Button>
        </div>
      </div>
    </div>
  );
}
