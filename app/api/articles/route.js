import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const query = `
      SELECT 
        id, 
        article_url, 
        rss_source, 
        title, 
        summary, 
        keywords, 
        published_at, 
        created_at
      FROM processed_articles 
      ORDER BY published_at DESC 
      LIMIT 500
    `;
    
    const client = await pool.connect();
    try {
      const result = await client.query(query);
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}
