import React from 'react';
import { StorageTelemetry, RepositoryItem } from '../types';
import {
  BarChart2,
  HardDrive,
  Radio,
  Zap,
  Download,
  Activity,
  Layers,
  PieChart as PieChartIcon,
  TrendingUp,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface StorageTelemetryDashboardProps {
  telemetryHistory: StorageTelemetry[];
  files: RepositoryItem[];
}

export const StorageTelemetryDashboard: React.FC<StorageTelemetryDashboardProps> = ({
  telemetryHistory,
  files,
}) => {
  const latest = telemetryHistory[telemetryHistory.length - 1] || {
    totalEgressGbps: 34.2,
    downloadRequestsCount: 15400,
    storageUsedGb: 1684.2,
    storageQuotaGb: 5000,
    hotCacheHitPct: 94.2,
    avgLatencyMs: 14,
  };

  const usagePct = ((latest.storageUsedGb / latest.storageQuotaGb) * 100).toFixed(1);

  // Category breakdown for Pie Chart
  const categoryMap: { [key: string]: number } = {};
  files.forEach((f) => {
    categoryMap[f.category] = (categoryMap[f.category] || 0) + f.fileSizeBytes;
  });

  const categoryPieData = Object.keys(categoryMap).map((cat) => ({
    name: cat.replace('_', ' ').toUpperCase(),
    sizeGb: (categoryMap[cat] / 1000000000).toFixed(1),
    value: categoryMap[cat],
  }));

  const COLORS = ['#2563eb', '#f59e0b', '#a855f7', '#22c55e', '#f43f5e'];

  // Top Downloaded Leaderboard
  const topDownloadedFiles = [...files]
    .sort((a, b) => b.downloadsCount - a.downloadsCount)
    .slice(0, 5);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-[#0a0a0f] p-5 rounded-2xl border border-slate-800/80 space-y-2 shadow-xl">
        <div className="flex items-center space-x-2">
          <BarChart2 className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-bold text-white font-mono">
            Storage & Egress Bandwidth Telemetry Control
          </h2>
        </div>
        <p className="text-xs text-slate-400 font-sans leading-relaxed">
          Real-time cluster telemetry monitoring S3-compatible object egress rates, NVMe hot cache hit efficiency, download latency metrics, and quota utilization.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Storage Quota */}
        <div className="bg-[#0a0a0f] p-5 rounded-2xl border border-slate-800/80 shadow-xl space-y-3 font-mono">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase text-[10px] tracking-widest text-slate-500">STORAGE USED</span>
            <HardDrive className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{(latest.storageUsedGb / 1000).toFixed(2)} TB</span>
            <span className="text-xs text-slate-500">/ 5.0 TB</span>
          </div>

          <div className="space-y-1">
            <div className="w-full bg-[#050507] rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="bg-blue-600 h-full transition-all duration-500 rounded-full"
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400">{usagePct}% of cluster quota allocated</span>
          </div>
        </div>

        {/* Card 2: Egress Throughput */}
        <div className="bg-[#0a0a0f] p-5 rounded-2xl border border-slate-800/80 shadow-xl space-y-3 font-mono">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase text-[10px] tracking-widest text-slate-500">EGRESS THROUGHPUT</span>
            <Radio className="w-4 h-4 text-blue-400 animate-pulse" />
          </div>
          <div>
            <span className="text-2xl font-bold text-blue-400">{latest.totalEgressGbps.toFixed(1)} GB/s</span>
            <span className="text-xs text-slate-400 block mt-0.5">Edge CDN Multi-Region Egress</span>
          </div>
          <span className="text-[10px] text-emerald-400 flex items-center space-x-1">
            <TrendingUp className="w-3 h-3" />
            <span>Optimal network throughput</span>
          </span>
        </div>

        {/* Card 3: Cache Hit Rate */}
        <div className="bg-[#0a0a0f] p-5 rounded-2xl border border-slate-800/80 shadow-xl space-y-3 font-mono">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase text-[10px] tracking-widest text-slate-500">NVMe HOT CACHE HIT</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-2xl font-bold text-emerald-400">{latest.hotCacheHitPct.toFixed(1)}%</span>
            <span className="text-xs text-slate-400 block mt-0.5">Avg Latency: {latest.avgLatencyMs} ms</span>
          </div>
          <span className="text-[10px] text-emerald-300">Fast RAM/NVMe offload buffer</span>
        </div>

        {/* Card 4: Request Frequency */}
        <div className="bg-[#0a0a0f] p-5 rounded-2xl border border-slate-800/80 shadow-xl space-y-3 font-mono">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase text-[10px] tracking-widest text-slate-500">DOWNLOAD REQUESTS</span>
            <Download className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <span className="text-2xl font-bold text-amber-400">{latest.downloadRequestsCount.toLocaleString()}</span>
            <span className="text-xs text-slate-400 block mt-0.5">Active Client GET Queries</span>
          </div>
          <span className="text-[10px] text-slate-400">Zero rate-limit throttling</span>
        </div>
      </div>

      {/* Telemetry Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Egress & Download Request Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart 1: Real-time Egress Throughput */}
          <div className="bg-[#0a0a0f] border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 font-mono">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Real-time Egress Bandwidth Stream (GB/s)
                </h3>
              </div>
              <span className="text-[10px] text-slate-500">Live 15-Min Timeline</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={telemetryHistory}>
                  <defs>
                    <linearGradient id="colorEgress" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="timeLabel" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} unit=" GB/s" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#050507', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Area type="monotone" dataKey="totalEgressGbps" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorEgress)" name="Egress (GB/s)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Download Request Volume */}
          <div className="bg-[#0a0a0f] border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 font-mono">
              <div className="flex items-center space-x-2">
                <Download className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Download GET Request Query Load
                </h3>
              </div>
              <span className="text-[10px] text-slate-500">Requests / Minute</span>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={telemetryHistory}>
                  <XAxis dataKey="timeLabel" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#050507', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Bar dataKey="downloadRequestsCount" fill="#f59e0b" radius={[4, 4, 0, 0]} name="GET Queries" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Col: Category Breakdown & Top Leaderboard */}
        <div className="space-y-6">
          {/* Storage Breakdown by Asset Category */}
          <div className="bg-[#0a0a0f] border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 font-mono">
              <PieChartIcon className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Storage Allocation by Asset
              </h3>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                    {categoryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#050507', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 font-mono text-xs pt-2">
              {categoryPieData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-slate-300">{item.name}</span>
                  </div>
                  <span className="text-white font-bold">{item.sizeGb} GB</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Downloaded Files Leaderboard */}
          <div className="bg-[#0a0a0f] border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 font-mono">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Top Downloaded Asset Vault
              </h3>
            </div>

            <div className="space-y-3 font-mono">
              {topDownloadedFiles.map((file, rank) => (
                <div key={file.id} className="bg-[#050507] p-3 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <span className="text-xs font-bold text-slate-500 w-4">#{rank + 1}</span>
                    <div className="truncate">
                      <span className="text-white font-bold block truncate">{file.title}</span>
                      <span className="text-[10px] text-slate-500">{file.fileSizeFormatted} • {file.version}</span>
                    </div>
                  </div>

                  <span className="text-blue-400 font-bold text-xs flex-shrink-0 ml-2">
                    {file.downloadsCount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
