import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export async function POST(request) {
  if (!await isAuthenticated()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { username, password } = await request.json();

    // Read the target URL from environment variable
    const backendUrl = process.env.BACKEND_URL;

    if (!backendUrl) {
      return NextResponse.json({ error: 'Backend URL not configured on server' }, { status: 500 });
    }

    const headers = {
        'Content-Type': 'application/json'
    };

    // If credentials provided for the external service, add Basic Auth
    if (username && password) {
        const encoded = Buffer.from(`${username}:${password}`).toString('base64');
        headers['Authorization'] = `Basic ${encoded}`;
    }

    const response = await fetch(backendUrl, {
        method: 'POST', // Assuming the n8n webhook expects POST
        headers: headers,
        body: JSON.stringify({ trigger: 'admin_manual' }) // Send some payload if needed
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
