'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { SensorData } from '../lib/types';

interface SensorCardProps {
  title: string;
  value: number | string;
  unit: string;
  data: SensorData[];
  dataKey: keyof SensorData;
  color: string;
  icon?: LucideIcon;
  subLabel?: string;
  className?: string; // Add className prop for grid control
}

const colorMap = {
  emerald: { text: 'text-[#3d6010]', stroke: '#4a7c1c', fill: '#4a7c1c' },
  teal: { text: 'text-teal-700', stroke: '#0d9488', fill: '#0d9488' },
  cyan: { text: 'text-cyan-600', stroke: '#0891b2', fill: '#0891b2' },
  sky: { text: 'text-sky-600', stroke: '#0284c7', fill: '#0284c7' },
  blue: { text: 'text-blue-600', stroke: '#2563eb', fill: '#2563eb' },
  indigo: { text: 'text-indigo-600', stroke: '#4f46e5', fill: '#4f46e5' },
  violet: { text: 'text-violet-600', stroke: '#7c3aed', fill: '#7c3aed' },
  purple: { text: 'text-purple-600', stroke: '#9333ea', fill: '#9333ea' },
  fuchsia: { text: 'text-fuchsia-600', stroke: '#c026d3', fill: '#c026d3' },
  pink: { text: 'text-pink-600', stroke: '#db2777', fill: '#db2777' },
  rose: { text: 'text-rose-600', stroke: '#e11d48', fill: '#e11d48' },
  red: { text: 'text-red-600', stroke: '#dc2626', fill: '#dc2626' },
  orange: { text: 'text-orange-600', stroke: '#ea580c', fill: '#ea580c' },
  amber: { text: 'text-amber-600', stroke: '#d97706', fill: '#d97706' },
  yellow: { text: 'text-yellow-600', stroke: '#ca8a04', fill: '#ca8a04' },
  lime: { text: 'text-lime-600', stroke: '#65a30d', fill: '#65a30d' },
  green: { text: 'text-green-600', stroke: '#16a34a', fill: '#16a34a' },
};

export function SensorCard({ 
  title, 
  value, 
  unit, 
  data, 
  dataKey, 
  color, // Expect 'emerald', 'sky', etc.
  icon: Icon,
  subLabel = "last 5 minutes",
  className,
}: SensorCardProps) {
  
  // Format data for chart
  const chartData = data.slice(-20).map(d => ({
    ...d,
    timestamp: new Date(d.timestamp || Date.now()).toLocaleTimeString()
  }));

  // Fallback color
  const colors = colorMap[color as keyof typeof colorMap] || colorMap.emerald;

  return (
    <div className={clsx("bg-white rounded-xl p-4 transition-all hover:brightness-95", className)}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className={clsx("w-4 h-4", colors.text)} />}
          <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-gray-900">{value}</span>
          <span className="text-sm font-medium text-gray-500 ml-1">{unit}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-[#4a7c1c] mb-3 bg-[#e8f2da] w-fit px-2 py-1 rounded">
         <span className="font-medium">Live</span>
         <span className="text-gray-400">{subLabel}</span>
      </div>

      <div className="h-24 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.stroke} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={colors.stroke} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="timestamp" hide />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip 
              contentStyle={{ background: '#fff', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ color: '#374151', fontSize: '12px' }}
              labelStyle={{ display: 'none' }}
              formatter={(val: number | undefined) => [`${val ?? '-'} ${unit}`, title]}
            />
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={colors.stroke} 
              fill={`url(#gradient-${dataKey})`} 
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
