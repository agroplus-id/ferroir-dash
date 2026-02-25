'use client';

import { MqttProvider } from '../lib/mqtt-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MqttProvider>
      {children}
    </MqttProvider>
  );
}
