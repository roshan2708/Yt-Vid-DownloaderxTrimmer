import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, topic, message } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Please provide a valid name (at least 2 characters).' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        { error: 'Please select an inquiry topic.' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide a message with at least 10 characters.' },
        { status: 400 }
      );
    }

    // Log the contact message for admin review
    const timestamp = new Date().toISOString();
    console.log(`[Contact Submission] ${timestamp} | From: ${name.trim()} <${email.trim()}> | Topic: ${topic} | Message: ${message.trim()}`);

    return NextResponse.json(
      {
        success: true,
        message: 'Thank you for reaching out! Your message has been received. Our team will get back to you within 24 to 48 business hours.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Contact API Error]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your request. Please try again later.' },
      { status: 500 }
    );
  }
}

