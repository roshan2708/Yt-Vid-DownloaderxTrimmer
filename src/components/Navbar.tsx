'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-sm tracking-tighter group-hover:bg-neutral-800 transition-colors">
            <svg
              className="w-4 h-4 text-white"
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
          <span className="text-lg font-bold tracking-tight text-neutral-900">
            ClipDown
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600">
          <Link
            href="/"
            className="hover:text-neutral-900 transition-colors py-1"
          >
            Downloader
          </Link>
          <Link
            href="/policies"
            className="hover:text-neutral-900 transition-colors py-1"
          >
            Policies
          </Link>
          <Link
            href="/terms"
            className="hover:text-neutral-900 transition-colors py-1"
          >
            Terms & Conditions
          </Link>
          <Link
            href="/privacy"
            className="hover:text-neutral-900 transition-colors py-1"
          >
            Privacy
          </Link>
          <Link
            href="/contact"
            className="hover:text-neutral-900 transition-colors py-1"
          >
            Contact Us
          </Link>
        </nav>

        {/* Desktop Action */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors shadow-xs"
          >
            Open Downloader
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-4 pt-3 pb-5 space-y-2">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Downloader
          </Link>
          <Link
            href="/policies"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Policies Overview
          </Link>
          <Link
            href="/terms"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Terms & Conditions
          </Link>
          <Link
            href="/privacy"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Privacy Policy
          </Link>
          <Link
            href="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Contact Us
          </Link>
          <div className="pt-2">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-center px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-900 text-white hover:bg-neutral-800"
            >
              Open Downloader
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

