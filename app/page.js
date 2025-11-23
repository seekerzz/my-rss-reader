'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, LayoutGrid, List, Calendar, ExternalLink, 
  Hash, Rss, Clock, FilterX, Loader2, AlertCircle,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ChevronDown, ChevronUp
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
  const [metadata, setMetadata] = useState({ sources: [], keywords: [] });
  const [loading, setLoading] = useState(true);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [error, setError] = useState(null);

  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedKeyword, setSelectedKeyword] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("card");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Fetch Metadata (Sources and Keywords) once
  useEffect(() => {
    async function fetchMetadata() {
      try {
        setLoadingMeta(true);
        const response = await fetch('/api/metadata');
        if (!response.ok) throw new Error('Failed to fetch metadata');
        const data = await response.json();
        setMetadata(data);
      } catch (err) {
        console.error("Metadata fetch error:", err);
        // Don't block the UI if metadata fails, just log it
      } finally {
        setLoadingMeta(false);
      }
    }
    fetchMetadata();
  }, []);

  // Fetch Articles with Server-Side Filtering & Pagination
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append('page', pagination.page);
        params.append('limit', pagination.limit);

        if (selectedSource) params.append('source', selectedSource);
        if (selectedKeyword) params.append('keyword', selectedKeyword);
        if (searchQuery) params.append('search', searchQuery);
        if (dateRange.start) params.append('startDate', dateRange.start);

        if (dateRange.end) {
             // Ensure end date includes the full day (23:59:59)
             // But the API treats it as <= value. If we send '2023-10-27', we want everything on that day.
             // If we rely on string comparison in SQL, '2023-10-27' < '2023-10-27 10:00:00'.
             // So we should probably send the next day or a full timestamp.
             // Let's format it as ISO string end of day
             const endDate = new Date(dateRange.end);
             endDate.setHours(23, 59, 59, 999);
             params.append('endDate', endDate.toISOString());
        }

        const response = await fetch(`/api/articles?${params.toString()}`);
        if (!response.ok) throw new Error(`加载失败: ${response.statusText}`);

        const data = await response.json();
        const cleanArticles = data.articles.map(item => ({
            ...item,
            keywords: Array.isArray(item.keywords) ? item.keywords : [] 
        }));

        setArticles(cleanArticles);
        setPagination(prev => ({ ...prev, ...data.pagination }));

      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    // Debounce search query to avoid too many requests
    const timeoutId = setTimeout(() => {
        fetchData();
    }, 300);

    return () => clearTimeout(timeoutId);

  }, [pagination.page, pagination.limit, selectedSource, selectedKeyword, searchQuery, dateRange.start, dateRange.end]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [selectedSource, selectedKeyword, searchQuery, dateRange]);

  const resetFilters = () => {
    setSelectedSource(null);
    setSelectedKeyword(null);
    setSearchQuery("");
    setDateRange({ start: "", end: "" });
  };

  const setDateShortcut = (days) => {
      const end = new Date();
      const start = new Date();

      if (days === 0) {
          // Today: Start is same as end
      } else {
          start.setDate(end.getDate() - days);
      }

      // Format YYYY-MM-DD using local time
      const format = (d) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
      };

      setDateRange({
          start: format(start),
          end: format(end)
      });
  };

  const setDateRangeLastMonth = () => {
    const end = new Date();
    const start = new Date();
    start.setMonth(end.getMonth() - 1);

    // Format YYYY-MM-DD using local time
    const format = (d) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
    };

    setDateRange({ start: format(start), end: format(end) });
  };

  if (loading && pagination.page === 1 && articles.length === 0) {
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
                <span className="bg-gray-100 text-gray-500 py-0.5 px-2 rounded-full text-xs">
                    {/* We don't have total articles count easily available for "All", maybe metadata can provide it or we sum sources */}
                    {loadingMeta ? '...' : metadata.sources.reduce((acc, s) => acc + parseInt(s.count), 0)}
                </span>
              </button>
              {metadata.sources.map(source => (
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
              {metadata.keywords.map(kw => (
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
            <div className="flex flex-wrap items-center gap-3">
               <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                <Calendar className="w-4 h-4 text-gray-400 ml-2" />
                <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="bg-transparent text-xs text-gray-600 focus:outline-none w-24" />
                <span className="text-gray-300">-</span>
                <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="bg-transparent text-xs text-gray-600 focus:outline-none w-24" />

                {/* Date Shortcuts */}
                <div className="flex items-center gap-1 pl-2 border-l border-gray-200">
                    <button onClick={() => setDateShortcut(0)} className="px-2 py-1 text-xs bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200 rounded transition-colors">今天</button>
                    <button onClick={() => setDateShortcut(3)} className="px-2 py-1 text-xs bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200 rounded transition-colors">近3日</button>
                    <button onClick={() => setDateShortcut(7)} className="px-2 py-1 text-xs bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200 rounded transition-colors">近1周</button>
                    <button onClick={setDateRangeLastMonth} className="px-2 py-1 text-xs bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200 rounded transition-colors">近1月</button>
                </div>
              </div>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setViewMode("card")} className={`p-1.5 rounded-md ${viewMode === "card" ? "bg-white shadow text-indigo-600" : "text-gray-500"}`}><LayoutGrid className="w-4 h-4" /></button>
                <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md ${viewMode === "list" ? "bg-white shadow text-indigo-600" : "text-gray-500"}`}><List className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
          {(selectedSource || selectedKeyword || searchQuery || dateRange.start) && (
             <div className="flex items-center gap-2 text-xs text-gray-500">
               <span>筛选中...</span>
               <button onClick={resetFilters} className="ml-auto flex items-center gap-1 text-red-500 hover:text-red-600 font-medium"><FilterX className="w-3 h-3" /> 重置</button>
             </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 flex flex-col">
          <div className="max-w-7xl mx-auto w-full flex-1">
            {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>
            ) : articles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400"><p>无内容</p></div>
            ) : (
              <div className={viewMode === "card" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "flex flex-col space-y-3"}>
                {articles.map(article => (
                  <ArticleItem key={article.id} article={article} viewMode={viewMode} onKeywordClick={setSelectedKeyword} />
                ))}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          <div className="mt-8 flex items-center justify-center gap-4 py-4 border-t border-gray-200 bg-slate-50">
             <button
                onClick={() => setPagination(p => ({...p, page: Math.max(1, p.page - 1)}))}
                disabled={pagination.page <= 1}
                className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-transparent"
             >
                 <ChevronLeft className="w-5 h-5" />
             </button>
             <span className="text-sm text-gray-600">
                 第 <span className="font-bold text-indigo-600">{pagination.page}</span> 页 / 共 {pagination.totalPages} 页
             </span>
             <button
                onClick={() => setPagination(p => ({...p, page: Math.min(pagination.totalPages, p.page + 1)}))}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-transparent"
             >
                 <ChevronRight className="w-5 h-5" />
             </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function ArticleItem({ article, viewMode, onKeywordClick }) {
  const isCard = viewMode === "card";
  const [expanded, setExpanded] = useState(false);

  // Truncate logic
  const maxLength = isCard ? 150 : 300;
  const shouldTruncate = article.summary && article.summary.length > maxLength;

  const displaySummary = expanded || !shouldTruncate
    ? article.summary
    : article.summary?.slice(0, maxLength) + '...';

  return (
    <div className={`group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-indigo-200 transition-all ${isCard ? 'flex flex-col h-full' : 'flex flex-col md:flex-row md:items-start p-4 gap-4'}`}>
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
        <div className="text-gray-500 text-sm leading-relaxed">
            {displaySummary}
            {shouldTruncate && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="ml-2 text-indigo-600 hover:text-indigo-800 text-xs font-medium inline-flex items-center"
                >
                    {expanded ? <><ChevronUp className="w-3 h-3 mr-0.5" /> 收起</> : <><ChevronDown className="w-3 h-3 mr-0.5" /> 展开</>}
                </button>
            )}
        </div>
      </div>
      <div className={`${isCard ? 'p-5 pt-0 mt-auto border-t border-gray-50' : 'md:w-1/3 md:flex md:flex-col md:items-end md:gap-2'}`}>
        <div className={`flex flex-wrap gap-2 ${isCard ? 'mt-4' : ''}`}>
          {article.keywords?.map((keyword, idx) => (
             <button key={idx} onClick={(e) => { e.preventDefault(); onKeywordClick(keyword); }} className="text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors">#{keyword}</button>
          ))}
          {!isCard && (<a href={article.article_url} target="_blank" rel="noopener noreferrer" className="ml-auto md:ml-0 p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"><ExternalLink className="w-4 h-4" /></a>)}
        </div>
      </div>
    </div>
  );
}
