'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/src/components/Navbar';
import Footer from '@/src/components/Footer';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    topic: 'Technical Support / Issue with Download',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Basic client-side validation
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setErrorMessage('Please enter your name (at least 2 characters).');
      return;
    }

    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!formData.message.trim() || formData.message.trim().length < 10) {
      setErrorMessage('Please provide a message with at least 10 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit your message.');
      }

      setSuccessMessage(
        data.message || 'Thank you! Your message has been received. We will respond within 24 to 48 hours.'
      );
      setFormData({
        name: '',
        email: '',
        topic: 'Technical Support / Issue with Download',
        message: '',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while sending your message.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 font-sans">
      <Navbar />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-10 pb-6 border-b border-neutral-200">
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-3">
              <Link href="/" className="hover:text-neutral-900 transition-colors">
                Home
              </Link>
              <span>/</span>
              <span className="text-neutral-900 font-medium">Contact Us</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 mb-3">
              Contact Us &amp; Support
            </h1>
            <p className="text-sm text-neutral-600 max-w-2xl leading-relaxed">
              Have questions, feedback, technical trouble with a video download, or a copyright inquiry?
              Send us a message or reach out through our official channels.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Column: Interactive Contact Form */}
            <div className="lg:col-span-7">
              <div className="border border-neutral-200 rounded-2xl p-6 sm:p-8 bg-white shadow-xs">
                <h2 className="text-lg font-bold text-neutral-900 mb-2">Send a Message</h2>
                <p className="text-xs text-neutral-500 mb-6">
                  Fill out the form below and our support team will reply to your email.
                </p>

                {successMessage ? (
                  <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-4">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-emerald-900">Message Delivered</h3>
                      <p className="text-xs text-emerald-700 mt-1.5 leading-relaxed">{successMessage}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSuccessMessage(null)}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors cursor-pointer"
                    >
                      Send Another Inquiry
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {errorMessage && (
                      <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                        <span className="font-bold flex-shrink-0">Error:</span>
                        <span className="flex-1">{errorMessage}</span>
                      </div>
                    )}

                    {/* Name */}
                    <div>
                      <label htmlFor="name" className="block text-xs font-medium text-neutral-800 mb-1">
                        Your Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Alex Morgan"
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-colors"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-xs font-medium text-neutral-800 mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="alex@example.com"
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-colors"
                      />
                    </div>

                    {/* Topic */}
                    <div>
                      <label htmlFor="topic" className="block text-xs font-medium text-neutral-800 mb-1">
                        Inquiry Topic <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="topic"
                        name="topic"
                        value={formData.topic}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-colors"
                      >
                        <option value="Technical Support / Issue with Download">
                          Technical Support / Issue with Download
                        </option>
                        <option value="DMCA / Copyright Inquiry">
                          DMCA / Copyright &amp; Content Removal
                        </option>
                        <option value="Bug Report">Bug Report</option>
                        <option value="Feature Request">Feature Request</option>
                        <option value="Account & Privacy Question">Account &amp; Privacy Question</option>
                        <option value="General Feedback">General Feedback</option>
                      </select>
                    </div>

                    {/* Message */}
                    <div>
                      <label htmlFor="message" className="block text-xs font-medium text-neutral-800 mb-1">
                        Message <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        required
                        rows={5}
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Please describe your question or issue in detail..."
                        className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-colors resize-y"
                      ></textarea>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          <span>Sending Message...</span>
                        </>
                      ) : (
                        <span>Send Message</span>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Right Column: Direct Contact & FAQs */}
            <div className="lg:col-span-5 space-y-6">
              {/* Direct channels */}
              <div className="border border-neutral-200 rounded-2xl p-6 bg-neutral-50 space-y-4">
                <h3 className="font-bold text-sm text-neutral-900">Direct Support Channels</h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-neutral-200 text-neutral-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900">General &amp; Technical Support</p>
                      <a href="mailto:cut.tadaao@gmail.com" className="text-neutral-600 hover:text-neutral-900 underline">
                        cut.tadaao@gmail.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-neutral-200 text-neutral-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900">Legal, DMCA &amp; Copyright</p>
                      <a href="mailto:cut.tadaao@gmail.com" className="text-neutral-600 hover:text-neutral-900 underline">
                        cut.tadaao@gmail.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-neutral-200 text-neutral-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900">Response Hours</p>
                      <p className="text-neutral-600">Monday – Friday: 9am – 6pm UTC (Replies usually within 24–48 hours)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Troubleshooting FAQ */}
              <div className="border border-neutral-200 rounded-2xl p-6 bg-white space-y-4">
                <h3 className="font-bold text-sm text-neutral-900">Frequently Asked Questions</h3>

                <div className="space-y-3 text-xs leading-relaxed">
                  <div>
                    <h4 className="font-semibold text-neutral-900">Why did my video extraction fail?</h4>
                    <p className="text-neutral-600 mt-0.5">
                      Ensure the video is publicly accessible, not private, age-restricted, or members-only on the hosting platform.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-neutral-100">
                    <h4 className="font-semibold text-neutral-900">How long are downloaded files kept?</h4>
                    <p className="text-neutral-600 mt-0.5">
                      All clipped media is purged automatically from our servers after download or job expiration. We do not store permanent copies.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-neutral-100">
                    <h4 className="font-semibold text-neutral-900">Need to remove copyrighted content?</h4>
                    <p className="text-neutral-600 mt-0.5">
                      Select &quot;DMCA / Copyright Inquiry&quot; or send full copyright claim details to{' '}
                      <a href="mailto:cut.tadaao@gmail.com" className="underline font-medium text-neutral-800">
                        cut.tadaao@gmail.com
                      </a>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

