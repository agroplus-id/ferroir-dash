'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  useRef,
  ReactNode,
} from 'react';
import mqtt, { MqttClient } from 'mqtt';
import { SensorData, ControlState, Device, PairingPayload } from './types';
import {
  loadDevices,
  saveDevices,
  upsertDevice,
  touchDevice,
} from './device-registry';

// ─── Defaults (match FERROIR_INTEGRATION_GUIDE §2) ───────────────────────────
// HiveMQ Cloud exposes port 8884 for WSS (browser WebSocket-over-TLS).
const DEFAULT_BROKER_URL =
  'wss://64226d61d40b4f32be4ab902bbea42d2.s1.eu.hivemq.cloud:8884/mqtt';
const DEFAULT_USERNAME = 'agroplus';
const DEFAULT_PASSWORD = 'AgroplusJaya123.';

const MAX_HISTORY = 50;

// ─── Context shape ────────────────────────────────────────────────────────────

interface MqttContextType {
  client: MqttClient | null;
  isConnected: boolean;
  connectionError: string | null;
  /** All known devices (persisted in localStorage, updated via MQTT pairing). */
  devices: Device[];
  /** Currently viewed device ID (null if none selected). */
  selectedDeviceId: string | null;
  selectDevice: (id: string) => void;
  /** Remove a device from the local registry (does not affect the MQTT broker). */
  removeDevice: (id: string) => void;
  telemetry: Record<string, SensorData>;
  history: Record<string, SensorData[]>;
  controls: Record<string, ControlState>;
  sendControl: (
    deviceId: string,
    type: 'aerator' | 'led',
    state: boolean,
  ) => void;
}

const MqttContext = createContext<MqttContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const MqttProvider = ({ children }: { children: ReactNode }) => {
  const [client, setClient] = useState<MqttClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Device registry — start empty to avoid hydration mismatch,
  // then hydrate from localStorage after mount.
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  // Sensor state
  const [telemetry, setTelemetry] = useState<Record<string, SensorData>>({});
  const [history, setHistory] = useState<Record<string, SensorData[]>>({});
  const [controls, setControls] = useState<Record<string, ControlState>>({});

  // Hydrate device list from localStorage once after mount
  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      const saved = loadDevices();
      if (saved.length > 0) setDevices(saved);
    }
  }, []);

  // Persist devices whenever they change (skip the initial empty state)
  const devicesRef = useRef(devices);
  devicesRef.current = devices;
  useEffect(() => {
    if (hydratedRef.current && devices.length > 0) {
      saveDevices(devices);
    }
  }, [devices]);

  // Auto-select first online device when list changes and nothing is selected
  useEffect(() => {
    if (selectedDeviceId) return;
    const firstOnline = devices.find((d) => d.online);
    if (firstOnline) setSelectedDeviceId(firstOnline.id);
    else if (devices.length > 0) setSelectedDeviceId(devices[0].id);
  }, [devices, selectedDeviceId]);

  // ── MQTT lifecycle ──────────────────────────────────────────────────────────

  useEffect(() => {
    const brokerUrl =
      process.env.NEXT_PUBLIC_MQTT_BROKER_URL || DEFAULT_BROKER_URL;
    const username =
      process.env.NEXT_PUBLIC_MQTT_USERNAME || DEFAULT_USERNAME;
    const password =
      process.env.NEXT_PUBLIC_MQTT_PASSWORD || DEFAULT_PASSWORD;

    console.log(`[MQTT] Connecting to ${brokerUrl}`);

    const mqttClient = mqtt.connect(brokerUrl, {
      clientId: `ferroir-dash-${Math.random().toString(16).substr(2, 8)}`,
      username,
      password,
      // HiveMQ Cloud requires TLS — handled by wss:// URL
      rejectUnauthorized: false,
    });

    // ── Connected ──

    mqttClient.on('connect', () => {
      console.log('[MQTT] Connected');
      setIsConnected(true);
      setConnectionError(null);

      // Wildcard subscriptions (§4 of Integration Guide)
      // Note: "client disconnecting" errors in these callbacks are expected
      // during React strict mode double-mount (dev only) and are harmless.
      mqttClient.subscribe('ferroir/+/pairing', { qos: 1 }, (err) => {
        if (err && !err.message?.includes('disconnecting'))
          console.error('[MQTT] pairing sub error:', err);
      });
      mqttClient.subscribe('ferroir/+/sensors', { qos: 0 }, (err) => {
        if (err && !err.message?.includes('disconnecting'))
          console.error('[MQTT] sensors sub error:', err);
      });
      mqttClient.subscribe('ferroir/+/relay/state', { qos: 0 }, (err) => {
        if (err && !err.message?.includes('disconnecting'))
          console.error('[MQTT] relay/state sub error:', err);
      });
    });

    mqttClient.on('reconnect', () => setIsConnected(false));

    // ── Message router ──

    mqttClient.on('message', (topic: string, message: Buffer) => {
      try {
        const parts = topic.split('/');
        // All topics: ferroir/{deviceId}/{subtopic...}
        if (parts[0] !== 'ferroir' || parts.length < 3) return;

        const deviceId = parts[1];
        const subtopic = parts.slice(2).join('/');
        const payload = JSON.parse(message.toString());

        console.log(`[MQTT] ${subtopic} from ${deviceId}`, payload);

        switch (subtopic) {
          // ── Pairing / Presence ──
          case 'pairing': {
            const pairing = payload as PairingPayload;
            setDevices((prev) => upsertDevice(prev, pairing));
            break;
          }

          // ── Sensor data ──
          case 'sensors': {
            const newData: SensorData = {
              mq3: payload.mq3 ?? 0,
              mq5: payload.mq5 ?? 0,
              mq8: payload.mq8 ?? 0,
              temp: payload.temp ?? 0,
              humidity: payload.humidity ?? 0,
              dht_temp: payload.dht_temp ?? 0,
              tds: payload.tds ?? 0,
              ph: payload.ph ?? 0,
              aerator: payload.aerator === true,
              led: payload.led === true,
              ts: payload.ts ?? 0,
              wallClock: Date.now(), // dashboard wall-clock time
            };

            setTelemetry((prev) => ({ ...prev, [deviceId]: newData }));

            setHistory((prev) => {
              const prev_history = prev[deviceId] || [];
              return {
                ...prev,
                [deviceId]: [...prev_history, newData].slice(-MAX_HISTORY),
              };
            });

            // Sync relay state from sensor payload passively
            setControls((prev) => ({
              ...prev,
              [deviceId]: { aerator: newData.aerator, led: newData.led },
            }));

            // Touch device so it stays "online" in the registry
            setDevices((prev) => touchDevice(prev, deviceId));
            break;
          }

          // ── Relay confirmation ──
          case 'relay/state': {
            setControls((prev) => ({
              ...prev,
              [deviceId]: {
                aerator:
                  typeof payload.aerator === 'boolean'
                    ? payload.aerator
                    : prev[deviceId]?.aerator ?? false,
                led:
                  typeof payload.led === 'boolean'
                    ? payload.led
                    : prev[deviceId]?.led ?? false,
              },
            }));
            break;
          }

          default:
            break;
        }
      } catch (error) {
        console.error('[MQTT] Error parsing message:', error);
      }
    });

    mqttClient.on('error', (err) => {
      console.error('[MQTT] Error:', err);
      setConnectionError(err.message);
      setIsConnected(false);
    });

    mqttClient.on('offline', () => setIsConnected(false));

    setClient(mqttClient);

    return () => {
      mqttClient.end();
    };
  }, []);

  // ── Relay command (§3.2 — correct topic + boolean payload) ────────────────

  const sendControl = useCallback(
    (deviceId: string, type: 'aerator' | 'led', state: boolean) => {
      if (client && isConnected) {
        const topic = `ferroir/${deviceId}/relay/cmd`;
        const payload = JSON.stringify({ [type]: state });
        client.publish(topic, payload, { qos: 0 });

        // Optimistic update
        setControls((prev) => ({
          ...prev,
          [deviceId]: {
            ...prev[deviceId],
            [type]: state,
          },
        }));
      }
    },
    [client, isConnected],
  );

  const selectDevice = useCallback((id: string) => {
    setSelectedDeviceId(id);
  }, []);

  const removeDevice = useCallback((id: string) => {
    setDevices((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      saveDevices(updated);
      return updated;
    });
    // Clear associated data
    setTelemetry((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
    setHistory((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
    setControls((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
    // If this was the selected device, clear selection
    setSelectedDeviceId((prev) => (prev === id ? null : prev));
  }, []);

  return (
    <MqttContext.Provider
      value={{
        client,
        isConnected,
        connectionError,
        devices,
        selectedDeviceId,
        selectDevice,
        removeDevice,
        telemetry,
        history,
        controls,
        sendControl,
      }}
    >
      {children}
    </MqttContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useMqtt = () => {
  const context = useContext(MqttContext);
  if (context === undefined) {
    throw new Error('useMqtt must be used within a MqttProvider');
  }
  return context;
};
