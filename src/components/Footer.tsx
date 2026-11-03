import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white text-neutral-600 text-xs mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-3">
            <Link href="/" className="flex items-center gap-2 group inline-flex">
              <div className="w-6 h-6 rounded bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
                <svg
                  className="w-3.5 h-3.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <polygon points="6 3 20 12 6 21 6 3" />
                </svg>
              </div>
              <span className="font-bold tracking-tight text-neutral-900 text-sm">
                ClipDown
              </span>
            </Link>
            <p className="text-neutral-500 max-w-sm leading-relaxed text-xs">
              Fast, minimal video downloader and trimmer utility. Download public clips
              or full videos with custom time ranges, high-definition quality, and zero clutter.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <p className="font-semibold text-neutral-900 uppercase tracking-wider text-[11px]">
              Navigation
            </p>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="hover:text-neutral-900 transition-colors">
                  Video Downloader
                </Link>
              </li>
              <li>
                <Link href="/policies" className="hover:text-neutral-900 transition-colors">
                  Policies & Legal Center
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-neutral-900 transition-colors">
                  Contact Us & Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies & Legal */}
          <div className="space-y-3">
            <p className="font-semibold text-neutral-900 uppercase tracking-wider text-[11px]">
              Legal & Compliance
            </p>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="hover:text-neutral-900 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-neutral-900 transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/policies#dmca" className="hover:text-neutral-900 transition-colors">
                  DMCA & Fair Use
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-500">
          <p>© 2026 ClipDown. All rights reserved.</p>
          <p className="text-center sm:text-right max-w-md">
            Disclaimer: ClipDown is an independent utility and is not affiliated with, sponsored by, or endorsed by YouTube, Google LLC, or any other video hosting platform.
          </p>
        </div>
      </div>
    </footer>
  );
}

