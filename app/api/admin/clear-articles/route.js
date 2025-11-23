import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export async function DELETE(request) {
  if (!await isAuthenticated()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const rssSource = searchParams.get('rss_source');
    const type = searchParams.get('type') || 'news';

    if (!rssSource) {
      return NextResponse.json({ error: 'rss_source parameter is required' }, { status: 400 });
    }

    const tableName = type === 'paper' ? 'arxiv_processed_articles' : 'processed_articles';
    const query = `DELETE FROM ${tableName} WHERE rss_source = $1`;

    const client = await pool.connect();
    try {
      const result = await client.query(query, [rssSource]);
      return NextResponse.json({ success: true, count: result.rowCount });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Failed to delete articles' }, { status: 500 });
  }
}
