import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/src/components/Navbar';
import Footer from '@/src/components/Footer';

export const metadata: Metadata = {
  title: 'Terms & Conditions | Cut Tadaao',
  description: 'Review the terms, acceptable use policy, copyright compliance, and legal guidelines for using Cut Tadaao.',
};

export default function TermsAndConditionsPage() {
  const lastUpdated = 'March 1, 2026';

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 font-sans">
      <Navbar />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <article className="max-w-3xl mx-auto">
          {/* Header */}
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
              <span className="text-neutral-900 font-medium">Terms &amp; Conditions</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 mb-3">
              Terms &amp; Conditions
            </h1>
            <p className="text-sm text-neutral-500">
              Last updated: <span className="font-medium text-neutral-700">{lastUpdated}</span>
            </p>
          </div>

          {/* Terms Content */}
          <div className="space-y-10 text-sm leading-relaxed text-neutral-700">
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                1. Acceptance of Terms
              </h2>
              <p>
                Welcome to Cut Tadaao. By accessing, browsing, or utilizing the Cut Tadaao web application, API, or associated services (collectively, the &quot;Service&quot;), you acknowledge that you have read, understood, and agree to be bound by these Terms &amp; Conditions (&quot;Terms&quot;), our{' '}
                <Link href="/privacy" className="text-neutral-900 underline hover:text-black font-medium">
                  Privacy Policy
                </Link>
                , and our{' '}
                <Link href="/refunds" className="text-neutral-900 underline hover:text-black font-medium">
                  Refunds &amp; Cancellations Policy
                </Link>.
              </p>
              <p>
                If you do not agree to all provisions of these Terms, you must discontinue using the Service immediately.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                2. Nature &amp; Scope of Service
              </h2>
              <p>
                Cut Tadaao is a technical utility that assists users in retrieving and clipping user-specified, publicly accessible video streams for personal convenience, educational, research, critique, or fair-use purposes.
              </p>
              <p>
                Cut Tadaao does not host a video sharing platform, does not broadcast or license media content, and does not maintain public search indices of downloaded files. The Service functions as an automated tool executing operations specifically requested by authenticated users.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                3. Intellectual Property Rights &amp; Copyright Policy
              </h2>
              <p>
                Cut Tadaao respects the intellectual property rights of creators and content owners worldwide.
              </p>
              <div className="border-l-4 border-neutral-900 pl-4 py-1 my-3 bg-neutral-50 rounded-r-lg space-y-2">
                <p className="font-semibold text-neutral-900">Your Representations and Warranties:</p>
                <p className="text-xs text-neutral-600">
                  By submitting any URL to Cut Tadaao, you represent and warrant that you either:
                  (i) are the sole copyright owner of the content;
                  (ii) hold express written authorization or a license from the copyright holder to clip and download the content; or
                  (iii) your use qualifies under legally established fair use or fair dealing doctrines applicable under relevant copyright statutes (e.g., Title 17, Section 107 of the U.S. Copyright Act).
                </p>
              </div>
              <p>
                You explicitly agree not to use Cut Tadaao to infringe, distribute, copy, broadcast, or republish protected media in violation of copyright or licensing agreements.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                4. Prohibited Uses &amp; Conduct
              </h2>
              <p>When using Cut Tadaao, you agree that you will not:</p>
              <ul className="list-disc pl-5 space-y-1 text-neutral-700">
                <li>Attempt to bypass or crack digital rights management (DRM), encryption, or copy protection technologies.</li>
                <li>Download content containing harmful, violent, abusive, defamatory, or unlawful material.</li>
                <li>Deploy automated bots, scripts, crawlers, or high-concurrency loops designed to overload our servers or bypass rate limit controls.</li>
                <li>Interfere with, disrupt, or compromise the security or integrity of our servers, networks, or connected endpoints.</li>
                <li>Attempt to reverse engineer, decompile, or tamper with the underlying software components.</li>
                <li>Resell, sublicense, or commercially exploit Cut Tadaao as a paid third-party proxy without prior written agreement.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                5. Third-Party Trademarks &amp; Non-Affiliation
              </h2>
              <p>
                Cut Tadaao is an independent project. Cut Tadaao is <strong>not</strong> endorsed, affiliated, associated, authorized, or sponsored by YouTube, Google LLC, Alphabet Inc., Vimeo, Meta, or any of their respective subsidiaries or affiliates.
              </p>
              <p>
                All product and company names, brand logos, trademarks, and registered trademarks displayed on or referenced through the Service are the property of their respective holders. Their mention does not imply any affiliation or endorsement.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                6. Digital Millennium Copyright Act (DMCA) &amp; Takedown Procedure
              </h2>
              <p>
                If you are a copyright holder or an authorized agent and believe that content accessible through our utility infringes upon your copyright, please submit an official DMCA notice to our designated copyright contact:
              </p>
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 text-xs space-y-2">
                <p><span className="font-semibold text-neutral-900">Designated Agent:</span> Cut Tadaao Copyright &amp; Legal Compliance</p>
                <p><span className="font-semibold text-neutral-900">Email:</span> cut.tadaao@gmail.com</p>
                <p className="text-neutral-600">
                  Please include: identification of the copyrighted work, URL(s) at issue, your physical/electronic signature, contact information, and a statement of good faith belief that the disputed use is unauthorized.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                7. Disclaimer of Warranties
              </h2>
              <p className="uppercase text-xs tracking-wide text-neutral-500 font-semibold">Important Legal Notice</p>
              <p>
                THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMISSIBLE BY LAW, CUT TADAAO DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
              <p>
                WE DO NOT GUARANTEE THAT THE SERVICE WILL FUNCTION UNINTERRUPTED, SECURE, BUG-FREE, OR COMPATIBLE AT ALL TIMES WITH THIRD-PARTY VIDEO HOSTING PLATFORMS WHOSE INFRASTRUCTURE AND PROTOCOLS MAY CHANGE AT ANY TIME.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                8. Limitation of Liability
              </h2>
              <p>
                IN NO EVENT SHALL CUT TADAAO, ITS OPERATORS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES (INCLUDING LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES) ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE SERVICE.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                9. Indemnification
              </h2>
              <p>
                You agree to defend, indemnify, and hold harmless Cut Tadaao and its operators against any claims, damages, liabilities, losses, costs, or expenses (including reasonable attorney fees) arising from: (a) your use of the Service; (b) your violation of these Terms; or (c) your violation of any third-party intellectual property or privacy right.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                10. Termination &amp; Enforcement
              </h2>
              <p>
                We reserve the right, without prior notice or liability, to suspend, restrict, or terminate your access to the Service immediately if we determine, in our sole discretion, that you have breached any provision of these Terms or engaged in abuse of our infrastructure.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                11. Governing Law &amp; Severability
              </h2>
              <p>
                These Terms shall be governed by and construed in accordance with applicable general law, without regard to conflict of law principles. If any provision of these Terms is found to be unlawful, void, or unenforceable, that provision shall be deemed severable and shall not affect the validity of remaining provisions.
              </p>
            </section>

            <section className="space-y-3 pb-4">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                12. Contact Information
              </h2>
              <p>
                If you have questions or inquiries regarding these Terms &amp; Conditions, please reach out via our{' '}
                <Link href="/contact" className="text-neutral-900 underline font-semibold hover:text-black">
                  Contact Us page
                </Link>{' '}
                or email <a href="mailto:cut.tadaao@gmail.com" className="text-neutral-900 underline font-semibold">cut.tadaao@gmail.com</a>.
              </p>
            </section>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}

