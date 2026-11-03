import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/src/components/Navbar';
import Footer from '@/src/components/Footer';

export const metadata: Metadata = {
  title: 'Policies & Legal Center | ClipDown',
  description: 'Overview of ClipDown privacy practices, terms of service, refunds and cancellations, fair use guidelines, and DMCA copyright policies.',
};

export default function PoliciesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 font-sans">
      <Navbar />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Header */}
          <div className="pb-8 border-b border-neutral-200">
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-3">
              <Link href="/" className="hover:text-neutral-900 transition-colors">
                Home
              </Link>
              <span>/</span>
              <span className="text-neutral-900 font-medium">Policies Center</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 mb-3">
              Policies &amp; Legal Center
            </h1>
            <p className="text-sm text-neutral-600 max-w-2xl leading-relaxed">
              ClipDown is committed to user privacy, transparent operations, and copyright compliance. Explore our legal documentation, terms of service, and fair-use guidelines below.
            </p>
          </div>

          {/* Core Policies Grid */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Privacy Policy Card */}
            <div className="border border-neutral-200 rounded-2xl p-6 bg-white hover:border-neutral-400 transition-colors flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-neutral-900">Privacy Policy</h2>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Learn how we handle your personal data, Google OAuth authentication tokens, and our strict ephemeral storage policy that purges temporary video files automatically.
                </p>
                <ul className="text-xs text-neutral-500 space-y-1 pt-1">
                  <li>• Zero permanent media storage</li>
                  <li>• No tracking or third-party ad cookies</li>
                  <li>• Secure Firebase token authentication</li>
                  <li>• GDPR &amp; CCPA data rights support</li>
                </ul>
              </div>
              <div className="pt-4 border-t border-neutral-100">
                <Link
                  href="/privacy"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-900 hover:text-black group"
                >
                  <span>Read Privacy Policy</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              </div>
            </div>

            {/* Terms & Conditions Card */}
            <div className="border border-neutral-200 rounded-2xl p-6 bg-white hover:border-neutral-400 transition-colors flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-neutral-900">Terms &amp; Conditions</h2>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Review the rules governing your use of ClipDown, our acceptable use policy, copyright warranties, platform disclaimers, and limitation of liabilities.
                </p>
                <ul className="text-xs text-neutral-500 space-y-1 pt-1">
                  <li>• Personal, educational &amp; fair use</li>
                  <li>• Copyright compliance obligations</li>
                  <li>• Independent platform disclaimer</li>
                  <li>• Rate limits &amp; anti-abuse policies</li>
                </ul>
              </div>
              <div className="pt-4 border-t border-neutral-100">
                <Link
                  href="/terms"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-900 hover:text-black group"
                >
                  <span>Read Terms &amp; Conditions</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              </div>
            </div>

            {/* Refunds & Cancellations Card */}
            <div className="border border-neutral-200 rounded-2xl p-6 bg-white hover:border-neutral-400 transition-colors flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-neutral-900">Refunds &amp; Cancellations</h2>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Understand our digital service billing terms, no-refund policy, zero-penalty subscription cancellation, and automated quota restorations.
                </p>
                <ul className="text-xs text-neutral-500 space-y-1 pt-1">
                  <li>• Transparent no-refund digital policy</li>
                  <li>• Cancel subscriptions anytime</li>
                  <li>• Automatic quota refund on job failures</li>
                  <li>• Duplicate transaction protection</li>
                </ul>
              </div>
              <div className="pt-4 border-t border-neutral-100">
                <Link
                  href="/refunds"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-900 hover:text-black group"
                >
                  <span>Read Refund Policy</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              </div>
            </div>
          </section>

          {/* DMCA & Fair Use Section */}
          <section id="dmca" className="border border-neutral-200 rounded-2xl p-6 sm:p-8 bg-neutral-50 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
                §
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900">DMCA &amp; Copyright Notice Policy</h2>
                <p className="text-xs text-neutral-500">How we protect intellectual property rights and respond to takedowns</p>
              </div>
            </div>

            <p className="text-xs text-neutral-700 leading-relaxed">
              ClipDown operates as a neutral technical utility. We do not maintain a permanent video hosting service, nor do we claim ownership over any video or audio retrieved through our tool. Users are required to ensure they have the proper rights or fall under legitimate fair-use doctrines before initiating downloads.
            </p>

            <div className="bg-white border border-neutral-200 rounded-xl p-4 text-xs space-y-2">
              <p className="font-semibold text-neutral-900">Notice &amp; Takedown Procedure</p>
              <p className="text-neutral-600">
                If you believe your copyrighted work is being accessed or used inappropriately, please contact our designated copyright representative with complete identification of the material and your authorization.
              </p>
              <p className="pt-1">
                <span className="font-medium text-neutral-900">Designated Email:</span>{' '}
                <a href="mailto:dmca@clipdown.app" className="underline font-semibold text-neutral-800">
                  dmca@clipdown.app
                </a>
              </p>
            </div>
          </section>

          {/* Transparency Grid: Data Minimization */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-neutral-900">Data Minimization &amp; Transparency</h2>
            <div className="border border-neutral-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-100 border-b border-neutral-200 text-neutral-700 font-semibold">
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">What ClipDown Collects</th>
                    <th className="py-3 px-4">What ClipDown Never Collects</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  <tr>
                    <td className="py-3 px-4 font-medium text-neutral-900">Account</td>
                    <td className="py-3 px-4 text-neutral-700">Google Email, Display Name, Profile Photo URL</td>
                    <td className="py-3 px-4 text-neutral-700">Google Passwords, Personal Contacts, Payment Info</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-neutral-900">Video Media</td>
                    <td className="py-3 px-4 text-neutral-700">Temporary processing cache (auto-deleted upon completion)</td>
                    <td className="py-3 px-4 text-neutral-700">Permanent media library, public file directories</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-neutral-900">Telemetry &amp; Logs</td>
                    <td className="py-3 px-4 text-neutral-700">IP address &amp; timestamps for rate limiting and server health</td>
                    <td className="py-3 px-4 text-neutral-700">Cross-site browsing history, advertising profiles</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Need assistance CTA */}
          <section className="border border-neutral-200 rounded-2xl p-6 bg-white text-center space-y-3">
            <h3 className="text-base font-bold text-neutral-900">Have questions about our policies?</h3>
            <p className="text-xs text-neutral-600 max-w-md mx-auto">
              Our support team is happy to assist with any clarification regarding terms, privacy, or compliance.
            </p>
            <div className="pt-1">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
              >
                Contact Support Team
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

