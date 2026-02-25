'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import mqtt, { MqttClient } from 'mqtt';
import { SensorData, ControlState } from './types';

// Default broker for demo if env is missing
const DEFAULT_BROKER_URL = 'ws://broker.hivemq.com:8000/mqtt';
const TOPIC_TELEMETRY = 'ferroir/device/+/telemetry';
const TOPIC_STATUS    = 'ferroir/device/+/status';

interface MqttContextType {
  client: MqttClient | null;
  isConnected: boolean;
  connectionError: string | null;
  telemetry: Record<string, SensorData>; // Keyed by deviceId
  history: Record<string, SensorData[]>; // Keyed by deviceId, array of history
  controls: Record<string, ControlState>;
  sendControl: (deviceId: string, type: 'aerator' | 'light', state: boolean) => void;
  selectedDevice: string;
  setSelectedDevice: (id: string) => void;
}

const MqttContext = createContext<MqttContextType | undefined>(undefined);

export const MqttProvider = ({ children }: { children: ReactNode }) => {
  const [client, setClient] = useState<MqttClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<Record<string, SensorData>>({});
  const [history, setHistory] = useState<Record<string, SensorData[]>>({});
  const [controls, setControls] = useState<Record<string, ControlState>>({});
  const [selectedDevice, setSelectedDevice] = useState<string>('device1');

  useEffect(() => {
    const brokerUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_URL || DEFAULT_BROKER_URL;
    console.log(`Connecting to MQTT broker at ${brokerUrl}`);
    
    const mqttClient = mqtt.connect(brokerUrl, {
      clientId: `ferroir-dash-${Math.random().toString(16).substr(2, 8)}`,
    });

    mqttClient.on('connect', () => {
      console.log('MQTT Connected');
      setIsConnected(true);
      setConnectionError(null);
      mqttClient.subscribe([TOPIC_TELEMETRY, TOPIC_STATUS], (err) => {
        if (err) console.error('Subscription error:', err);
      });
    });

    mqttClient.on('reconnect', () => {
      setIsConnected(false);
    });

    mqttClient.on('message', (topic, message) => {
      try {
        // Topic format: ferroir/device/{deviceId}/{type}
        const parts = topic.split('/');
        const deviceId = parts[2];
        const msgType  = parts[3];

        const payload = JSON.parse(message.toString());

        if (msgType === 'telemetry') {
          const newData: SensorData = {
            ...payload,
            timestamp: payload.timestamp || Date.now(),
          };
          setTelemetry((prev) => ({ ...prev, [deviceId]: newData }));
          setHistory((prev) => {
            const deviceHistory = prev[deviceId] || [];
            const newHistory = [...deviceHistory, newData].slice(-50);
            return { ...prev, [deviceId]: newHistory };
          });

        } else if (msgType === 'status') {
          // Device confirms actual relay state — overrides optimistic update
          const newState: Partial<ControlState> = {};
          if (payload.aerator !== undefined)
            newState.aerator = payload.aerator === 'ON' || payload.aerator === true;
          if (payload.light !== undefined)
            newState.light = payload.light === 'ON' || payload.light === true;
          setControls((prev) => ({
            ...prev,
            [deviceId]: { ...prev[deviceId], ...newState },
          }));
        }

      } catch (error) {
        console.error('Error parsing MQTT message:', error);
      }
    });

    mqttClient.on('error', (err) => {
      console.error('MQTT connection error:', err);
      setConnectionError(err.message);
      setIsConnected(false);
    });

    mqttClient.on('offline', () => {
      setIsConnected(false);
    });

    setClient(mqttClient);

    return () => {
      mqttClient.end();
    };
  }, []);

  const sendControl = (deviceId: string, type: 'aerator' | 'light', state: boolean) => {
    if (client && isConnected) {
      const topic = `ferroir/device/${deviceId}/control`;
      const payload = JSON.stringify({ [type]: state ? 'ON' : 'OFF' });
      client.publish(topic, payload);
      
      // Optimistic update
      setControls(prev => ({
        ...prev,
        [deviceId]: {
          ...prev[deviceId],
          [type]: state
        }
      }));
    }
  };

  return (
    <MqttContext.Provider value={{ 
      client, 
      isConnected,
      connectionError,
      telemetry, 
      history, 
      controls, 
      sendControl,
      selectedDevice,
      setSelectedDevice 
    }}>
      {children}
    </MqttContext.Provider>
  );
};

export const useMqtt = () => {
  const context = useContext(MqttContext);
  if (context === undefined) {
    throw new Error('useMqtt must be used within a MqttProvider');
  }
  return context;
};
