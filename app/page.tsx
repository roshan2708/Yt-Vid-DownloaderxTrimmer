'use client';

import { useEffect, useRef, useState } from 'react';

interface VideoMetadata {
  valid: boolean;
  url: string;
  title: string;
  duration: number;
  formattedDuration: string;
  thumbnail?: string;
  uploader?: string;
  platform?: string;
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
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [startTime, setStartTime] = useState('00:00:00');
  const [endTime, setEndTime] = useState('00:00:30');

  // Metadata preview state
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);

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

  // Format file size helper
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  // URL blur/change handler to auto-fetch video details
  const handleValidateUrl = async (targetUrl: string) => {
    const trimmed = targetUrl.trim();
    if (!trimmed) {
      setMetadata(null);
      setMetaError(null);
      return;
    }

    // Basic client check
    try {
      new URL(trimmed);
    } catch {
      setMetaError('Please enter a valid URL (e.g. https://...)');
      setMetadata(null);
      return;
    }

    setIsValidatingUrl(true);
    setMetaError(null);

    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        setMetaError(data.error || 'Unable to inspect video at this URL.');
        setMetadata(null);
      } else {
        setMetadata(data);
        setMetaError(null);
        // If end time is default and duration is available, adjust end time sensibly
        if (data.formattedDuration && data.duration > 0) {
          if (data.duration <= 30) {
            setEndTime(data.formattedDuration);
          } else if (endTime === '00:00:30' || endTime === '00:00:00') {
            setEndTime('00:00:30');
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Validation request failed';
      setMetaError(msg);
      setMetadata(null);
    } finally {
      setIsValidatingUrl(false);
    }
  };

  // Trigger download file
  const triggerDownload = (jobId: string, customFileName?: string) => {
    const downloadUrl = `/api/download/${jobId}`;
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = customFileName || `clip_${jobId.substring(0, 8)}.mp4`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  // Start processing & trimming
  const handleStartDownload = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setErrorMessage('Please enter a video URL.');
      return;
    }

    // Basic timestamp format validation
    const timeRegex = /^(\d{1,2}:)?[0-5]?\d:[0-5]\d$/;
    const isStartTimeValid = timeRegex.test(startTime.trim()) || /^\d+$/.test(startTime.trim());
    const isEndTimeValid = timeRegex.test(endTime.trim()) || /^\d+$/.test(endTime.trim());

    if (!isStartTimeValid) {
      setErrorMessage('Invalid start time format. Use HH:MM:SS (e.g., 00:00:00).');
      return;
    }

    if (!isEndTimeValid) {
      setErrorMessage('Invalid end time format. Use HH:MM:SS (e.g., 00:01:30).');
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
          startTime: startTime.trim(),
          endTime: endTime.trim(),
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

          if (statusData.status === 'processing') {
            setCurrentStep(statusData.step || 'Processing video...');
            setProgress(statusData.progress || 35);
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
            setErrorMessage(statusData.error || 'Video processing failed. Please check timestamps and try again.');
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
        <nav className="text-xs text-neutral-500 font-medium">Video Trimmer</nav>
      </header>

      {/* Main Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-16">
        <div className="w-full max-w-xl mx-auto">
          {/* Heading & Subtitle */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 mb-2">
              Download Any Clip You Want
            </h1>
            <p className="text-sm md:text-base text-neutral-600">
              Paste a video link, select your preferred time range, and download your clip.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleStartDownload} className="space-y-5">
            {/* 1. Video URL Field */}
            <div>
              <label htmlFor="video-url" className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                Video URL
              </label>
              <div className="relative">
                <input
                  id="video-url"
                  type="url"
                  required
                  disabled={isProcessing}
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (metaError) setMetaError(null);
                  }}
                  onBlur={() => handleValidateUrl(url)}
                  placeholder="Paste your video URL here…"
                  className="w-full px-4 py-3 text-sm md:text-base bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-colors disabled:bg-neutral-50 disabled:text-neutral-500"
                />
                {isValidatingUrl && (
                  <div className="absolute right-3 top-3 text-xs text-neutral-500 flex items-center gap-1.5">
                    <span className="inline-block w-3.5 h-3.5 border-2 border-neutral-400 border-t-neutral-900 rounded-full animate-spin"></span>
                    <span>Checking...</span>
                  </div>
                )}
              </div>

              {metaError && (
                <p className="mt-1.5 text-xs text-red-600">{metaError}</p>
              )}

              {/* Video Preview Info */}
              {metadata && (
                <div className="mt-2.5 p-3 border border-neutral-200 rounded-lg bg-neutral-50 flex items-center gap-3">
                  {metadata.thumbnail && (
                    <img
                      src={metadata.thumbnail}
                      alt={metadata.title}
                      className="w-16 h-10 object-cover rounded border border-neutral-200 flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-neutral-900 truncate">
                      {metadata.title}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {metadata.uploader && <span>{metadata.uploader} • </span>}
                      <span>Duration: {metadata.formattedDuration || 'Unknown'}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Timestamps Section */}
            <div className="grid grid-cols-2 gap-4">
              {/* 2. Start Time */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="start-time" className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    Start Time
                  </label>
                  <span className="text-[10px] text-neutral-400">HH:MM:SS</span>
                </div>
                <input
                  id="start-time"
                  type="text"
                  required
                  disabled={isProcessing}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="00:00:00"
                  className="w-full px-3.5 py-2.5 text-sm md:text-base font-mono bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-colors disabled:bg-neutral-50"
                />
              </div>

              {/* 3. End Time */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="end-time" className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    End Time
                  </label>
                  <span className="text-[10px] text-neutral-400">HH:MM:SS</span>
                </div>
                <input
                  id="end-time"
                  type="text"
                  required
                  disabled={isProcessing}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="00:00:30"
                  className="w-full px-3.5 py-2.5 text-sm md:text-base font-mono bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-colors disabled:bg-neutral-50"
                />
              </div>
            </div>

            {/* 4. Download Button */}
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
                  <span>Download Clip</span>
                )}
              </button>
            </div>
          </form>

          {/* Processing States & Feedback */}
          {isProcessing && (
            <div className="mt-6 p-4 border border-neutral-200 rounded-lg bg-neutral-50">
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
                Processing video on backend with FFmpeg. This may take a few moments.
              </p>
            </div>
          )}

          {/* Download Completed State */}
          {downloadReady && activeJobId && (
            <div className="mt-6 p-4 border border-neutral-200 rounded-lg bg-neutral-50 space-y-3">
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
                  Trim Another
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-6 p-4 border border-red-200 rounded-lg bg-red-50 text-red-700 text-xs flex flex-col gap-2">
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
        <p>© 2026 ClipDown. Minimal video trimming utility.</p>
      </footer>
    </div>
  );
}
