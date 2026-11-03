import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/src/components/Navbar';
import Footer from '@/src/components/Footer';

export const metadata: Metadata = {
  title: 'Refunds & Cancellations Policy | ClipDown',
  description:
    'Read ClipDown’s comprehensive refund and cancellation policy, including our 7-day money-back guarantee, subscription cancellation terms, and refund processing timelines.',
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
              Key Policy Highlights at a Glance
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-neutral-700">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold flex-shrink-0 text-[10px]">
                  ✓
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">7-Day Money-Back Guarantee</p>
                  <p className="text-neutral-600 mt-0.5">
                    Full refund on your first Creator Pro or Studio subscription if requested within 7 days.
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
                    Zero lock-in or cancellation fees. Retain paid plan features until your billing cycle ends.
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
                    If an export fails due to server or network issues, your trim quota is immediately restored automatically.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold flex-shrink-0 text-[10px]">
                  ✓
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">5–7 Business Days Payout</p>
                  <p className="text-neutral-600 mt-0.5">
                    Approved refunds are disbursed straight back to your original payment method (UPI, Card, Net Banking).
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
                1. Overview &amp; Scope
              </h2>
              <p>
                At ClipDown (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), customer satisfaction and complete transparency in our billing practices are our top priorities. This Refunds &amp; Cancellations Policy outlines the terms and conditions under which you may cancel your paid subscriptions, purchase add-ons, or request monetary refunds.
              </p>
              <p>
                This policy applies to all paid plans and add-on purchases made on the ClipDown platform, including the <strong>Creator Pro Plan</strong> (₹199/month or ₹1,999/year), the <strong>Studio Power Plan</strong> (₹499/month or ₹4,999/year), the <strong>24-Hour Pass</strong> (₹49), and <strong>Bonus Trim Credits</strong> (₹99).
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                2. Subscription Cancellation Policy
              </h2>
              <p>
                You have full control over your ClipDown subscription and can cancel at any time without having to contact customer support or pay any cancellation fees:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-neutral-600">
                <li>
                  <strong className="text-neutral-900">Self-Service Cancellation:</strong> You can cancel your active monthly or yearly subscription at any time through your account billing panel or by submitting a cancellation request to{' '}
                  <a href="mailto:billing@clipdown.app" className="text-neutral-900 underline font-medium">
                    billing@clipdown.app
                  </a>.
                </li>
                <li>
                  <strong className="text-neutral-900">Effective Date of Cancellation:</strong> When you cancel a subscription, your cancellation becomes effective at the end of the current billing cycle (the remainder of your paid month or year). We do not charge any further renewal fees.
                </li>
                <li>
                  <strong className="text-neutral-900">Access Retention:</strong> You will continue to have full access to all tier benefits (such as 4K UHD exports, increased video duration limits, and your monthly trim quota) until the current billing cycle concludes.
                </li>
                <li>
                  <strong className="text-neutral-900">Graceful Downgrade:</strong> Once your billing period ends, your account will automatically revert to the Free Starter plan (3 trims/day at 720p HD). None of your account credentials or past download logs are deleted.
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                3. Refund Eligibility &amp; Money-Back Guarantee
              </h2>
              <p>
                We want you to feel confident when subscribing to ClipDown. We offer fair, transparent refund terms based on the type of plan and usage:
              </p>

              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-xl border border-neutral-200 bg-white space-y-1.5">
                  <h3 className="font-semibold text-neutral-900 text-sm">
                    A. 7-Day Money-Back Guarantee (First-Time Subscriptions)
                  </h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    If you are trying Creator Pro or Studio Power for the first time and are not completely satisfied with our service, you are eligible for a <strong>100% full refund</strong> if requested within <strong>7 calendar days</strong> from your initial purchase date, provided you have processed fewer than 15 video trims during this period.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-neutral-200 bg-white space-y-1.5">
                  <h3 className="font-semibold text-neutral-900 text-sm">
                    B. Annual (Yearly) Subscriptions
                  </h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    For yearly plans (billed upfront for 12 months), you may request a full refund within <strong>14 calendar days</strong> of initial subscription or renewal. If requested after 14 days due to demonstrated service disruption, we may offer a prorated refund reflecting the remaining full unused months.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-neutral-200 bg-white space-y-1.5">
                  <h3 className="font-semibold text-neutral-900 text-sm">
                    C. Technical Failures &amp; Service Unavailability
                  </h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    If technical issues on our platform prevent you from trimming or downloading standard publicly available videos, and our support team cannot rectify the issue within 48 hours of notification, you are entitled to a full refund for that billing period regardless of how many days have elapsed.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-neutral-200 bg-white space-y-1.5">
                  <h3 className="font-semibold text-neutral-900 text-sm">
                    D. 24-Hour Passes &amp; Bonus Top-Up Credits
                  </h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    • <strong>24-Hour Pass (₹49):</strong> Refundable if no trims were processed and the request is made within 24 hours of purchase, or if confirmed server downtime prevented use.<br />
                    • <strong>50 Bonus Credits (₹99):</strong> Refundable within 7 days of purchase if 100% of the purchased credits remain unspent.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                4. Automated Quota Restoration vs. Monetary Refunds
              </h2>
              <p>
                It is important to distinguish between <em>quota restorations</em> and <em>monetary refunds</em>:
              </p>
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs space-y-2">
                <p>
                  <strong className="text-neutral-900">Real-Time Quota Refund:</strong> Our server architecture contains an automated rollback mechanism. If an FFmpeg conversion fails, a YouTube download stream breaks, or our processing queue encounters a timeout, your account quota (whether daily, monthly, or bonus credit) is <strong>instantly and automatically refunded back to your balance</strong>. You do not need to contact support to recover a trim wasted on a broken job.
                </p>
                <p>
                  <strong className="text-neutral-900">Monetary Refund:</strong> Refers to returning the actual funds paid (INR ₹) back to your original payment method. Monetary refund requests are reviewed and processed by our billing team.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                5. Non-Refundable Circumstances
              </h2>
              <p>
                We do not issue refunds under the following conditions:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-neutral-600">
                <li>
                  <strong className="text-neutral-900">Terms of Service Violations:</strong> Accounts suspended or terminated for violating our{' '}
                  <Link href="/terms" className="text-neutral-900 underline font-medium">
                    Terms &amp; Conditions
                  </Link>{' '}
                  (including automated scraping, attempts to bypass DRM, or abuse of platform bandwidth) are not eligible for any refund.
                </li>
                <li>
                  <strong className="text-neutral-900">Substantial Quota Consumption:</strong> Requests made after consuming more than 15 trims on the Pro/Studio plan, or where a user attempts to consume a large volume of exports before requesting a refund.
                </li>
                <li>
                  <strong className="text-neutral-900">Third-Party Platform Limitations:</strong> Inability to download content that is DRM-protected (e.g. Netflix, Disney+, Amazon Prime), geo-blocked by the source host, or requires personal account authentication on private channels. ClipDown only supports standard, publicly available web videos.
                </li>
                <li>
                  <strong className="text-neutral-900">Expired Guarantee Periods:</strong> Requests submitted outside of the applicable 7-day or 14-day refund windows where no verified technical failure on ClipDown&apos;s infrastructure was reported.
                </li>
              </ul>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                6. Refund Processing &amp; Disbursement Timelines
              </h2>
              <p>
                Once your refund request is received and approved by our support staff:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-neutral-600">
                <li>
                  <strong className="text-neutral-900">Internal Authorization:</strong> Our team reviews and initiates approved refunds within <strong>24 to 48 business hours</strong>.
                </li>
                <li>
                  <strong className="text-neutral-900">Disbursement Method:</strong> Refunds are sent strictly to the <strong>original payment method</strong> used during checkout (such as UPI, Debit Card, Credit Card, Net Banking, or supported digital wallets). For security and anti-fraud compliance, we cannot transfer refunds to third-party accounts.
                </li>
                <li>
                  <strong className="text-neutral-900">Bank Settlement Timelines:</strong>
                  <ul className="list-circle pl-6 mt-1 space-y-1 text-xs">
                    <li>• <strong>UPI (Google Pay, PhonePe, Paytm, BHIM):</strong> 2 to 4 business days.</li>
                    <li>• <strong>Indian Debit &amp; Credit Cards (RuPay, Visa, Mastercard):</strong> 5 to 7 business days.</li>
                    <li>• <strong>Net Banking:</strong> 3 to 7 business days depending on your bank.</li>
                    <li>• <strong>International Cards:</strong> 7 to 10 business days depending on exchange clearing networks.</li>
                  </ul>
                </li>
              </ul>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                7. Accidental Duplicate Transactions
              </h2>
              <p>
                If you were billed twice for the same billing cycle due to a network timeout, browser refresh, or payment gateway glitch, please notify us immediately. Upon verification, we will refund <strong>100% of the duplicate transaction</strong> within 24 hours without any administrative deductions.
              </p>
            </section>

            {/* Section 8 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                8. How to Submit a Refund or Cancellation Request
              </h2>
              <p>
                To request a refund or cancel your subscription, please use either of the following channels:
              </p>
              <div className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50 space-y-3 text-xs">
                <p className="font-semibold text-neutral-900">
                  Option 1: Contact via Email
                </p>
                <p className="text-neutral-600">
                  Send an email to{' '}
                  <a href="mailto:billing@clipdown.app" className="font-semibold text-neutral-900 underline">
                    billing@clipdown.app
                  </a>{' '}
                  or{' '}
                  <a href="mailto:support@clipdown.app" className="font-semibold text-neutral-900 underline">
                    support@clipdown.app
                  </a>{' '}
                  with the subject line: <code className="bg-white px-1.5 py-0.5 rounded border border-neutral-200">Refund Request - [Your Registered Email]</code>.
                </p>
                <p className="text-neutral-600">
                  Please include your order / payment transaction ID, purchase date, and a brief explanation of the reason for the request.
                </p>

                <div className="pt-2 border-t border-neutral-200">
                  <p className="font-semibold text-neutral-900 mb-1">
                    Option 2: Use the Support Form
                  </p>
                  <p className="text-neutral-600 mb-2">
                    Submit your request directly through our online contact form by selecting the &quot;Billing &amp; Payments&quot; topic:
                  </p>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 transition-colors"
                  >
                    <span>Open Contact &amp; Support Form</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </section>

            {/* Section 9 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                9. Questions &amp; Support
              </h2>
              <p>
                If you have any questions regarding this policy or need clarification on your billing status, please reach out to our team at{' '}
                <a href="mailto:support@clipdown.app" className="text-neutral-900 underline font-medium">
                  support@clipdown.app
                </a>. We strive to respond to all inquiries within 24 to 48 hours.
              </p>
            </section>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
