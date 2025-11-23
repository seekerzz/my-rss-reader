import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export async function PUT(request, { params }) {
  if (!await isAuthenticated()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, url, custom_prompt } = body;

    const query = `
      UPDATE rss_sources
      SET name = $1, url = $2, custom_prompt = $3
      WHERE id = $4
      RETURNING *
    `;
    const values = [name, url, custom_prompt, id];

    const client = await pool.connect();
    try {
      const result = await client.query(query, values);
      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Source not found' }, { status: 404 });
      }
      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database Error:', error);
    if (error.code === '23505') {
        return NextResponse.json({ error: 'RSS Source URL already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update source' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  if (!await isAuthenticated()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const query = 'DELETE FROM rss_sources WHERE id = $1 RETURNING *';

    const client = await pool.connect();
    try {
        const result = await client.query(query, [id]);
        if (result.rowCount === 0) {
            return NextResponse.json({ error: 'Source not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, deleted: result.rows[0] });
    } finally {
        client.release();
    }
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Failed to delete source' }, { status: 500 });
  }
}
