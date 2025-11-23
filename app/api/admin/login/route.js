import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    const adminUser = process.env.ADMIN_USERNAME;
    const adminPass = process.env.ADMIN_PASSWORD;

    if (!adminUser || !adminPass) {
       return NextResponse.json({ error: 'Server misconfiguration: Admin credentials not set' }, { status: 500 });
    }

    if (username === adminUser && password === adminPass) {
      // Set a session cookie
      // In a real app, use a proper JWT or session ID.
      // Here, a simple flag is sufficient per requirements scope, but signed would be better.
      // For this task, we'll set a simple cookie.
      const cookieStore = await cookies();
      cookieStore.set('admin_session', 'true', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          maxAge: 60 * 60 * 24 // 1 day
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
