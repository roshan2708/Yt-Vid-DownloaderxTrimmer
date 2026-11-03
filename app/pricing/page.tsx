'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/src/components/Navbar';
import Footer from '@/src/components/Footer';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 font-sans">
      <Navbar />

      <main className="flex-1 py-14 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-semibold uppercase tracking-wider mb-3">
            <span>Fair Usage &amp; Transparent Limits</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 mb-4">
            Pick the plan that fits your workflow.
          </h1>
          <p className="text-neutral-600 text-sm sm:text-base leading-relaxed">
            Extract frame-accurate video clips in seconds. Every plan includes clean MP4 exports with zero watermarks, high-speed encoding, and automatic credit refund protection.
          </p>

          {/* Billing Switcher */}
          <div className="mt-8 inline-flex items-center p-1 bg-neutral-100 rounded-xl border border-neutral-200">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                billingCycle === 'monthly' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-black'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                billingCycle === 'yearly' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-black'
              }`}
            >
              <span>Yearly Billing</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                2 Months Free
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* 1. Free Starter Tier */}
          <div className="border border-neutral-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between hover:border-neutral-300 transition-colors bg-white">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-neutral-900">Starter</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-600">Free</span>
              </div>
              <p className="text-xs text-neutral-500 mt-1">For casual quick cuts and short video testing.</p>

              <div className="mt-6 mb-6">
                <span className="text-4xl font-extrabold text-neutral-900">₹0</span>
                <span className="text-neutral-500 text-xs ml-1.5">forever</span>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 mb-6">
                <p className="text-xs font-semibold text-neutral-800">3 Daily Trims</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">Resets every night at 00:00 UTC</p>
              </div>

              <ul className="space-y-3 text-xs text-neutral-700">
                <li className="flex items-center gap-2">
                  <span className="text-neutral-900 font-bold">✓</span> Up to 720p HD resolution
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-neutral-900 font-bold">✓</span> Max 2-minute clip trims
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-neutral-900 font-bold">✓</span> Max 20-minute source videos
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-neutral-900 font-bold">✓</span> Automatic error refund protection
                </li>
                <li className="flex items-center gap-2 text-neutral-400">
                  <span>✕</span> No 1080p, 2K or 4K UHD export
                </li>
                <li className="flex items-center gap-2 text-neutral-400">
                  <span>✕</span> Standard queue speed
                </li>
              </ul>
            </div>

            <Link
              href="/"
              className="mt-8 block text-center py-2.5 px-4 rounded-lg text-xs font-semibold border border-neutral-300 text-neutral-800 hover:bg-neutral-50 transition-colors"
            >
              Start Free (3 Trims/Day)
            </Link>
          </div>

          {/* 2. Creator Pro (200 trims/month) */}
          <div className="border-2 border-neutral-900 rounded-2xl p-6 sm:p-8 flex flex-col justify-between relative shadow-xl bg-neutral-900 text-white">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-neutral-900 text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full border border-neutral-200 shadow-xs">
              Most Popular
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Creator Pro</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">Creator Pass</span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">For video editors, YouTubers, and content creators.</p>

              <div className="mt-6 mb-6">
                <span className="text-4xl font-extrabold text-white">
                  {billingCycle === 'yearly' ? '₹166' : '₹199'}
                </span>
                <span className="text-neutral-400 text-xs ml-1.5">
                  / month {billingCycle === 'yearly' ? '(billed ₹1,999/year)' : ''}
                </span>
              </div>

              <div className="p-3 bg-neutral-800/80 rounded-xl border border-neutral-700 mb-6">
                <p className="text-xs font-semibold text-emerald-400">200 Trims Per Month</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">No daily limit — use anytime during the month</p>
              </div>

              <ul className="space-y-3 text-xs text-neutral-200">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Full 1080p, 2K &amp; 4K Ultra HD
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Clips up to 20 minutes in length
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Source videos up to 3 hours (podcasts &amp; streams)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Turbo Queue (Priority server encoding)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Automatic failed-job refund guarantee
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> High-bitrate 320kbps audio extraction
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => alert('Payments will be enabled shortly. Contact support for early beta access.')}
              className="mt-8 w-full py-2.5 px-4 rounded-lg text-xs font-semibold bg-white text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              Get Creator Pro
            </button>
          </div>

          {/* 3. Studio Power (500 trims/month) */}
          <div className="border border-neutral-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between hover:border-neutral-300 transition-colors bg-white">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-neutral-900">Studio Power</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-600">Agencies</span>
              </div>
              <p className="text-xs text-neutral-500 mt-1">For production agencies and high-volume clip extraction.</p>

              <div className="mt-6 mb-6">
                <span className="text-4xl font-extrabold text-neutral-900">
                  {billingCycle === 'yearly' ? '₹416' : '₹499'}
                </span>
                <span className="text-neutral-500 text-xs ml-1.5">
                  / month {billingCycle === 'yearly' ? '(billed ₹4,999/year)' : ''}
                </span>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 mb-6">
                <p className="text-xs font-semibold text-neutral-800">500 Trims Per Month</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">No daily limit — heavy production volume</p>
              </div>

              <ul className="space-y-3 text-xs text-neutral-700">
                <li className="flex items-center gap-2">
                  <span className="text-neutral-900 font-bold">✓</span> 4K Ultra HD @ 60fps support
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-neutral-900 font-bold">✓</span> Clips up to 60 minutes in length
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-neutral-900 font-bold">✓</span> Source videos up to 5 hours
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-neutral-900 font-bold">✓</span> Dedicated processing nodes
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-neutral-900 font-bold">✓</span> Automatic error refund protection
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-neutral-900 font-bold">✓</span> Priority email support
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => alert('Payments will be enabled shortly. Contact support for early beta access.')}
              className="mt-8 w-full py-2.5 px-4 rounded-lg text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Get Studio Power
            </button>
          </div>
        </div>

        {/* Pay-as-you-go & Top-Ups Banner */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl border border-neutral-200 bg-neutral-50 flex flex-col justify-between space-y-3">
            <div>
              <div className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider mb-2">
                One-Off Project
              </div>
              <h4 className="text-sm font-bold text-neutral-900">24-Hour 4K Pass — ₹49</h4>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Need to download just a few high-res clips today without a subscription? Get <strong>15 Pro 4K trims</strong> valid for 24 hours.
              </p>
            </div>
            <button
              type="button"
              onClick={() => alert('Passes will be available once payment integration is activated.')}
              className="self-start px-4 py-2 rounded-lg text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Get 24-Hr Pass (₹49)
            </button>
          </div>

          <div className="p-6 rounded-2xl border border-neutral-200 bg-neutral-50 flex flex-col justify-between space-y-3">
            <div>
              <div className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider mb-2">
                Instant Top-Up
              </div>
              <h4 className="text-sm font-bold text-neutral-900">50 Extra Trim Credits — ₹99</h4>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Running low on trims before the month ends? Top up with 50 extra trims that <strong>never expire</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => alert('Top-up credits will be available once payment integration is activated.')}
              className="self-start px-4 py-2 rounded-lg text-xs font-semibold border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              Buy 50 Credits (₹99)
            </button>
          </div>
        </div>

        {/* Frequently Asked Questions */}
        <div className="mt-16 pt-12 border-t border-neutral-200 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 mb-8 text-center">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="border-b border-neutral-100 pb-4">
              <h3 className="text-sm font-semibold text-neutral-900">How do trims work on the Creator Pro &amp; Studio plans?</h3>
              <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
                Creator Pro gives you <strong>200 trims per month</strong> and Studio Power gives you <strong>500 trims per month</strong> with <strong>no daily limits</strong>. You can use all 200 trims in a single week or spread them throughout the month.
              </p>
            </div>

            <div className="border-b border-neutral-100 pb-4">
              <h3 className="text-sm font-semibold text-neutral-900">When does the Starter (Free) plan reset?</h3>
              <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
                Starter gives you <strong>3 trims every day</strong>. Daily trims reset automatically at <strong>00:00:00 UTC</strong> every night.
              </p>
            </div>

            <div className="border-b border-neutral-100 pb-4">
              <h3 className="text-sm font-semibold text-neutral-900">What happens if a video trim fails?</h3>
              <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
                Our system has built-in automatic refund protection. If a video fails to download or process due to YouTube restrictions or server timeouts, your trim is immediately restored to your balance. You are never charged for a failed trim.
              </p>
            </div>

            <div className="border-b border-neutral-100 pb-4">
              <h3 className="text-sm font-semibold text-neutral-900">What is your cancellation and refund policy?</h3>
              <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
                All digital sales and subscriptions are final and non-refundable. We provide a <strong>free Starter plan (3 trims/day)</strong> so you can test features thoroughly before upgrading. You can cancel your recurring subscription at any time with zero penalties, retaining full access until the end of your billing cycle. For complete details, see our{' '}
                <Link href="/refunds" className="text-neutral-900 underline font-medium hover:text-black">
                  Refunds &amp; Cancellations Policy
                </Link>.
              </p>
            </div>

            <div className="border-b border-neutral-100 pb-4">
              <h3 className="text-sm font-semibold text-neutral-900">Are there any watermarks on the downloaded videos?</h3>
              <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
                No. Never. Every video clip downloaded from Cut Tadaao is 100% clean, original-quality MP4 with zero watermarks or branding added.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
