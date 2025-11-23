import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export async function POST(request) {
  if (!await isAuthenticated()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { username, password } = await request.json();

    // Read the target URL from environment variable
    let backendUrl = process.env.BACKEND_URL;

    if (!backendUrl) {
      return NextResponse.json({ error: 'Backend URL not configured on server' }, { status: 500 });
    }

    // Append query parameter for trigger identification
    const url = new URL(backendUrl);
    url.searchParams.append('trigger', 'admin_manual');

    const headers = {
        'Content-Type': 'application/json'
    };

    // If credentials provided for the external service, add Basic Auth
    if (username && password) {
        const encoded = Buffer.from(`${username}:${password}`).toString('base64');
        headers['Authorization'] = `Basic ${encoded}`;
    }

    // Changed to GET as per n8n webhook requirements (often default to GET)
    // and user feedback regarding 404 on POST.
    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: headers,
    });

    if (!response.ok) {
        const text = await response.text();
        return NextResponse.json({ error: `Backend returned ${response.status}: ${text}` }, { status: response.status });
    }

    return NextResponse.json({ success: true, message: 'Triggered successfully' });

  } catch (error) {
    console.error('Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to trigger backend' }, { status: 500 });
  }
}
