import React, { useState, useId } from 'react';
import {
  ExternalLink,
  RefreshCw,
  Maximize2,
  Minimize2,
  HardDrive,
  LayoutGrid,
  List,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';

interface GoogleDriveWebviewProps {
  url: string;
  title?: string;
  subtitle?: string;
  initialHeight?: number;
  allowToggleViewMode?: boolean;
  className?: string;
  showControls?: boolean;
  compact?: boolean;
}

/**
 * Extracts the Google Drive folder or file ID and formats it as an embeddable URL.
 */
export function getDriveEmbedUrl(rawUrl: string, mode: 'grid' | 'list' = 'grid'): {
  embedUrl: string;
  type: 'folder' | 'file' | 'doc' | 'sheet' | 'slide' | 'unknown';
  id: string | null;
} {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { embedUrl: '', type: 'unknown', id: null };
  }

  const url = rawUrl.trim();

  // If already an embedded folderview
  if (url.includes('embeddedfolderview')) {
    const cleanUrl = url.replace(/#(grid|list)/g, '');
    return {
      embedUrl: `${cleanUrl}#${mode}`,
      type: 'folder',
      id: url.match(/id=([^&#]+)/)?.[1] || null,
    };
  }

  // Google Drive Folder URL pattern
  // Matches /folders/ID or ?id=ID
  const folderMatch =
    url.match(/\/folders\/([a-zA-Z0-9_-]+)/) ||
    url.match(/[?&]id=([a-zA-Z0-9_-]+)/);

  if (url.includes('drive.google.com') && folderMatch && !url.includes('/file/d/')) {
    const folderId = folderMatch[1];
    return {
      embedUrl: `https://drive.google.com/embeddedfolderview?id=${folderId}#${mode}`,
      type: 'folder',
      id: folderId,
    };
  }

  // Google Docs
  const docMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) {
    return {
      embedUrl: `https://docs.google.com/document/d/${docMatch[1]}/preview`,
      type: 'doc',
      id: docMatch[1],
    };
  }

  // Google Sheets
  const sheetMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch) {
    return {
      embedUrl: `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/preview`,
      type: 'sheet',
      id: sheetMatch[1],
    };
  }

  // Google Slides
  const slideMatch = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (slideMatch) {
    return {
      embedUrl: `https://docs.google.com/presentation/d/${slideMatch[1]}/preview`,
      type: 'slide',
      id: slideMatch[1],
    };
  }

  // Standard Google Drive File
  const fileMatch =
    url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);

  if (fileMatch) {
    return {
      embedUrl: `https://drive.google.com/file/d/${fileMatch[1]}/preview`,
      type: 'file',
      id: fileMatch[1],
    };
  }

  // Fallback: If it's a generic link
  return {
    embedUrl: url,
    type: 'unknown',
    id: null,
  };
}

export const GoogleDriveWebview: React.FC<GoogleDriveWebviewProps> = ({
  url,
  title = 'Google Drive Embedded Webview',
  subtitle,
  initialHeight = 420,
  allowToggleViewMode = true,
  className = '',
  showControls = true,
  compact = false,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const uniqueIframeId = useId();

  if (!url || !url.trim()) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-slate-500 font-mono text-xs">
        <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-2" />
        <p className="font-bold text-slate-700">No Google Drive Link Provided</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Edit this folder to embed a valid Google Drive folder or document link.
        </p>
      </div>
    );
  }

  const { embedUrl, type, id: extractedId } = getDriveEmbedUrl(url, viewMode);
  const effectiveHeight = isExpanded ? 650 : initialHeight;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div
      className={`bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs transition-all ${className}`}
    >
      {showControls && (
        <div className="bg-slate-900 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <HardDrive className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-xs text-white truncate">{title}</span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase shrink-0">
                  {type === 'folder' ? 'Folder Webview' : `${type.toUpperCase()} Preview`}
                </span>
              </div>
              {subtitle && (
                <p className="text-[10px] text-slate-400 font-mono truncate">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0 text-xs font-mono">
            {type === 'folder' && allowToggleViewMode && !compact && (
              <div className="bg-slate-800 p-0.5 rounded-lg border border-slate-700 flex space-x-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('grid');
                    setRefreshKey((prev) => prev + 1);
                  }}
                  className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Grid Cards View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('list');
                    setRefreshKey((prev) => prev + 1);
                  }}
                  className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="List Details View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleRefresh}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer border border-slate-700"
              title="Refresh Webview"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer border border-slate-700"
              title="Copy Google Drive URL"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer border border-slate-700"
              title={isExpanded ? 'Collapse Height' : 'Expand Height'}
            >
              {isExpanded ? (
                <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
              )}
            </button>

            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all flex items-center space-x-1 shadow-2xs border border-emerald-500"
              title="Open Google Drive in new browser tab"
            >
              <span className="hidden sm:inline text-[11px]">Drive</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Webview Iframe Container */}
      <div
        className="relative bg-slate-100 w-full transition-all duration-300"
        style={{ height: `${effectiveHeight}px` }}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center z-10 font-mono text-slate-500 space-y-2">
            <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
            <span className="text-xs font-bold text-slate-700">Loading Google Drive Preview...</span>
            <span className="text-[11px] text-slate-400">Embedding direct cloud workspace</span>
          </div>
        )}

        <iframe
          key={`${refreshKey}-${viewMode}-${embedUrl}`}
          id={uniqueIframeId}
          src={embedUrl}
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-0 bg-white"
          title={title}
          allow="autoplay; encrypted-media; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
        />
      </div>

      {/* Bottom Bar Info / Hints */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-600">
        <div className="flex items-center space-x-2 truncate max-w-lg">
          <span className="font-bold text-slate-800">Target ID:</span>
          <span className="text-slate-500 truncate font-semibold">{extractedId || url}</span>
        </div>
        <div className="flex items-center space-x-3 text-[10px]">
          <span className="text-emerald-700 font-bold flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
            <span>Live Webview Sync</span>
          </span>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline flex items-center space-x-0.5 font-bold"
          >
            <span>Open in App</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
