'use client';

import React, { useState, useEffect } from 'react';
import {
  Lock, Plus, Trash2, Edit2, Play, AlertCircle,
  CheckCircle, RefreshCw, ChevronLeft, LogOut, Settings
} from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if we have a session (simple client-side check of cookie existence or rely on API)
  // Since HttpOnly cookies can't be read by JS, we'll try to fetch a protected resource or just assume login needed
  // if we fail. For this simple app, we'll use a local state persisted after login or just show login form.
  // Better approach: Check valid session with an API call. But for now, we'll handle login flow here.

  useEffect(() => {
    // Check session on mount
    fetch('/api/admin/check-session')
        .then(res => res.json())
        .then(data => {
            if (data.authenticated) setIsAuthenticated(true);
        })
        .catch(err => console.error("Session check failed", err))
        .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  if (!isAuthenticated) {
    return <LoginForm onLogin={() => setIsAuthenticated(true)} />;
  }

  return <AdminDashboard onLogout={() => setIsAuthenticated(false)} />;
}

function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        onLogin();
      } else {
        setError('认证失败，请检查用户名和密码');
      }
    } catch (err) {
      setError('登录请求失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-600 p-3 rounded-full">
            <Lock className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">管理员登录</h2>
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 font-medium"
          >
            {submitting ? '登录中...' : '进入管理后台'}
          </button>
        </form>
        <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-gray-500 hover:text-indigo-600">返回首页</Link>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ onLogout }) {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch('/api/rss-sources')
      .then(res => res.json())
      .then(data => {
          setSources(data);
          setLoading(false);
      })
      .catch(err => console.error(err));
  }, [refreshKey]);

  const refreshSources = () => setRefreshKey(k => k + 1);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" /> RSS 管理后台
              </h1>
            </div>
            <button onClick={onLogout} className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-1">
              <LogOut className="w-4 h-4" /> 退出
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Backend Trigger Section */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-indigo-600" /> 后端抓取触发
          </h2>
          <TriggerSection />
        </section>

        {/* RSS Sources Management */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <RssIcon /> 订阅源管理
            </h2>
            <AddSourceButton onAdded={refreshSources} />
          </div>

          {loading ? (
             <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                  <tr>
                    <th className="px-6 py-3">名称</th>
                    <th className="px-6 py-3">URL</th>
                    <th className="px-6 py-3">Prompt</th>
                    <th className="px-6 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sources.map(source => (
                    <SourceRow key={source.id} source={source} onRefresh={refreshSources} />
                  ))}
                  {sources.length === 0 && (
                      <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-400">暂无订阅源</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

function SourceRow({ source, onRefresh }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: source.name, url: source.url, custom_prompt: source.custom_prompt || '' });
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`确定要删除 "${source.name}" 吗？这不会删除已抓取的文章。`)) return;
    try {
        await fetch(`/api/rss-sources/${source.id}`, { method: 'DELETE' });
        onRefresh();
    } catch(e) { alert('删除失败'); }
  };

  const handleClearArticles = async () => {
    if (!confirm(`确定要清空属于 "${source.name}" 的所有已抓取文章吗？此操作不可恢复。`)) return;
    try {
        const res = await fetch(`/api/admin/clear-articles?rss_source=${encodeURIComponent(source.name)}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            alert(`清理成功，删除了 ${data.count} 篇文章`);
        } else {
            alert('清理失败');
        }
    } catch(e) { alert('请求失败'); }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
        const res = await fetch(`/api/rss-sources/${source.id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(formData)
        });
        if (res.ok) {
            setIsEditing(false);
            onRefresh();
        } else {
            alert('保存失败');
        }
    } catch(e) { alert('保存失败'); }
    finally { setLoading(false); }
  };

  if (isEditing) {
      return (
          <tr className="bg-indigo-50">
              <td className="px-6 py-4">
                  <input className="w-full border rounded px-2 py-1" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </td>
              <td className="px-6 py-4">
                  <input className="w-full border rounded px-2 py-1" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} />
              </td>
              <td className="px-6 py-4">
                  <input className="w-full border rounded px-2 py-1" value={formData.custom_prompt} onChange={e => setFormData({...formData, custom_prompt: e.target.value})} placeholder="Prompt..." />
              </td>
              <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={handleSave} disabled={loading} className="text-green-600 font-medium hover:underline">保存</button>
                  <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:underline">取消</button>
              </td>
          </tr>
      )
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 font-medium text-gray-900">{source.name}</td>
      <td className="px-6 py-4 text-gray-500 truncate max-w-[200px]" title={source.url}>{source.url}</td>
      <td className="px-6 py-4 text-gray-400 truncate max-w-[150px]">{source.custom_prompt || '-'}</td>
      <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
        <button onClick={() => setIsEditing(true)} className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50" title="编辑">
            <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={handleClearArticles} className="text-amber-600 hover:text-amber-900 p-1 rounded hover:bg-amber-50" title="清空文章">
            <Trash2 className="w-4 h-4" />
        </button>
        <button onClick={handleDelete} className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50" title="删除源">
            <LogOut className="w-4 h-4 rotate-180" />
            {/* Using LogOut rotated as a delete icon alternative or just reuse trash but different color? Let's use Trash2 for both but context hints */}
        </button>
      </td>
    </tr>
  );
}

function AddSourceButton({ onAdded }) {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', url: '', custom_prompt: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/rss-sources', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setOpen(false);
                setFormData({ name: '', url: '', custom_prompt: '' });
                onAdded();
            } else {
                alert('添加失败，可能 URL 已存在');
            }
        } catch (e) { alert('API Error'); }
        finally { setLoading(false); }
    };

    if (!open) {
        return (
            <button onClick={() => setOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" /> 新增订阅源
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <h3 className="text-lg font-bold mb-4">新增订阅源</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">名称</label>
                        <input required className="w-full border rounded-lg px-3 py-2" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">URL</label>
                        <input required type="url" className="w-full border rounded-lg px-3 py-2" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Custom Prompt (可选)</label>
                        <textarea className="w-full border rounded-lg px-3 py-2" value={formData.custom_prompt} onChange={e => setFormData({...formData, custom_prompt: e.target.value})} />
                    </div>
                    <div className="flex gap-3 justify-end mt-6">
                        <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">添加</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function TriggerSection() {
    const [creds, setCreds] = useState({ username: '', password: '' });
    const [status, setStatus] = useState(null); // null, 'loading', 'success', 'error'
    const [msg, setMsg] = useState('');

    const handleTrigger = async () => {
        setStatus('loading');
        setMsg('');
        try {
            const res = await fetch('/api/admin/trigger-update', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(creds)
            });
            const data = await res.json();
            if (res.ok) {
                setStatus('success');
                setMsg('后端任务已触发');
            } else {
                setStatus('error');
                setMsg(data.error || '触发失败');
            }
        } catch (e) {
            setStatus('error');
            setMsg('网络请求失败');
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-1 space-y-4 w-full">
                <p className="text-sm text-gray-500">
                    此操作将调用配置的后端 URL (BACKEND_URL) 来抓取最新的 RSS 文章。
                    如果后端需要 Basic Auth，请在下方输入。
                </p>
                <div className="grid grid-cols-2 gap-4">
                    <input
                        type="text"
                        placeholder="Basic Auth Username (可选)"
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        value={creds.username}
                        onChange={e => setCreds({...creds, username: e.target.value})}
                    />
                    <input
                        type="password"
                        placeholder="Basic Auth Password (可选)"
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        value={creds.password}
                        onChange={e => setCreds({...creds, password: e.target.value})}
                    />
                </div>
            </div>
            <div className="flex flex-col items-end gap-2 min-w-[150px]">
                <button
                    onClick={handleTrigger}
                    disabled={status === 'loading'}
                    className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-medium text-white transition-all w-full
                        ${status === 'loading' ? 'bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700 shadow-md hover:shadow-lg active:scale-95'}
                    `}
                >
                    {status === 'loading' ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                    {status === 'loading' ? '请求中...' : '立即触发'}
                </button>
                {msg && (
                    <div className={`text-xs flex items-center gap-1 ${status === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {status === 'success' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {msg}
                    </div>
                )}
            </div>
        </div>
    );
}

function RssIcon() {
    return (
        <div className="bg-indigo-100 p-1.5 rounded-lg">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 2 1 0 012 0z"></path></svg>
        </div>
    )
}
