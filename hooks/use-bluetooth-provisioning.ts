'use client';

/**
 * hooks/use-bluetooth-provisioning.ts
 *
 * State-machine hook for driving the BLE provisioning flow.
 * Keeps all async orchestration outside UI components.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { provisionDevice } from '@/lib/bluetooth';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProvisioningStatus =
  | 'idle'
  | 'scanning'
  | 'connected'
  | 'sending'
  | 'waiting'          // device is attempting WiFi connection
  | 'wifi_connected'   // success
  | 'wifi_failed'      // device reported FAILED — can retry
  | 'error';           // unexpected error (BLE failure, timeout, etc.)

export interface UseBluetoothProvisioningReturn {
  /** Current state machine status */
  status: ProvisioningStatus;
  /** Non-null only when status === 'error' or 'wifi_failed' */
  error: string | null;
  /** False when the browser does not support Web Bluetooth (e.g. Firefox). null while SSR / not yet checked. */
  isSupported: boolean | null;
  /** Name of the connected BLE device, e.g. "Ferroir-A1B2" */
  deviceName: string | null;
  /** Kick off the provisioning flow */
  provision: (ssid: string, password: string) => Promise<void>;
  /** Retry with (optionally new) credentials — reuses the open BLE connection */
  retry: (ssid: string, password: string) => Promise<void>;
  /** Return to 'idle' so the user can start over (disconnects BLE) */
  reset: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBluetoothProvisioning(): UseBluetoothProvisioningReturn {
  const [status, setStatus] = useState<ProvisioningStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);

  // Keep handles to disconnect / retry without re-scanning
  const disconnectRef = useRef<(() => void) | null>(null);
  const retryRef = useRef<
    ((ssid: string, password: string) => Promise<'wifi_connected' | 'wifi_failed'>) | null
  >(null);

  // Defer the check to after mount so SSR and first client render match (both null).
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  useEffect(() => {
    setIsSupported(
      typeof navigator !== 'undefined' && 'bluetooth' in navigator,
    );
  }, []);

  const provision = useCallback(async (ssid: string, password: string) => {
    setError(null);
    setDeviceName(null);

    try {
      const { result, stage, disconnect, retry: retryFn } =
        await provisionDevice(ssid, password, (s) => setStatus(s));

      disconnectRef.current = disconnect;
      retryRef.current = retryFn;
      setDeviceName(result.deviceName);

      if (stage === 'wifi_connected') {
        setStatus('wifi_connected');
        // Auto-disconnect — device is on WiFi now
        disconnect();
        disconnectRef.current = null;
        retryRef.current = null;
      } else {
        // wifi_failed — keep BLE alive for retry
        setStatus('wifi_failed');
        setError('Device failed to connect to WiFi. Check credentials and try again.');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(message);
      setStatus('error');
    }
  }, []);

  const retry = useCallback(async (ssid: string, password: string) => {
    if (!retryRef.current) {
      setError('No active BLE connection. Please start over.');
      setStatus('error');
      return;
    }

    setError(null);

    try {
      const stage = await retryRef.current(ssid, password);

      if (stage === 'wifi_connected') {
        setStatus('wifi_connected');
        disconnectRef.current?.();
        disconnectRef.current = null;
        retryRef.current = null;
      } else {
        setStatus('wifi_failed');
        setError('Device failed to connect to WiFi. Check credentials and try again.');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(message);
      setStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    disconnectRef.current?.();
    disconnectRef.current = null;
    retryRef.current = null;
    setStatus('idle');
    setError(null);
    setDeviceName(null);
  }, []);

  return { status, error, isSupported, deviceName, provision, retry, reset };
}
