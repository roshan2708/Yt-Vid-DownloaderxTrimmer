'use client';

import { useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import {
  checkRedirectResult,
  getCurrentIdToken,
  onAuthStateChange,
  signInWithGoogle,
  signOutUser,
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
}

export default function Home() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

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

  // Subscribe to Firebase Auth state on mount
  useEffect(() => {
    // Check mobile redirect result if any
    checkRedirectResult().catch((err) => console.warn('Redirect check:', err));

    const unsubscribe = onAuthStateChange((user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });

    return () => {
      unsubscribe();
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Close user dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  // Google Sign-In handler
  const handleGoogleSignIn = async (): Promise<User | null> => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const user = await signInWithGoogle();
      setCurrentUser(user);
      return user;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      if (msg !== 'REDIRECTING') {
        setAuthError(msg);
      }
      return null;
    } finally {
      setIsSigningIn(false);
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await signOutUser();
      setCurrentUser(null);
      setIsUserMenuOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-out failed.';
      setAuthError(msg);
    }
  };

  // Step 2 & 3: Fetch video metadata (Public endpoint)
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
      // 1. Obtain Firebase ID token
      const idToken = await user.getIdToken();
      if (!idToken) {
        throw new Error('Unable to obtain authentication token. Please sign in again.');
      }

      // 2. Call protected POST /api/process
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

              // Automatically trigger authenticated file download
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

  // Download button clicked: check auth first, sign in if needed, then download
  const handleStartDownload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setErrorMessage('Please enter a video URL.');
      return;
    }

    // If not authenticated, initiate Google Sign-In first
    if (!currentUser) {
      const user = await handleGoogleSignIn();
      if (user) {
        // Authenticated! Automatically proceed with existing configuration
        await executeDownloadWithUser(user);
      }
      return;
    }

    // Authenticated: proceed
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

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 font-sans">
      {/* Header */}
      <header className="border-b border-neutral-200 py-3.5 px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-black">ClipDown</span>
        </div>

        {/* Auth Section in Header */}
        <div className="flex items-center gap-3">
          {isAuthLoading ? (
            <div className="w-8 h-8 rounded-full bg-neutral-100 animate-pulse"></div>
          ) : currentUser ? (
            // Authenticated: Show profile picture & dropdown menu
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-900"
                aria-label="User menu"
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User profile'}
                    className="w-8 h-8 rounded-full object-cover border border-neutral-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-neutral-900 text-white text-xs font-semibold flex items-center justify-center">
                    {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <span className="hidden sm:inline text-xs font-medium text-neutral-800 max-w-[120px] truncate">
                  {currentUser.displayName || currentUser.email || 'Account'}
                </span>
                <svg
                  className={`w-3.5 h-3.5 text-neutral-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-neutral-200 rounded-lg shadow-sm py-2 z-50">
                  <div className="px-4 py-2 border-b border-neutral-100">
                    <p className="text-xs font-semibold text-neutral-900 truncate">
                      {currentUser.displayName || 'Signed in'}
                    </p>
                    <p className="text-[11px] text-neutral-500 truncate mt-0.5">{currentUser.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Logged Out: Show Sign in with Google button
            <button
              type="button"
              disabled={isSigningIn}
              onClick={() => handleGoogleSignIn()}
              className="flex items-center gap-2 px-3.5 py-1.5 border border-neutral-300 rounded-lg text-xs font-medium text-neutral-800 bg-white hover:bg-neutral-50 hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-colors cursor-pointer disabled:opacity-50"
            >
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
              <span>{isSigningIn ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>
          )}
        </div>
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

          {/* Auth Error Banner if sign-in fails */}
          {authError && (
            <div className="p-3 border border-red-200 rounded-lg bg-red-50 text-red-700 text-xs flex items-center justify-between">
              <span>{authError}</span>
              <button
                type="button"
                onClick={() => setAuthError(null)}
                className="underline hover:text-red-900 cursor-pointer ml-2 text-[11px]"
              >
                Dismiss
              </button>
            </div>
          )}

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
