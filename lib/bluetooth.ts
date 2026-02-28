/**
 * lib/bluetooth.ts
 *
 * Pure BLE utility — no React, no side effects.
 * All UUIDs match the Ferroir firmware GATT service (see FERROIR_INTEGRATION_GUIDE §7).
 */

// ─── GATT UUIDs ───────────────────────────────────────────────────────────────

export const BLE_SERVICE_UUID    = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
export const BLE_SSID_CHAR_UUID  = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
export const BLE_PASS_CHAR_UUID  = 'beb5483e-36e1-4688-b7f5-ea07361b26a9';
export const BLE_STATUS_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26aa';

/** Timeout (ms) waiting for device to report CONNECTED or FAILED. */
const STATUS_TIMEOUT_MS = 30_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProvisioningStage =
  | 'scanning'
  | 'connected'
  | 'sending'
  | 'waiting'         // waiting for WiFi status from device
  | 'wifi_connected'  // device reported CONNECTED
  | 'wifi_failed';    // device reported FAILED

export type OnStageChange = (stage: ProvisioningStage) => void;

export interface ProvisionResult {
  /** BLE device name, e.g. "Ferroir-A1B2" */
  deviceName: string | null;
}

// ─── Internal: write credentials ──────────────────────────────────────────────

async function writeCredentials(
  service: BluetoothRemoteGATTService,
  ssid: string,
  password: string,
): Promise<void> {
  const [ssidChar, passChar] = await Promise.all([
    service.getCharacteristic(BLE_SSID_CHAR_UUID),
    service.getCharacteristic(BLE_PASS_CHAR_UUID),
  ]);

  const encoder = new TextEncoder();
  await ssidChar.writeValue(encoder.encode(ssid));
  // Writing password triggers the WiFi connection attempt on the device
  await passChar.writeValue(encoder.encode(password));
}

// ─── Internal: wait for WiFi status notification ──────────────────────────────

function waitForStatus(
  service: BluetoothRemoteGATTService,
  onStageChange: OnStageChange,
): Promise<'wifi_connected' | 'wifi_failed'> {
  return new Promise(async (resolve, reject) => {
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('Timed out waiting for WiFi status from device.'));
      }
    }, STATUS_TIMEOUT_MS);

    try {
      const statusChar = await service.getCharacteristic(BLE_STATUS_CHAR_UUID);

      statusChar.addEventListener(
        'characteristicvaluechanged',
        (event: Event) => {
          if (settled) return;
          const target = event.target as BluetoothRemoteGATTCharacteristic;
          const value = new TextDecoder().decode(target.value!).trim().toUpperCase();

          if (value === 'CONNECTING') {
            onStageChange('waiting');
          } else if (value === 'CONNECTED') {
            settled = true;
            clearTimeout(timeout);
            resolve('wifi_connected');
          } else if (value === 'FAILED') {
            settled = true;
            clearTimeout(timeout);
            resolve('wifi_failed');
          }
        },
      );

      await statusChar.startNotifications();
      onStageChange('waiting');
    } catch (err) {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(err);
      }
    }
  });
}

// ─── Core: provision device ───────────────────────────────────────────────────

/**
 * Full provisioning flow:
 * 1. Scan for Ferroir-XXXX devices (namePrefix filter)
 * 2. Connect to GATT server
 * 3. Write WiFi SSID & password
 * 4. Subscribe to status characteristic for CONNECTED / FAILED
 * 5. Resolve with the final stage
 *
 * The caller is responsible for disconnecting via `disconnect()` when ready
 * (or on retry failure). The GATT server is kept alive so retries don't
 * require the user to go through the browser device picker again.
 */
export async function provisionDevice(
  ssid: string,
  password: string,
  onStageChange: OnStageChange,
): Promise<{
  result: ProvisionResult;
  stage: 'wifi_connected' | 'wifi_failed';
  /** Call this to close the BLE connection. */
  disconnect: () => void;
  /** Retry with new credentials without re-scanning. */
  retry: (newSsid: string, newPassword: string) => Promise<'wifi_connected' | 'wifi_failed'>;
}> {
  onStageChange('scanning');

  const device = await navigator.bluetooth.requestDevice({
    filters: [{ namePrefix: 'Ferroir-' }],
    optionalServices: [BLE_SERVICE_UUID],
  });

  const server = await device.gatt!.connect();
  onStageChange('connected');

  const service = await server.getPrimaryService(BLE_SERVICE_UUID);

  onStageChange('sending');
  await writeCredentials(service, ssid, password);

  const stage = await waitForStatus(service, onStageChange);
  onStageChange(stage);

  const deviceName = device.name ?? null;

  const disconnect = () => {
    try {
      server.disconnect();
    } catch {
      // Already disconnected
    }
  };

  const retry = async (
    newSsid: string,
    newPassword: string,
  ): Promise<'wifi_connected' | 'wifi_failed'> => {
    onStageChange('sending');
    await writeCredentials(service, newSsid, newPassword);
    const retryStage = await waitForStatus(service, onStageChange);
    onStageChange(retryStage);
    return retryStage;
  };

  return { result: { deviceName }, stage, disconnect, retry };
}
