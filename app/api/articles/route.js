import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 15;
    const offset = (page - 1) * limit;

    const rssSource = searchParams.get('source');
    const keyword = searchParams.get('keyword');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let whereClauses = [];
    let values = [];
    let paramIndex = 1;

    if (rssSource) {
      whereClauses.push(`rss_source = $${paramIndex++}`);
      values.push(rssSource);
    }

    if (keyword) {
      // Postgres array contains check
      whereClauses.push(`$${paramIndex++} = ANY(keywords)`);
      values.push(keyword);
    }

    if (search) {
      whereClauses.push(`(title ILIKE $${paramIndex} OR summary ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (startDate) {
      whereClauses.push(`published_at >= $${paramIndex++}`);
      values.push(startDate);
    }

    if (endDate) {
        // Adjust end date to end of day if it's just a date string, usually handled by client,
        // but assuming input is ISO or simple date.
        // If the client sends '2023-10-26', we probably want up to '2023-10-26 23:59:59'.
        // However, standard API practice is to trust the exact timestamp provided or let the client handle logic.
        // For simplicity with the existing client logic, I'll assume the client sends a proper string or I treat it as >= and <=
        whereClauses.push(`published_at <= $${paramIndex++}`);
        values.push(endDate);
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) FROM processed_articles ${whereStr}`;
    const dataQuery = `
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
      ${whereStr}
      ORDER BY published_at DESC 
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const client = await pool.connect();
    try {
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      const dataResult = await client.query(dataQuery, [...values, limit, offset]);

      return NextResponse.json({
        articles: dataResult.rows,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
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
