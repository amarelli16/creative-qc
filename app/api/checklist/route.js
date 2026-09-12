import { NextResponse } from 'next/server';

/**
 * GET /api/checklist?url=<raw_github_url>
 * Proxies the checklist JSON from a GitHub raw URL.
 * Adds CORS headers and caching.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'Missing url parameter' },
      { status: 400 }
    );
  }

  // Validate URL — only allow GitHub raw URLs for security
  const allowedHosts = [
    'raw.githubusercontent.com',
    'gist.githubusercontent.com',
    'raw.github.com',
  ];

  try {
    const parsedUrl = new URL(url);
    if (!allowedHosts.includes(parsedUrl.hostname)) {
      return NextResponse.json(
        { error: 'Only GitHub raw URLs are allowed' },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid URL' },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes (ISR)
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch checklist: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to fetch checklist: ${err.message}` },
      { status: 500 }
    );
  }
}
