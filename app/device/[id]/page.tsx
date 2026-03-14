'use client';

import React, { useEffect, useState } from 'react';
import { useMqtt } from '../../../lib/mqtt-context';
import { SensorCard } from '../../../components/SensorCard';
import { ControlPanel } from '../../../components/ControlPanel';
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
import { SensorData } from '../../../lib/types';

export default function DevicePage({ params }: { params: any }) {
  const { telemetry, history, selectedDeviceId, devices, isConnected, selectDevice } = useMqtt();
  // Next 16+: `params` may be a Promise in client components; unwrap with React.use()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolvedParams = (React as any).use ? (React as any).use(params) : params;
  const deviceId = resolvedParams?.id;
  const [currentTime, setCurrentTime] = useState<string>('--:--:--');

  useEffect(() => {
    // Ensure provider selection matches the route
    if (selectedDeviceId !== deviceId) selectDevice(deviceId);
  }, [deviceId, selectedDeviceId, selectDevice]);

  useEffect(() => {
    const formatTime = () =>
      new Date().toLocaleTimeString('en-US', { hour12: false });
    setCurrentTime(formatTime());
    const interval = setInterval(() => setCurrentTime(formatTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  const selectedDevice = devices.find((d) => d.id === deviceId);

  const currentData = (telemetry[deviceId]) || {
    mq8:      0,
    mq3:      0,
    mq5:      0,
    temp:     0,
    tds:      0,
    dht_temp: 0,
    humidity: 0,
    ph:       7.0,
    aerator:  false,
    led:      false,
    ts:       0,
    wallClock: 0,
  };

  const deviceHistory = history[deviceId] || [];

  const sensors: {
    title: string;
    value: number;
    unit: string;
    dataKey: keyof SensorData;
    color: string;
    icon: any;
  }[] = [
    { title: 'Temperature (Air)',    value: currentData.dht_temp,  unit: '°C',  dataKey: 'dht_temp',  color: 'emerald', icon: Thermometer },
    { title: 'Temperature (Liquid)', value: currentData.temp,      unit: '°C',  dataKey: 'temp',      color: 'emerald', icon: Thermometer },
    { title: 'Humidity (DHT11)',     value: currentData.humidity,  unit: '%',   dataKey: 'humidity',  color: 'emerald', icon: Gauge },
    { title: 'Fermentation pH',      value: currentData.ph,        unit: 'pH',  dataKey: 'ph',        color: 'emerald', icon: FlaskConical },
  ];

  return (
    <div className="flex flex-col flex-1">
      <header className="flex items-center justify-between px-8 py-4 bg-[#f0e8cc] border-b border-[#d4c897]">
        <div className="flex items-center gap-4">
          {selectedDevice && (
            <span className="text-sm font-semibold text-[#2d4010]/70">
              {selectedDevice.name}
            </span>
          )}
          <span className="text-2xl font-mono font-black text-[#1a2208] tracking-widest">
            {currentTime}
          </span>
        </div>
        <ControlPanel />
      </header>

      <div className="flex-1 bg-[#4a5b1c] p-6 overflow-y-auto relative">
        {!selectedDevice && (
          <div className="flex flex-col items-center justify-center h-full text-white/60">
            <p className="text-lg font-semibold">Device not found</p>
            <p className="text-sm mt-1">It may not have been discovered yet. Check pairing topic or provisioning.</p>
          </div>
        )}

        {selectedDevice && (
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
        )}
      </div>

      {!isConnected && (
        <div className="fixed bottom-6 right-6 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold animate-bounce z-50">
          Connection Lost — Reconnecting…
        </div>
      )}
    </div>
  );
}
