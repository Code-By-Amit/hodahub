'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FiPackage,
  FiShoppingCart,
  FiUsers,
  FiDollarSign,
  FiAlertTriangle,
  FiArrowRight,
  FiEye,
  FiTrendingUp,
  FiTrendingDown,
  FiRefreshCw,
  FiMonitor,
  FiSmartphone,
  FiTablet,
} from 'react-icons/fi';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  async function loadData(isManual = false) {
    if (isManual) setRefreshing(true);
    try {
      const [statsRes, analyticsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/analytics'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      }

      setLastUpdated(new Date().toLocaleTimeString());
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 30000); // 30s polling
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    {
      label: '30-Day Visitors',
      value: analytics?.metrics?.uniqueVisitors?.toLocaleString() || '0',
      change: analytics?.metrics?.uniqueVisitorsChangePct || 0,
      icon: FiUsers,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      label: '30-Day Page Views',
      value: analytics?.metrics?.totalPageViews?.toLocaleString() || '0',
      change: analytics?.metrics?.pageViewsChangePct || 0,
      icon: FiEye,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    {
      label: 'Total Orders',
      value: stats?.totalOrders || '0',
      icon: FiShoppingCart,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(stats?.totalRevenue || 0),
      icon: FiDollarSign,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-warm-200 pb-3">
        <div>
          <h1 className="text-base font-bold text-warm-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-[11px] text-warm-500 mt-0.5">
            Real-time storefront performance, traffic metrics, and inventory alerts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Polling (30s)
          </span>
          {lastUpdated && (
            <span className="text-[10px] text-warm-400 font-mono hidden sm:inline">
              Updated: {lastUpdated}
            </span>
          )}
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-1.5 border border-warm-200 rounded-md text-warm-600 hover:bg-warm-50 transition-colors disabled:opacity-50"
            title="Refresh now"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-md bg-warm-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Metrics Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="p-3 bg-white rounded-md border border-warm-200 shadow-xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">
                      {stat.label}
                    </span>
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center border ${stat.color}`}>
                      <Icon className="w-3 h-3" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <p className="text-lg font-bold text-warm-900 tracking-tight">{stat.value}</p>
                      {stat.change !== undefined && (
                        <span
                          className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${
                            stat.change >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {stat.change >= 0 ? (
                            <FiTrendingUp className="w-2.5 h-2.5" />
                          ) : (
                            <FiTrendingDown className="w-2.5 h-2.5" />
                          )}
                          {Math.abs(stat.change)}% vs prev 30d
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Traffic Chart & Devices */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* 30-Day Visitors Line Chart */}
            <div className="lg:col-span-2 p-4 bg-white rounded-md border border-warm-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-warm-100 pb-2">
                <div>
                  <h2 className="font-bold text-warm-900 text-[13px]">Store Traffic (Last 30 Days)</h2>
                  <p className="text-[10px] text-warm-500">Unique visitors and total page views per day</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-semibold">
                  <span className="flex items-center gap-1 text-brand-600">
                    <span className="w-2 h-2 rounded-full bg-brand-600" /> Page Views
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Unique Visitors
                  </span>
                </div>
              </div>

              <div className="h-48 w-full">
                {analytics?.chartData?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          fontSize: '11px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="views"
                        stroke="#4f46e5"
                        strokeWidth={1.5}
                        fillOpacity={1}
                        fill="url(#colorViews)"
                        name="Page Views"
                      />
                      <Area
                        type="monotone"
                        dataKey="visitors"
                        stroke="#10b981"
                        strokeWidth={1.5}
                        fillOpacity={1}
                        fill="url(#colorVisitors)"
                        name="Unique Visitors"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-[10px] text-warm-400">
                    No traffic data recorded in last 30 days. Browse store pages to generate live analytics traffic!
                  </div>
                )}
              </div>
            </div>

            {/* Device Breakdown */}
            <div className="p-4 bg-white rounded-md border border-warm-200 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <h2 className="font-bold text-warm-900 text-[13px] pb-2 border-b border-warm-100">
                  Device Breakdown
                </h2>
                <p className="text-[10px] text-warm-500 mt-1 mb-3">
                  Distribution of traffic by visitor client device
                </p>

                <div className="space-y-3">
                  {analytics?.deviceBreakdown?.length > 0 ? (
                    analytics.deviceBreakdown.map((dev) => {
                      const Icon =
                        dev.name === 'Mobile'
                          ? FiSmartphone
                          : dev.name === 'Tablet'
                          ? FiTablet
                          : FiMonitor;
                      return (
                        <div key={dev.name} className="space-y-1">
                          <div className="flex justify-between text-[10px] font-semibold">
                            <span className="flex items-center gap-1 text-warm-700">
                              <Icon className="w-3 h-3 text-warm-500" /> {dev.name}
                            </span>
                            <span className="text-warm-900">{dev.percentage}% ({dev.value.toLocaleString()})</span>
                          </div>
                          <div className="w-full h-1.5 bg-warm-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-600 rounded-full transition-all duration-500"
                              style={{ width: `${dev.percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-[10px] text-warm-400 text-center py-4">No device data available yet.</p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-warm-100 text-[10px] text-warm-500 flex justify-between">
                <span>Avg Session Duration:</span>
                <span className="font-bold text-warm-900">{analytics?.metrics?.avgSessionDuration || '0m 0s'}</span>
              </div>
            </div>
          </div>

          {/* Top Pages & Low Stock Section */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Top 5 Visited Pages */}
            <div className="p-4 bg-white rounded-md border border-warm-200 shadow-xs">
              <h2 className="font-bold text-warm-900 text-[13px] pb-2 border-b border-warm-100 mb-3">
                Most Visited Pages (30 Days)
              </h2>
              {analytics?.topPages?.length > 0 ? (
                <div className="divide-y divide-warm-100">
                  {analytics.topPages.map((page, idx) => (
                    <div key={page.path} className="py-2 flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 max-w-[75%]">
                        <span className="w-4 h-4 rounded-full bg-warm-100 text-warm-700 font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-mono text-warm-800 truncate">{page.path}</span>
                      </div>
                      <span className="font-semibold text-warm-900 bg-warm-50 px-2 py-0.5 rounded-md border border-warm-200/60">
                        {page.views.toLocaleString()} views
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-warm-400 py-4 text-center">No page views tracked yet.</p>
              )}
            </div>

            {/* Low Stock Alerts */}
            <div className="p-4 bg-white rounded-md border border-warm-200 shadow-xs">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-warm-100">
                <h2 className="font-bold text-warm-900 text-[13px] flex items-center gap-1.5">
                  <FiAlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Low Stock Alerts (≤ 5)
                </h2>
                <Link
                  href="/admin/products"
                  className="text-[10px] text-brand-600 font-semibold hover:underline flex items-center gap-1"
                >
                  Manage Products <FiArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {stats?.lowStockProducts?.length > 0 ? (
                <div className="space-y-2">
                  {stats.lowStockProducts.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 bg-amber-50/60 border border-amber-200/80 rounded-md text-[10px]"
                    >
                      <span className="font-semibold text-warm-900 truncate max-w-xs">{p.name}</span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold rounded-full shrink-0">
                        {p.stock} remaining
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-warm-400 py-4 text-center">
                  All active products have healthy inventory levels (&gt; 5 units).
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}