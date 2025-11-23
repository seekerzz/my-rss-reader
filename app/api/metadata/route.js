import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const client = await pool.connect();
    try {
      // Get Sources Counts
      const sourcesQuery = `
        SELECT rss_source as name, COUNT(*) as count
        FROM processed_articles
        GROUP BY rss_source
        ORDER BY count DESC
      `;

      // Get Top Keywords
      // Since keywords is an array, we need to unnest it
      const keywordsQuery = `
        SELECT keyword as name, COUNT(*) as count
        FROM (
          SELECT unnest(keywords) as keyword
          FROM processed_articles
        ) as k
        GROUP BY keyword
        ORDER BY count DESC
        LIMIT 20
      `;

      const [sourcesResult, keywordsResult] = await Promise.all([
        client.query(sourcesQuery),
        client.query(keywordsQuery)
      ]);

      return NextResponse.json({
        sources: sourcesResult.rows,
        keywords: keywordsResult.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata' },
      { status: 500 }
    );
  }
}
