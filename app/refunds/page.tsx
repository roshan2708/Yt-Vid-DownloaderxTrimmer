import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/src/components/Navbar';
import Footer from '@/src/components/Footer';

export const metadata: Metadata = {
  title: 'Refunds & Cancellations Policy | Cut Tadaao',
  description:
    'Read Cut Tadaao’s policy regarding cancellations, no-refunds on digital services, subscription management, and automatic quota restoration.',
};

export default function RefundsAndCancellationsPage() {
  const lastUpdated = 'March 1, 2026';

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 font-sans">
      <Navbar />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <article className="max-w-3xl mx-auto">
          {/* Breadcrumbs & Header */}
          <div className="mb-10 pb-8 border-b border-neutral-200">
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-3">
              <Link href="/" className="hover:text-neutral-900 transition-colors">
                Home
              </Link>
              <span>/</span>
              <Link href="/policies" className="hover:text-neutral-900 transition-colors">
                Policies
              </Link>
              <span>/</span>
              <span className="text-neutral-900 font-medium">Refunds &amp; Cancellations</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 mb-3">
              Refunds &amp; Cancellations Policy
            </h1>
            <p className="text-sm text-neutral-500">
              Last updated: <span className="font-medium text-neutral-700">{lastUpdated}</span>
            </p>
          </div>

          {/* Quick Summary Highlights Box */}
          <div className="mb-10 p-5 sm:p-6 rounded-2xl border border-neutral-200 bg-neutral-50 space-y-4">
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider text-[11px]">
              Key Policy Highlights
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-neutral-700">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-800 flex items-center justify-center font-bold flex-shrink-0 text-[10px]">
                  !
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">No Refunds on Digital Purchases</p>
                  <p className="text-neutral-600 mt-0.5">
                    All sales, subscriptions, and add-on credits are final and non-refundable. Please use our Free Tier to test features prior to upgrading.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold flex-shrink-0 text-[10px]">
                  ✓
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">Cancel Anytime</p>
                  <p className="text-neutral-600 mt-0.5">
                    Cancel future subscription renewals anytime with zero fees. Retain paid plan features until your active billing cycle ends.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold flex-shrink-0 text-[10px]">
                  ✓
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">Automatic Quota Protection</p>
                  <p className="text-neutral-600 mt-0.5">
                    If an export fails due to server or processing errors, your trim quota is immediately restored to your balance automatically.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold flex-shrink-0 text-[10px]">
                  ✓
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">Duplicate Billing Resolution</p>
                  <p className="text-neutral-600 mt-0.5">
                    Any accidental duplicate transaction caused by payment gateway timeouts is promptly refunded 100% to your original payment method.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Policy Detailed Sections */}
          <div className="space-y-10 text-sm leading-relaxed text-neutral-700">
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                1. Overview &amp; Nature of Service
              </h2>
              <p>
                Cut Tadaao (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) provides high-speed cloud video downloading, cutting, and transcoding services. When you subscribe to a paid tier or purchase an add-on, server compute resources, high-capacity bandwidth, and specialized cloud workers are allocated instantly to your account.
              </p>
              <p>
                To provide transparent billing and clear expectations, this Refunds &amp; Cancellations Policy outlines our cancellation procedures, our strict non-refundable terms for digital services, and our automated quota recovery mechanisms.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                2. No-Refund Policy
              </h2>
              <p>
                <strong className="text-neutral-900">All purchases and subscription payments made on Cut Tadaao are strictly final and non-refundable.</strong>
              </p>
              <p>
                Because Cut Tadaao delivers intangible digital goods and instant server bandwidth:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-neutral-600">
                <li>
                  <strong className="text-neutral-900">Free Tier for Evaluation:</strong> We provide a free Starter plan offering <strong>3 free trims per day</strong> with full access to test our platform&apos;s capabilities, speed, and audio/video output quality. We strongly encourage all users to thoroughly evaluate the service using the free tier before purchasing any paid plan.
                </li>
                <li>
                  <strong className="text-neutral-900">Instant Delivery:</strong> Paid benefits (including 200–500 monthly trims, 4K/60fps quality options, 60-minute duration limits, and priority worker queues) are provisioned immediately upon transaction completion.
                </li>
                <li>
                  <strong className="text-neutral-900">No Partial or Prorated Refunds:</strong> We do not offer partial, prorated, or full monetary refunds for unused trim quotas, partially used billing periods, downgrades, or early cancellations.
                </li>
                <li>
                  <strong className="text-neutral-900">Add-On Purchases:</strong> One-time purchases, including the <strong>24-Hour Pass (₹49)</strong> and <strong>50 Bonus Trim Credits (₹99)</strong>, are strictly non-refundable once acquired.
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                3. Subscription Cancellation Policy
              </h2>
              <p>
                While payments are non-refundable, you maintain full control over your subscription and can cancel future automatic renewals at any time:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-neutral-600">
                <li>
                  <strong className="text-neutral-900">Cancel Anytime Without Penalty:</strong> You can cancel your subscription at any time with zero cancellation fees or lock-in penalties through your account billing panel or by writing to{' '}
                  <a href="mailto:cut.tadaao@gmail.com" className="text-neutral-900 underline font-medium">
                    cut.tadaao@gmail.com
                  </a>.
                </li>
                <li>
                  <strong className="text-neutral-900">Immediate Stop to Auto-Renewal:</strong> Upon cancellation, all future automated renewals and recurring charges are immediately terminated. No further charges will occur on your card, UPI mandate, or payment account.
                </li>
                <li>
                  <strong className="text-neutral-900">Continued Access Through Current Cycle:</strong> You will retain complete access to all paid plan features and your allocated trim quota until the current paid billing cycle (the remainder of your month or year) naturally concludes.
                </li>
                <li>
                  <strong className="text-neutral-900">Automatic Reversion to Free Tier:</strong> When your current billing cycle expires after cancellation, your account will smoothly revert to the standard Free Starter tier (3 trims/day).
                </li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                4. Automated Quota Protection (Never Lose Trims)
              </h2>
              <p>
                Even though financial payments are non-refundable, <strong className="text-neutral-900">you will never be penalized for platform or technical failures</strong>:
              </p>
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs space-y-2">
                <p className="font-semibold text-neutral-900">
                  Instant Automatic Quota Restoration:
                </p>
                <p className="text-neutral-600 leading-relaxed">
                  Our backend incorporates automated transactional safeguards. If a video trim fails to complete due to YouTube stream interruptions, server timeouts, transcode crashes, or processing errors, <strong className="text-neutral-900">your trim quota is automatically restored back to your account immediately</strong>. You do not need to contact customer support or file a ticket to recover a trim lost on an unfulfilled job.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                5. Accidental Duplicate Transactions
              </h2>
              <p>
                The sole exception to our no-refund policy is in the event of an accidental duplicate transaction:
              </p>
              <p className="text-neutral-600 leading-relaxed">
                If an error with your payment provider, internet interruption, or browser double-click resulted in multiple identical charges for the same billing cycle or item, please notify us within <strong>7 days</strong> with your transaction IDs. Once verified, <strong className="text-neutral-900">100% of the duplicate payment</strong> will be refunded directly to your original payment method (settling within 5 to 7 business days via standard banking timelines).
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                6. Supported Content &amp; Fair Use
              </h2>
              <p>
                Cut Tadaao is intended solely for public, unencrypted, and accessible online video content for personal, research, or fair-use workflows.
              </p>
              <p className="text-neutral-600 leading-relaxed">
                We do not support or decrypt DRM-protected media (e.g. Netflix, Amazon Prime, Disney+, Apple TV+), age-gated media requiring private logins, or private streams. Inability to extract content from unsupported, protected, or restricted sources does not constitute grounds for a refund.
              </p>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                7. Billing Inquiries &amp; Support
              </h2>
              <p>
                If you have questions about your billing history, wish to cancel your subscription, or require assistance with your account, our support team is available:
              </p>
              <div className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50 space-y-3 text-xs">
                <p className="font-semibold text-neutral-900">
                  Support Contact Channels
                </p>
                <p className="text-neutral-600">
                  Email us at{' '}
                  <a href="mailto:cut.tadaao@gmail.com" className="font-semibold text-neutral-900 underline">
                    cut.tadaao@gmail.com
                  </a>.
                </p>
                <p className="text-neutral-600">
                  You can also submit a message via our{' '}
                  <Link href="/contact" className="text-neutral-900 underline font-medium">
                    online Contact &amp; Support form
                  </Link>. We respond to all inquiries within 24 to 48 hours.
                </p>
              </div>
            </section>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
