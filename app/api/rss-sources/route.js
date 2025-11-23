import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export async function GET(request) {
  // Optional: Protect GET if source list is considered sensitive.
  // Given it's an admin dashboard, it's safer to protect it.
  if (!await isAuthenticated()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'news';
    const tableName = type === 'paper' ? 'arxiv_rss_sources' : 'rss_sources';

    const query = `SELECT id, name, url, custom_prompt FROM ${tableName} ORDER BY id ASC`;
    const client = await pool.connect();
    try {
      const result = await client.query(query);
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!await isAuthenticated()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, url, custom_prompt, type } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const targetType = type || 'news';
    const tableName = targetType === 'paper' ? 'arxiv_rss_sources' : 'rss_sources';

    let promptToUse = custom_prompt;
    if (!promptToUse || promptToUse.trim() === '') {
        promptToUse = targetType === 'paper'
            ? (process.env.PAPER_DEFAULT_PROMPT || '')
            : (process.env.NEWS_DEFAULT_PROMPT || '');
    }

    const query = `
      INSERT INTO ${tableName} (name, url, custom_prompt)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [name, url, promptToUse];

    const client = await pool.connect();
    try {
      const result = await client.query(query, values);
      return NextResponse.json(result.rows[0], { status: 201 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database Error:', error);
    if (error.code === '23505') { // Unique violation
        return NextResponse.json({ error: 'RSS Source URL already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to add source' }, { status: 500 });
  }
}
