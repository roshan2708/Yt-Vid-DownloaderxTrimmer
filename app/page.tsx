'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/src/components/Navbar';
import Footer from '@/src/components/Footer';
import { User } from 'firebase/auth';
import {
  checkRedirectResult,
  getCurrentIdToken,
  onAuthStateChange,
  signInWithGoogle,
} from '@/src/lib/auth';

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
  quotaRefunded?: boolean;
}

interface UserQuota {
  userId: string;
  tier: 'free' | 'pro' | 'studio' | 'daypass';
  tierName: string;
  quotaCycle?: 'daily' | 'monthly';
  quotaLimit?: number;
  quotaUsed?: number;
  remainingQuota?: number;
  trimsToday: number;
  dailyLimit: number;
  remainingToday: number;
  bonusCredits: number;
  totalRemaining: number;
  secondsUntilReset: number;
  maxQuality: number;
  maxClipDurationSec: number;
  maxSourceDurationSec: number;
}

export default function Home() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // User Quota state
  const [userQuota, setUserQuota] = useState<UserQuota | null>(null);

  // Form input state
  const [url, setUrl] = useState('');
  const [isFetchingVideo, setIsFetchingVideo] = useState(false);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);

  // Download settings
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

  // Fetch live quota for current user
  const refreshUserQuota = useCallback(async () => {
    try {
      const token = await getCurrentIdToken();
      if (!token) return;

      const res = await fetch('/api/quota', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data: UserQuota = await res.json();
        setUserQuota(data);
      }
    } catch (err) {
      console.warn('Failed to fetch user quota:', err);
    }
  }, []);

  // Subscribe to Firebase Auth state on mount
  useEffect(() => {
    checkRedirectResult().catch((err) => console.warn('Redirect check:', err));

    const unsubscribe = onAuthStateChange((user) => {
      setCurrentUser(user);
    });

    return () => {
      unsubscribe();
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Fetch quota when user logs in
  useEffect(() => {
    if (currentUser) {
      refreshUserQuota();
    } else {
      setUserQuota(null);
    }
  }, [currentUser, refreshUserQuota]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const formatCountdown = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  // Google Sign-In handler
  const handleGoogleSignIn = async (): Promise<User | null> => {
    try {
      const user = await signInWithGoogle();
      setCurrentUser(user);
      return user;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      if (msg !== 'REDIRECTING') {
        setErrorMessage(msg);
      }
      return null;
    }
  };

  // Fetch video metadata
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

        // Cap default quality to user's tier allowed max if known
        const maxAllowed = userQuota?.maxQuality || 720;
        if (data.defaultQuality && data.defaultQuality <= maxAllowed) {
          setSelectedQuality(data.defaultQuality);
        } else if (data.qualities && data.qualities.length > 0) {
          const compatible = data.qualities.find((q: VideoQuality) => q.height <= maxAllowed);
          setSelectedQuality(compatible ? compatible.height : data.qualities[0].height);
        }

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

  // Trigger authenticated download file
  const triggerDownload = async (jobId: string, customFileName?: string) => {
    const token = await getCurrentIdToken();
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
    const downloadUrl = `/api/download/${jobId}${tokenQuery}`;

    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = customFileName || `video_${jobId.substring(0, 8)}.mp4`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  // Start download execution with token
  const executeDownloadWithUser = async (user: User) => {
    const trimmedUrl = url.trim();
    const trimmedStart = startTime.trim();
    const trimmedEnd = endTime.trim();

    const hasStart = trimmedStart.length > 0;
    const hasEnd = trimmedEnd.length > 0;

    if ((hasStart && !hasEnd) || (!hasStart && hasEnd)) {
      setErrorMessage('Please enter both start and end timestamps, or leave both empty to download the full video.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setDownloadReady(false);
    setDownloadInfo(null);
    setProgress(5);
    setCurrentStep('Validating video URL...');

    try {
      const idToken = await user.getIdToken();
      if (!idToken) {
        throw new Error('Unable to obtain authentication token. Please sign in again.');
      }

      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          url: trimmedUrl,
          quality: selectedQuality || undefined,
          startTime: trimmedStart || undefined,
          endTime: trimmedEnd || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Refresh quota so UI reflects current limits
        refreshUserQuota();
        throw new Error(data.error || 'Failed to start video processing.');
      }

      // Immediately refresh quota counter
      refreshUserQuota();

      const jobId = data.jobId;
      setActiveJobId(jobId);
      setCurrentStep('Processing video...');
      setProgress(15);

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

              triggerDownload(jobId, statusData.fileName);
              refreshUserQuota();
            }, 600);
          } else if (statusData.status === 'failed') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setIsProcessing(false);

            const refundMsg = statusData.quotaRefunded
              ? ' (Your trim quota was not deducted - 1 trim restored).'
              : '';
            setErrorMessage((statusData.error || 'Video processing failed.') + refundMsg);
            refreshUserQuota();
          }
        } catch (pollErr: unknown) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setIsProcessing(false);
          const msg = pollErr instanceof Error ? pollErr.message : 'Error polling status';
          setErrorMessage(msg);
          refreshUserQuota();
        }
      }, 1000);
    } catch (err: unknown) {
      setIsProcessing(false);
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMessage(msg);
    }
  };

  const handleStartDownload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setErrorMessage('Please enter a video URL.');
      return;
    }

    if (!currentUser) {
      const user = await handleGoogleSignIn();
      if (user) {
        await executeDownloadWithUser(user);
      }
      return;
    }

    await executeDownloadWithUser(currentUser);
  };

  const handleReset = () => {
    setIsProcessing(false);
    setDownloadReady(false);
    setErrorMessage(null);
    setCurrentStep('');
    setProgress(0);
    setActiveJobId(null);
  };

  const isDaily = userQuota?.quotaCycle !== 'monthly';
  const cycleName = isDaily ? 'Daily' : 'Monthly';
  const cycleLabel = isDaily ? 'daily' : 'monthly';
  const limitCount = userQuota?.quotaLimit ?? userQuota?.dailyLimit ?? 3;
  const remainingCount = userQuota?.remainingQuota ?? userQuota?.remainingToday ?? 3;

  const isLimitReached = Boolean(
    currentUser &&
      userQuota &&
      remainingCount === 0 &&
      userQuota.bonusCredits === 0
  );

  const isQualityRestricted = Boolean(
    metadata &&
      userQuota &&
      typeof selectedQuality === 'number' &&
      selectedQuality > userQuota.maxQuality
  );

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 font-sans">
      {/* Standard Unified Header */}
      <Navbar />

      {/* Main Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 md:py-14">
        <div className="w-full max-w-xl mx-auto space-y-6">
          {/* Heading */}
          <div className="text-center mb-4">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 mb-2">
              Download Any Clip You Want
            </h1>
            <p className="text-sm md:text-base text-neutral-600">
              Paste a video link, select quality and start/end timestamps, and download pristine MP4 clips.
            </p>
          </div>

          {/* Signed-in Quota Status Card */}
          {currentUser && userQuota && (
            <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-neutral-900 text-white">
                    {userQuota.tierName}
                  </span>
                  <span className="font-medium text-neutral-800">
                    <strong>{remainingCount}</strong> of {limitCount} {cycleLabel} trims remaining
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  {isDaily
                    ? `Resets in ${formatCountdown(userQuota.secondsUntilReset)} (00:00 UTC)`
                    : 'Resets on the 1st of next month'}
                  {userQuota.bonusCredits > 0 && ` • +${userQuota.bonusCredits} bonus credits available`}
                </p>
              </div>
              <Link
                href="/pricing"
                className="text-xs font-semibold text-neutral-900 hover:text-black underline flex items-center gap-1"
              >
                <span>Upgrade</span>
                <span>→</span>
              </Link>
            </div>
          )}

          {/* Section A: URL Input Form */}
          <div className="space-y-2">
            <label
              htmlFor="video-url"
              className="block text-xs font-semibold uppercase tracking-wider text-neutral-700"
            >
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

          {/* Section B: Video Preview */}
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
                    {metadata.qualities.map((q) => {
                      const isProRes = q.height > (userQuota?.maxQuality || 720);
                      return (
                        <button
                          key={q.height}
                          type="button"
                          onClick={() => setSelectedQuality(q.height)}
                          className={`text-[11px] px-2 py-0.5 rounded border transition-colors cursor-pointer flex items-center gap-1 ${
                            selectedQuality === q.height
                              ? 'bg-neutral-900 text-white border-neutral-900 font-medium'
                              : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                          }`}
                        >
                          <span>{q.label}</span>
                          {isProRes && (
                            <span className="text-[9px] font-bold px-1 rounded bg-amber-100 text-amber-800">
                              PRO
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section C: Download Settings */}
          {metadata && (
            <form onSubmit={handleStartDownload} className="space-y-5">
              {/* Quality Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="quality-selector"
                    className="block text-xs font-semibold uppercase tracking-wider text-neutral-700"
                  >
                    Video Quality
                  </label>
                  {isQualityRestricted && (
                    <Link
                      href="/pricing"
                      className="text-[11px] text-amber-700 font-semibold hover:underline"
                    >
                      Requires Creator Pro Plan →
                    </Link>
                  )}
                </div>
                <select
                  id="quality-selector"
                  disabled={isProcessing}
                  value={selectedQuality}
                  onChange={(e) => setSelectedQuality(parseInt(e.target.value, 10))}
                  className="w-full px-3.5 py-2.5 text-sm md:text-base bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-colors disabled:bg-neutral-50"
                >
                  {metadata.qualities.map((q) => {
                    const isProRes = q.height > (userQuota?.maxQuality || 720);
                    return (
                      <option key={q.height} value={q.height}>
                        {q.label} {q.formattedSize ? `(${q.formattedSize})` : ''} {isProRes ? '— [PRO]' : ''}
                      </option>
                    );
                  })}
                </select>
                {isQualityRestricted && (
                  <p className="mt-1 text-xs text-amber-700">
                    1080p and 4K UHD resolutions require Creator Pro. On Starter (Free), please select 720p HD or upgrade.
                  </p>
                )}
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
                  <p>Leave both fields empty to download the full video.</p>
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
                  disabled={isProcessing || isLimitReached}
                  className="w-full py-3.5 px-6 rounded-lg text-sm md:text-base font-semibold text-white bg-black hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>{currentStep || 'Processing video...'}</span>
                    </>
                  ) : isLimitReached ? (
                    <span>{cycleName} Limit Reached ({limitCount}/{limitCount} Used)</span>
                  ) : !currentUser ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Sign in with Google & Download</span>
                    </span>
                  ) : (
                    <span>Download Video Clip</span>
                  )}
                </button>

                {isLimitReached && (
                  <div className="mt-2 text-center text-xs text-neutral-600">
                    <span>
                      {isDaily
                        ? 'You have reached your daily quota. Resets at 00:00 UTC. '
                        : 'You have reached your monthly trim quota. Resets next month. '}
                    </span>
                    <Link href="/pricing" className="font-semibold text-neutral-900 underline hover:text-black">
                      Upgrade Plan or Top Up Credits →
                    </Link>
                  </div>
                )}
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

          {/* Error Message with Automatic Refund Notice */}
          {errorMessage && (
            <div className="p-4 border border-red-200 rounded-lg bg-red-50 text-red-700 text-xs flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <span className="font-bold flex-shrink-0">Notice:</span>
                <span className="flex-1">{errorMessage}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                {errorMessage.includes('require') || errorMessage.includes('limit') ? (
                  <Link
                    href="/pricing"
                    className="text-[11px] font-semibold text-neutral-900 underline hover:text-black"
                  >
                    View Pricing &amp; Passes →
                  </Link>
                ) : (
                  <span></span>
                )}
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-[11px] underline hover:text-red-900 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
