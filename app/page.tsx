'use client';

import React, { useEffect, useState } from 'react';
import { useMqtt } from '../lib/mqtt-context';
import { SensorCard } from '../components/SensorCard';
import { ControlPanel } from '../components/ControlPanel';
import {
  Thermometer,
  Droplets,
  FlaskConical,
  Activity,
  Wind,
  Zap,
  Gauge,
  Flame,
} from 'lucide-react';
import { SensorData } from '../lib/types';

export default function DashboardPage() {
  const { telemetry, history, selectedDevice, isConnected } = useMqtt();
  const [currentTime, setCurrentTime] = useState<string>('--:--:--');

  useEffect(() => {
    const formatTime = () =>
      new Date().toLocaleTimeString('en-US', { hour12: false });
    setCurrentTime(formatTime());
    const interval = setInterval(() => setCurrentTime(formatTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  const currentData = telemetry[selectedDevice] || {
    mq8: 0,
    mq3: 0,
    mq5: 0,
    temp_liquid: 0,
    tds: 0,
    temp_air: 0,
    humidity: 0,
    ph: 7.0,
  };

  const deviceHistory = history[selectedDevice] || [];

  const sensors: {
    title: string;
    value: number;
    unit: string;
    dataKey: keyof SensorData;
    color: string;
    icon: any;
  }[] = [
    { title: 'Temperature (Air)',    value: currentData.temp_air,    unit: '°C',  dataKey: 'temp_air',    color: 'emerald', icon: Thermometer },
    { title: 'LPG / Gas (MQ5)',      value: currentData.mq5,         unit: 'ppm', dataKey: 'mq5',         color: 'emerald', icon: Flame },
    { title: 'Alcohol (MQ3)',        value: currentData.mq3,         unit: 'ppm', dataKey: 'mq3',         color: 'emerald', icon: Zap },
    { title: 'Temperature (Liquid)', value: currentData.temp_liquid,  unit: '°C',  dataKey: 'temp_liquid', color: 'emerald', icon: Thermometer },
    { title: 'Hydrogen (MQ8)',       value: currentData.mq8,         unit: 'ppm', dataKey: 'mq8',         color: 'emerald', icon: Activity },
    { title: 'Humidity (DHT11)',     value: currentData.humidity,    unit: '%',   dataKey: 'humidity',    color: 'emerald', icon: Gauge },
    { title: 'Fermentation pH',      value: currentData.ph,          unit: 'pH',  dataKey: 'ph',          color: 'emerald', icon: FlaskConical },
    { title: 'TDS Value',            value: currentData.tds,         unit: 'ppm', dataKey: 'tds',         color: 'emerald', icon: Droplets },
  ];

  return (
    <div className="flex flex-col flex-1">
      {/* ── Cream header bar ── */}
      <header className="flex items-center justify-between px-8 py-4 bg-[#f0e8cc] border-b border-[#d4c897]">
        <div className="flex items-center gap-4">
          <span className="text-base font-bold text-[#2d4010]">Time</span>
          <span className="text-2xl font-mono font-black text-[#1a2208] tracking-widest">
            {currentTime}
          </span>
        </div>
        <ControlPanel />
      </header>

      {/* ── Dark olive-green content area ── */}
      <div className="flex-1 bg-[#4a5b1c] p-6 overflow-y-auto relative">
        {/* Decorative watermark */}
        <div className="pointer-events-none absolute bottom-0 right-0 w-[480px] h-[480px] select-none overflow-hidden">
          <svg width="570" height="570" viewBox="0 0 570 570" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M116.102 226.673C116.102 119.598 116.102 66.0608 149.213 33.0304C182.324 0 235.992 0 343.328 0C343.328 107.075 343.328 160.613 310.217 193.643C277.106 226.673 223.438 226.673 116.102 226.673Z" fill="white" fillOpacity="0.2"/>
            <path d="M0 570C0 427.147 0 355.72 44.0674 311.652C88.1348 267.585 159.562 267.585 302.416 267.585C302.416 410.439 302.416 481.866 258.348 525.933C214.281 570 142.854 570 0 570Z" fill="white" fillOpacity="0.25"/>
            <path d="M391.426 166.411C391.426 94.8539 391.426 59.0752 413.5 37.0012C435.574 14.9272 471.353 14.9272 542.91 14.9272C542.91 86.4847 542.91 122.263 520.836 144.337C498.762 166.411 462.983 166.411 391.426 166.411Z" fill="white" fillOpacity="0.3"/>
            <path d="M343.326 468.826C343.326 361.751 343.326 308.213 376.357 275.183C409.387 242.152 462.925 242.152 570 242.152C570 349.227 570 402.765 536.969 435.795C503.939 468.826 450.401 468.826 343.326 468.826Z" fill="white" fillOpacity="0.35"/>
          </svg>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sensors.map((sensor, idx) => (
            <SensorCard
              key={idx}
              title={sensor.title}
              value={typeof sensor.value === 'number' ? sensor.value.toFixed(1) : sensor.value}
              unit={sensor.unit}
              data={deviceHistory}
              dataKey={sensor.dataKey}
              color={sensor.color}
              icon={sensor.icon}
            />
          ))}
        </div>
      </div>

      {/* ── Disconnected toast ── */}
      {!isConnected && (
        <div className="fixed bottom-6 right-6 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold animate-bounce z-50">
          Connection Lost — Reconnecting…
        </div>
      )}
    </div>
  );
}
