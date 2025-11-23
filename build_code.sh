#!/bin/bash

echo "🚀 开始自动配置 RSS Reader 文件..."

# --- 1. 创建 lib/db.js ---
echo "📂 创建 lib 目录..."
mkdir -p lib

echo "📝 写入 lib/db.js..."
cat << 'EOF' > lib/db.js
import { Pool } from 'pg';

let pool;

if (!global.pgPool) {
  global.pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // 如果是在生产环境(Railway内部)，或者本地连Railway公网，通常需要 SSL 配置
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
}

pool = global.pgPool;

export default pool;
EOF

# --- 2. 创建 app/api/articles/route.js ---
echo "📂 创建 app/api/articles 目录..."
mkdir -p app/api/articles

echo "📝 写入 app/api/articles/route.js..."
cat << 'EOF' > app/api/articles/route.js
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
EOF

# --- 3. 覆盖 app/page.js ---
# 注意：有些 Next.js 版本默认生成的是 page.tsx 或 page.jsx，这里统一覆盖为 page.js
echo "📝 覆盖 app/page.js..."
cat << 'EOF' > app/page.js
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, LayoutGrid, List, Calendar, ExternalLink, 
  Hash, Rss, Clock, FilterX, Loader2, AlertCircle 
} from 'lucide-react';

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(date);
};

export default function RSSReader() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedKeyword, setSelectedKeyword] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("card");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch('/api/articles');
        if (!response.ok) throw new Error(`加载失败: ${response.statusText}`);
        const data = await response.json();
        const cleanData = data.map(item => ({
            ...item,
            keywords: Array.isArray(item.keywords) ? item.keywords : [] 
        }));
        setArticles(cleanData);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const sources = useMemo(() => {
    const counts = {};
    articles.forEach(item => {
      const source = item.rss_source || '未知来源';
      counts[source] = (counts[source] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [articles]);

  const allKeywords = useMemo(() => {
    const counts = {};
    articles.forEach(item => {
      item.keywords?.forEach(k => {
        if(k) counts[k] = (counts[k] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, count]) => ({ name, count }));
  }, [articles]);

  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      if (selectedSource && article.rss_source !== selectedSource) return false;
      if (selectedKeyword && !article.keywords?.includes(selectedKeyword)) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchTitle = article.title?.toLowerCase().includes(query);
        const matchSummary = article.summary?.toLowerCase().includes(query);
        if (!matchTitle && !matchSummary) return false;
      }
      if (dateRange.start && new Date(article.published_at) < new Date(dateRange.start)) return false;
      if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        if (new Date(article.published_at) > endDate) return false;
      }
      return true;
    }); 
  }, [articles, selectedSource, selectedKeyword, searchQuery, dateRange]);

  const resetFilters = () => {
    setSelectedSource(null);
    setSelectedKeyword(null);
    setSearchQuery("");
    setDateRange({ start: "", end: "" });
  };

  if (loading) {
      return (
          <div className="h-screen flex items-center justify-center bg-gray-50 text-indigo-600 flex-col gap-4">
              <Loader2 className="w-10 h-10 animate-spin" />
              <p>正在读取数据库...</p>
          </div>
      )
  }

  if (error) {
    return (
        <div className="h-screen flex items-center justify-center bg-gray-50 text-red-500 flex-col gap-4">
            <AlertCircle className="w-12 h-12" />
            <h2 className="text-xl font-bold">无法连接数据</h2>
            <p>{error}</p>
            <p className="text-sm text-gray-500">请检查 Railway 环境变量 DATABASE_URL 是否配置正确。</p>
        </div>
    )
}

  return (
    <div className="flex h-screen bg-gray-100 text-slate-800 font-sans overflow-hidden">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 hidden md:flex">
        <div className="p-4 border-b border-gray-100 flex items-center space-x-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Rss className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">RSS 聚合</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">订阅源</h3>
            <div className="space-y-1">
              <button onClick={() => setSelectedSource(null)} className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${selectedSource === null ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                <span>全部</span>
                <span className="bg-gray-100 text-gray-500 py-0.5 px-2 rounded-full text-xs">{articles.length}</span>
              </button>
              {sources.map(source => (
                <button key={source.name} onClick={() => setSelectedSource(source.name)} className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${selectedSource === source.name ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                  <span className="truncate max-w-[120px]" title={source.name}>{source.name}</span>
                  <span className="text-xs text-gray-400">{source.count}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">热门标签</h3>
            <div className="flex flex-wrap gap-2">
              {allKeywords.map(kw => (
                <button key={kw.name} onClick={() => setSelectedKeyword(selectedKeyword === kw.name ? null : kw.name)} className={`px-2 py-1 rounded-md text-xs border flex items-center gap-1 transition-colors ${selectedKeyword === kw.name ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  <Hash className="w-3 h-3" />
                  {kw.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 p-4 space-y-4 shadow-sm z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="搜索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex items-center gap-3">
               <div className="hidden sm:flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                <Calendar className="w-4 h-4 text-gray-400 ml-2" />
                <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="bg-transparent text-xs text-gray-600 focus:outline-none w-24" />
                <span className="text-gray-300">-</span>
                <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="bg-transparent text-xs text-gray-600 focus:outline-none w-24" />
              </div>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setViewMode("card")} className={`p-1.5 rounded-md ${viewMode === "card" ? "bg-white shadow text-indigo-600" : "text-gray-500"}`}><LayoutGrid className="w-4 h-4" /></button>
                <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md ${viewMode === "list" ? "bg-white shadow text-indigo-600" : "text-gray-500"}`}><List className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
          {(selectedSource || selectedKeyword || searchQuery) && (
             <div className="flex items-center gap-2 text-xs text-gray-500">
               <span>筛选中...</span>
               <button onClick={resetFilters} className="ml-auto flex items-center gap-1 text-red-500 hover:text-red-600 font-medium"><FilterX className="w-3 h-3" /> 重置</button>
             </div>
          )}
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            {filteredArticles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400"><p>无内容</p></div>
            ) : (
              <div className={viewMode === "card" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "flex flex-col space-y-3"}>
                {filteredArticles.map(article => (
                  <ArticleItem key={article.id} article={article} viewMode={viewMode} onKeywordClick={setSelectedKeyword} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ArticleItem({ article, viewMode, onKeywordClick }) {
  const isCard = viewMode === "card";
  return (
    <div className={`group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-indigo-200 transition-all ${isCard ? 'flex flex-col h-full' : 'flex flex-col md:flex-row md:items-center p-4 gap-4'}`}>
      <div className={`${isCard ? 'p-5 flex-1' : 'flex-1 min-w-0'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{article.rss_source || 'RSS'}</span>
          <div className="flex items-center text-xs text-gray-400 gap-1"><Clock className="w-3 h-3" />{formatDate(article.published_at)}</div>
        </div>
        <h2 className={`font-bold text-gray-800 group-hover:text-indigo-600 transition-colors mb-2 ${isCard ? 'text-lg' : 'text-base'}`}>
          <a href={article.article_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
            {article.title}
            {isCard && <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
          </a>
        </h2>
        <p className={`text-gray-500 text-sm leading-relaxed ${isCard ? 'line-clamp-4' : 'line-clamp-2'}`}>{article.summary}</p>
      </div>
      <div className={`${isCard ? 'p-5 pt-0 mt-auto border-t border-gray-50' : 'md:w-1/3 md:flex md:justify-end md:items-center'}`}>
        <div className={`flex flex-wrap gap-2 ${isCard ? 'mt-4' : ''}`}>
          {article.keywords?.map((keyword, idx) => (
             <button key={idx} onClick={(e) => { e.preventDefault(); onKeywordClick(keyword); }} className="text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors">#{keyword}</button>
          ))}
          {!isCard && (<a href={article.article_url} target="_blank" rel="noopener noreferrer" className="ml-auto md:ml-2 p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"><ExternalLink className="w-4 h-4" /></a>)}
        </div>
      </div>
    </div>
  );
}
EOF

echo "✅ 配置完成！请确保你创建了 .env.local 文件用于本地开发。"