/**
 * lib/device-registry.ts
 *
 * Manages the device list with localStorage persistence.
 * Primary source of truth is retained MQTT pairing messages;
 * localStorage ensures the list survives page reloads even when
 * the broker is temporarily unreachable.
 */

import { Device, PairingPayload } from './types';

const STORAGE_KEY = 'ferroir-devices';

// ─── Persistence ──────────────────────────────────────────────────────────────

export function loadDevices(): Device[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Device[]) : [];
  } catch {
    return [];
  }
}

export function saveDevices(devices: Device[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

// ─── State helpers ────────────────────────────────────────────────────────────

/**
 * Insert or update a device based on a pairing message.
 *  - `pair`   → mark online, update lastSeen
 *  - `unpair` → mark offline
 * Returns a new array (immutable).
 */
export function upsertDevice(
  devices: Device[],
  pairing: PairingPayload,
): Device[] {
  const now = Date.now();
  const existing = devices.find((d) => d.id === pairing.device);

  if (existing) {
    return devices.map((d) =>
      d.id === pairing.device
        ? {
            ...d,
            name: pairing.name || d.name,
            online: pairing.action === 'pair',
            lastSeen: pairing.action === 'pair' ? now : d.lastSeen,
          }
        : d,
    );
  }

  // New device — add it
  return [
    ...devices,
    {
      id: pairing.device,
      name: pairing.name || `Ferroir-${pairing.device.slice(0, 4)}`,
      online: pairing.action === 'pair',
      lastSeen: now,
    },
  ];
}

/**
 * Mark a device as "seen" (updates lastSeen to now).
 * Used when sensor data arrives to keep track of activity.
 */
export function touchDevice(devices: Device[], deviceId: string): Device[] {
  const now = Date.now();
  let changed = false;

  const updated = devices.map((d) => {
    if (d.id === deviceId) {
      changed = true;
      return { ...d, online: true, lastSeen: now };
    }
    return d;
  });

  // If we received sensor data for a device we don't know about yet,
  // add it with a generated name.
  if (!changed) {
    return [
      ...devices,
      {
        id: deviceId,
        name: `Ferroir-${deviceId.slice(0, 4)}`,
        online: true,
        lastSeen: now,
      },
    ];
  }

  return updated;
}
