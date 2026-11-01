'use client';

import { useEffect, useRef, useState } from 'react';

interface VideoQuality {
  height: number;
  label: string;
  filesize?: number;
  formattedSize?: string;
  formatId?: string;
}

interface VideoMetadata {
  valid: boolean;
  url: string;
  title: string;
  duration: number;
  formattedDuration: string;
  thumbnail?: string;
  uploader?: string;
  platform?: string;
  qualities: VideoQuality[];
  defaultQuality?: number;
  error?: string;
}

interface JobStatusResponse {
  jobId: string;
  status: 'validating' | 'queued' | 'processing' | 'completed' | 'failed';
  step: string;
  progress: number;
  error: string | null;
  fileName?: string;
  fileSize?: number;
  isFullVideo?: boolean;
  selectedQuality?: number;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [isFetchingVideo, setIsFetchingVideo] = useState(false);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);

  // Settings
  const [selectedQuality, setSelectedQuality] = useState<number | ''>('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [downloadReady, setDownloadReady] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState<{ fileName?: string; fileSize?: number } | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  // Step 2 & 3: Fetch video metadata
  const handleFetchVideo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setMetaError('Please enter a video URL first.');
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setMetaError('Please provide a complete URL starting with https://');
      return;
    }

    setIsFetchingVideo(true);
    setMetaError(null);
    setErrorMessage(null);
    setDownloadReady(false);

    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        setMetaError(data.error || 'Unable to inspect video at this URL.');
        setMetadata(null);
      } else {
        setMetadata(data);
        setMetaError(null);

        // Set default quality selection
        if (data.defaultQuality) {
          setSelectedQuality(data.defaultQuality);
        } else if (data.qualities && data.qualities.length > 0) {
          setSelectedQuality(data.qualities[0].height);
        }

        // Reset timestamps to empty by default (Full Video download default)
        setStartTime('');
        setEndTime('');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch video information.';
      setMetaError(msg);
      setMetadata(null);
    } finally {
      setIsFetchingVideo(false);
    }
  };

  const triggerDownload = (jobId: string, customFileName?: string) => {
    const downloadUrl = `/api/download/${jobId}`;
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = customFileName || `video_${jobId.substring(0, 8)}.mp4`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  // Step 7: Handle download submission
  const handleStartDownload = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setErrorMessage('Please enter a video URL.');
      return;
    }

    const trimmedStart = startTime.trim();
    const trimmedEnd = endTime.trim();

    // Timestamp rule: If one provided, both must be provided
    const hasStart = trimmedStart.length > 0;
    const hasEnd = trimmedEnd.length > 0;

    if ((hasStart && !hasEnd) || (!hasStart && hasEnd)) {
      setErrorMessage('Please enter both start and end timestamps, or leave both empty to download the full video.');
      return;
    }

    // Reset processing state
    setErrorMessage(null);
    setIsProcessing(true);
    setDownloadReady(false);
    setDownloadInfo(null);
    setProgress(5);
    setCurrentStep('Validating video URL...');

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: trimmedUrl,
          quality: selectedQuality || undefined,
          startTime: trimmedStart || undefined,
          endTime: trimmedEnd || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start video processing.');
      }

      const jobId = data.jobId;
      setActiveJobId(jobId);
      setCurrentStep('Processing video...');
      setProgress(15);

      // Start Polling for status
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/status/${jobId}`);
          if (!statusRes.ok) {
            const errJson = await statusRes.json().catch(() => ({}));
            throw new Error(errJson.error || 'Failed to retrieve job status.');
          }

          const statusData: JobStatusResponse = await statusRes.json();

          if (statusData.status === 'processing' || statusData.status === 'queued') {
            setCurrentStep(statusData.step || 'Processing video...');
            setProgress(statusData.progress || 30);
          } else if (statusData.status === 'completed') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setCurrentStep('Preparing download...');
            setProgress(100);

            setTimeout(() => {
              setCurrentStep('Download completed.');
              setDownloadReady(true);
              setIsProcessing(false);
              setDownloadInfo({
                fileName: statusData.fileName,
                fileSize: statusData.fileSize,
              });

              // Automatically trigger file download
              triggerDownload(jobId, statusData.fileName);
            }, 600);
          } else if (statusData.status === 'failed') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setIsProcessing(false);
            setErrorMessage(statusData.error || 'Video processing failed. Please check inputs and try again.');
          }
        } catch (pollErr: unknown) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setIsProcessing(false);
          const msg = pollErr instanceof Error ? pollErr.message : 'Error polling status';
          setErrorMessage(msg);
        }
      }, 1000);
    } catch (err: unknown) {
      setIsProcessing(false);
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMessage(msg);
    }
  };

  const handleReset = () => {
    setIsProcessing(false);
    setDownloadReady(false);
    setErrorMessage(null);
    setCurrentStep('');
    setProgress(0);
    setActiveJobId(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 font-sans">
      {/* Header */}
      <header className="border-b border-neutral-200 py-4 px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-black">ClipDown</span>
        </div>
        <nav className="text-xs text-neutral-500 font-medium">Video Trimmer & Downloader</nav>
      </header>

      {/* Main Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-16">
        <div className="w-full max-w-xl mx-auto space-y-6">
          {/* Heading & Subtitle */}
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 mb-2">
              Download Any Clip You Want
            </h1>
            <p className="text-sm md:text-base text-neutral-600">
              Paste a video link, select quality and preferred time range, or download the full video.
            </p>
          </div>

          {/* Section A: Video URL */}
          <div className="space-y-2">
            <label htmlFor="video-url" className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Video URL
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="video-url"
                type="url"
                required
                disabled={isProcessing || isFetchingVideo}
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (metaError) setMetaError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleFetchVideo();
                  }
                }}
                placeholder="Paste your video URL here…"
                className="flex-1 px-4 py-3 text-sm md:text-base bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-colors disabled:bg-neutral-50"
              />
              <button
                type="button"
                id="fetch-video-button"
                disabled={isFetchingVideo || isProcessing || !url.trim()}
                onClick={() => handleFetchVideo()}
                className="px-5 py-3 rounded-lg text-sm font-semibold text-white bg-black hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0"
              >
                {isFetchingVideo ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Fetching...</span>
                  </>
                ) : (
                  <span>Fetch Video</span>
                )}
              </button>
            </div>

            {metaError && <p className="text-xs text-red-600 pt-1">{metaError}</p>}
          </div>

          {/* Section B: Video Preview (Only displayed after successfully fetching metadata) */}
          {metadata && (
            <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50 space-y-3">
              <div className="flex items-start gap-3.5">
                {metadata.thumbnail ? (
                  <img
                    src={metadata.thumbnail}
                    alt={metadata.title}
                    className="w-24 h-16 object-cover rounded border border-neutral-200 flex-shrink-0 bg-neutral-100"
                  />
                ) : (
                  <div className="w-24 h-16 bg-neutral-200 rounded flex items-center justify-center text-xs text-neutral-500 flex-shrink-0">
                    Video
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-neutral-900 line-clamp-2">{metadata.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-neutral-500">
                    {metadata.uploader && <span>{metadata.uploader}</span>}
                    {metadata.uploader && <span>•</span>}
                    <span>Duration: {metadata.formattedDuration || 'Unknown'}</span>
                  </div>
                </div>
              </div>

              {/* Available Qualities Tags */}
              {metadata.qualities && metadata.qualities.length > 0 && (
                <div className="pt-2 border-t border-neutral-200/80">
                  <p className="text-[11px] font-medium text-neutral-500 mb-1.5">Available Resolutions:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {metadata.qualities.map((q) => (
                      <span
                        key={q.height}
                        className={`text-[11px] px-2 py-0.5 rounded border ${
                          selectedQuality === q.height
                            ? 'bg-neutral-900 text-white border-neutral-900 font-medium'
                            : 'bg-white text-neutral-700 border-neutral-300'
                        }`}
                      >
                        {q.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section C: Download Settings (Quality & Timestamps) */}
          {metadata && (
            <form onSubmit={handleStartDownload} className="space-y-5">
              {/* Quality Dropdown */}
              <div>
                <label
                  htmlFor="quality-selector"
                  className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5"
                >
                  Video Quality
                </label>
                <select
                  id="quality-selector"
                  disabled={isProcessing}
                  value={selectedQuality}
                  onChange={(e) => setSelectedQuality(parseInt(e.target.value, 10))}
                  className="w-full px-3.5 py-2.5 text-sm md:text-base bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-colors disabled:bg-neutral-50"
                >
                  {metadata.qualities.map((q) => (
                    <option key={q.height} value={q.height}>
                      {q.label} {q.formattedSize ? `(${q.formattedSize})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Timestamp Inputs */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="start-time"
                        className="block text-xs font-semibold uppercase tracking-wider text-neutral-700"
                      >
                        Start Time
                      </label>
                      <span className="text-[10px] text-neutral-400">HH:MM:SS</span>
                    </div>
                    <input
                      id="start-time"
                      type="text"
                      disabled={isProcessing}
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      placeholder="00:00:00"
                      className="w-full px-3.5 py-2.5 text-sm md:text-base font-mono bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-colors disabled:bg-neutral-50"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="end-time"
                        className="block text-xs font-semibold uppercase tracking-wider text-neutral-700"
                      >
                        End Time
                      </label>
                      <span className="text-[10px] text-neutral-400">HH:MM:SS</span>
                    </div>
                    <input
                      id="end-time"
                      type="text"
                      disabled={isProcessing}
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      placeholder={metadata.formattedDuration || '00:00:30'}
                      className="w-full px-3.5 py-2.5 text-sm md:text-base font-mono bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-colors disabled:bg-neutral-50"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs text-neutral-500">
                  <p>Leave both fields empty to download the entire video.</p>
                  {(startTime || endTime) && (
                    <button
                      type="button"
                      onClick={() => {
                        setStartTime('');
                        setEndTime('');
                      }}
                      className="text-[11px] underline text-neutral-700 hover:text-black cursor-pointer"
                    >
                      Clear (Full Video)
                    </button>
                  )}
                </div>
              </div>

              {/* Section D: Download Button */}
              <div>
                <button
                  id="download-button"
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3.5 px-6 rounded-lg text-sm md:text-base font-semibold text-white bg-black hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>{currentStep || 'Processing video...'}</span>
                    </>
                  ) : (
                    <span>Download Video</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Processing States & Progress Bar */}
          {isProcessing && (
            <div className="p-4 border border-neutral-200 rounded-lg bg-neutral-50">
              <div className="flex items-center justify-between text-xs font-medium text-neutral-700 mb-2">
                <span>{currentStep}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-neutral-900 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="mt-2 text-[11px] text-neutral-500 text-center">
                Processing video streams and generating MP4. Please wait a moment.
              </p>
            </div>
          )}

          {/* Download Completed State */}
          {downloadReady && activeJobId && (
            <div className="p-4 border border-neutral-200 rounded-lg bg-neutral-50 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>Download completed.</span>
              </div>
              <p className="text-xs text-neutral-600">
                {downloadInfo?.fileName && <span className="font-mono">{downloadInfo.fileName}</span>}
                {downloadInfo?.fileSize ? ` (${formatFileSize(downloadInfo.fileSize)})` : ''}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => triggerDownload(activeJobId, downloadInfo?.fileName)}
                  className="flex-1 py-2 px-4 rounded-lg text-xs font-medium bg-neutral-900 text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Download Again (.mp4)
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="py-2 px-4 rounded-lg text-xs font-medium border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Download Another
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 border border-red-200 rounded-lg bg-red-50 text-red-700 text-xs flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <span className="font-bold flex-shrink-0">Error:</span>
                <span className="flex-1">{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="self-end text-[11px] underline hover:text-red-900 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-6 px-6 text-center text-xs text-neutral-500">
        <p>© 2026 ClipDown. Minimal video trimming & downloading utility.</p>
      </footer>
    </div>
  );
}
