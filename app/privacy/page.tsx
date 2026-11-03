import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | Cut Tadaao',
  description: 'Understand how Cut Tadaao collects, uses, handles, and protects your information and temporary video jobs.',
};

export default function PrivacyPolicyPage() {
  const lastUpdated = 'March 1, 2026';

  return (
    <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
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
              <span className="text-neutral-900 font-medium">Privacy Policy</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 mb-3">
              Privacy Policy
            </h1>
            <p className="text-sm text-neutral-500">
              Last updated: <span className="font-medium text-neutral-700">{lastUpdated}</span>
            </p>
          </div>

          {/* Policy Content */}
          <div className="space-y-10 text-sm leading-relaxed text-neutral-700">
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                1. Overview & Commitment to Privacy
              </h2>
              <p>
                At Cut Tadaao (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), we respect your personal privacy. Cut Tadaao is designed as a focused, minimal utility that enables you to trim and download publicly accessible online video clips.
              </p>
              <p>
                This Privacy Policy explains what information we collect when you use our website and web application, how that information is handled, our strict policies regarding temporary video files, and your rights regarding your personal data.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                2. Information We Collect
              </h2>
              <p>We believe in data minimization and collect only what is strictly necessary to provide the service safely and reliably:</p>
              
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 space-y-4">
                <div>
                  <h3 className="font-semibold text-neutral-900">A. Account & Authentication Information</h3>
                  <p className="text-xs text-neutral-600 mt-1">
                    When you sign in using Google Authentication, we receive your verified email address, display name, profile avatar URL, and unique Firebase user identifier (UID). We do not collect or store your Google password.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-neutral-900">B. Video Processing & Job Data</h3>
                  <p className="text-xs text-neutral-600 mt-1">
                    When you request video metadata or create a download/trimming job, we process the public video URL you provide, requested resolution/quality, start timestamp, and end timestamp.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-neutral-900">C. Technical & Diagnostic Logs</h3>
                  <p className="text-xs text-neutral-600 mt-1">
                    Our servers record standard web logs including your IP address, browser type (User-Agent), timestamp of requests, and response codes. These logs are used strictly for rate limiting, DDoS mitigation, and system health monitoring.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-neutral-900">D. Cookies & Browser Local Storage</h3>
                  <p className="text-xs text-neutral-600 mt-1">
                    We use first-party browser cookies and local storage tokens solely to maintain your signed-in session state via Firebase Auth. We do not use third-party cross-site advertising tracking cookies.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                3. Ephemeral Video Storage & Automatic File Purging
              </h2>
              <p>
                We maintain a strict ephemeral storage policy for processed media:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-neutral-700">
                <li>
                  <strong className="text-neutral-900">No Permanent Media Archives:</strong> Cut Tadaao does not build an ongoing archive or library of user downloads. We do not index, catalog, or redistribute your processed video clips.
                </li>
                <li>
                  <strong className="text-neutral-900">Automated Deletion:</strong> Any temporary video or audio files created on our processing servers during trimming are held only long enough for you to complete your download. These files are automatically deleted after download or after job expiration.
                </li>
                <li>
                  <strong className="text-neutral-900">Private Job IDs:</strong> Each download job is assigned a unique, cryptographically random identifier (UUIDv4) and download links are restricted to authorized sessions.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                4. How We Use Your Information
              </h2>
              <p>We use your information exclusively for the following operational purposes:</p>
              <ul className="list-disc pl-5 space-y-1 text-neutral-700">
                <li>Authenticating your account and validating your download requests.</li>
                <li>Executing your video trimming, format conversion, and download tasks.</li>
                <li>Enforcing fair-use rate limits and preventing automated bot abuse.</li>
                <li>Diagnosing system errors and ensuring backend service stability.</li>
                <li>Responding to user inquiries or support tickets submitted through our contact form.</li>
              </ul>
              <p className="font-medium text-neutral-900">
                We never sell, rent, or monetize your personal data or submitted URLs to advertisers or data brokers.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                5. Third-Party Services & Subprocessors
              </h2>
              <p>
                To provide Cut Tadaao reliably, we rely on established infrastructure providers:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-neutral-700">
                <li>
                  <strong className="text-neutral-900">Google Firebase:</strong> Used for secure authentication (Google Identity) and user token verification. Governed by Google&apos;s Privacy Policy.
                </li>
                <li>
                  <strong className="text-neutral-900">Cloud Infrastructure (Docker / VPS / Render):</strong> Our backend services execute in secure, containerized environments that enforce encrypted communication (HTTPS/TLS).
                </li>
                <li>
                  <strong className="text-neutral-900">Public Video Platforms (YouTube / etc.):</strong> When you submit a video URL, our server requests public stream metadata from the hosting platform on your behalf to prepare the requested clip.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                6. Data Security
              </h2>
              <p>
                We implement industry-standard technical measures to safeguard your personal data:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-neutral-700">
                <li>End-to-end transport encryption via HTTPS (TLS 1.2+).</li>
                <li>Protected API endpoints requiring verified Firebase JSON Web Tokens (JWT).</li>
                <li>Ephemeral server file structures with automated cleanup cron jobs.</li>
                <li>Strict rate-limiting and input validation to protect against injection and unauthorized access.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                7. Your Data Rights & Choices
              </h2>
              <p>
                Depending on your location (including rights under the EU General Data Protection Regulation (GDPR) and California Consumer Privacy Act (CCPA)), you have rights regarding your information:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-neutral-700">
                <li>The right to sign out at any time, invalidating your session token.</li>
                <li>The right to request deletion of your account metadata and job history.</li>
                <li>The right to inquire what data is currently associated with your account identifier.</li>
              </ul>
              <p>
                To submit an account or data deletion request, please contact us at{' '}
                <Link href="/contact" className="text-neutral-900 font-semibold underline hover:text-black">
                  our Contact Us page
                </Link>{' '}
                or email{' '}
                <a href="mailto:cut.tadaao@gmail.com" className="text-neutral-900 font-semibold underline hover:text-black">
                  cut.tadaao@gmail.com
                </a>.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                8. Children&apos;s Privacy
              </h2>
              <p>
                Cut Tadaao is not targeted to individuals under the age of 13 (or under the age of 16 in certain jurisdictions). We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us so we can immediately delete it.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                9. Changes to This Privacy Policy
              </h2>
              <p>
                We may revise this Privacy Policy periodically to reflect updates to our architecture, legal obligations, or new features. When updates occur, we will update the &quot;Last updated&quot; date at the top of this page. Your continued use of Cut Tadaao signifies your acceptance of the updated terms.
              </p>
            </section>

            <section className="space-y-3 pb-4">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                10. Contacting Us
              </h2>
              <p>
                If you have questions, feedback, or concerns regarding this Privacy Policy or our data handling practices, please contact us:
              </p>
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 text-xs space-y-1">
                <p><span className="font-semibold text-neutral-900">Email:</span> cut.tadaao@gmail.com</p>
                <p><span className="font-semibold text-neutral-900">Online Form:</span>{' '}
                  <Link href="/contact" className="underline text-neutral-900 hover:text-black font-medium">
                    cut.tadaao.com/contact
                  </Link>
                </p>
                <p><span className="font-semibold text-neutral-900">Response Window:</span> Typically within 24 to 48 business hours.</p>
              </div>
            </section>
          </div>
        </article>
      </div>
  );
}

