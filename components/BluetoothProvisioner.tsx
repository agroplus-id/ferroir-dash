'use client';

/**
 * components/BluetoothProvisioner.tsx
 *
 * Self-contained form + progress UI for the BLE WiFi provisioning flow.
 * All logic lives in useBluetoothProvisioning; this component is view-only.
 */

import { useState } from 'react';
import { CheckCircle, Loader2, AlertCircle, Wifi, Eye, EyeOff, WifiOff, RefreshCw } from 'lucide-react';
import { useBluetoothProvisioning, ProvisioningStatus } from '@/hooks/use-bluetooth-provisioning';

// ─── Step config ──────────────────────────────────────────────────────────────

interface Step {
  key: ProvisioningStatus;
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { key: 'scanning',       label: 'Scanning',         description: 'Looking for Ferroir device via Bluetooth…' },
  { key: 'connected',      label: 'Connected',        description: 'Device found. Establishing secure link…' },
  { key: 'sending',        label: 'Sending',          description: 'Writing WiFi credentials to device…' },
  { key: 'waiting',        label: 'Waiting',          description: 'Device is connecting to WiFi…' },
  { key: 'wifi_connected', label: 'Done',             description: 'WiFi connected! Device will appear on the dashboard shortly.' },
];

/** Statuses that are part of the active provisioning pipeline */
const RUNNING_KEYS = new Set<ProvisioningStatus>([
  'scanning',
  'connected',
  'sending',
  'waiting',
]);

const PROGRESS_KEYS = new Set<ProvisioningStatus>([
  'scanning',
  'connected',
  'sending',
  'waiting',
  'wifi_connected',
]);

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepRow({ step, status }: { step: Step; status: ProvisioningStatus }) {
  const stepKeys = STEPS.map((s) => s.key);
  const stepIdx = stepKeys.indexOf(step.key);
  const currentIdx = PROGRESS_KEYS.has(status)
    ? stepKeys.indexOf(status)
    : -1;

  const isDone = status === 'wifi_connected' || currentIdx > stepIdx;
  const isActive = status === step.key;
  const isPending = !isDone && !isActive;

  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">
        {isDone ? (
          <CheckCircle className="w-5 h-5 text-[#6b8f3a]" />
        ) : isActive ? (
          <Loader2 className="w-5 h-5 text-[#6b8f3a] animate-spin" />
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-[#d4c897]" />
        )}
      </div>
      <div>
        <p
          className={`text-sm font-semibold ${
            isPending ? 'text-[#2d4010]/40' : 'text-[#2d4010]'
          }`}
        >
          {step.label}
        </p>
        {(isActive || isDone) && (
          <p className="text-xs text-[#2d4010]/70 mt-0.5">{step.description}</p>
        )}
      </div>
    </li>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BluetoothProvisioner() {
  const {
    status,
    error,
    isSupported,
    deviceName,
    provision,
    retry,
    reset,
  } = useBluetoothProvisioning();

  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const isRunning = RUNNING_KEYS.has(status);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ssid.trim() || isRunning) return;
    await provision(ssid.trim(), password);
  }

  async function handleRetry() {
    if (!ssid.trim()) return;
    await retry(ssid.trim(), password);
  }

  // ── Still checking browser support (SSR / first render) ──
  if (isSupported === null) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-[#6b8f3a] animate-spin" />
      </div>
    );
  }

  // ── Browser not supported ──
  if (!isSupported) {
    return (
      <div className="flex flex-col items-center gap-4 text-center py-8 px-4">
        <AlertCircle className="w-12 h-12 text-red-500 shrink-0" />
        <div>
          <p className="font-semibold text-[#2d4010]">Browser not supported</p>
          <p className="text-sm text-[#2d4010]/70 mt-1">
            Web Bluetooth is not available in this browser.
            <br />
            Use Chrome or Edge on desktop / Android.
          </p>
        </div>
      </div>
    );
  }

  // ── WiFi Connected (success) ──
  if (status === 'wifi_connected') {
    return (
      <div className="flex flex-col items-center gap-6 text-center py-8 px-4">
        <CheckCircle className="w-16 h-16 text-[#6b8f3a]" />
        <div>
          <p className="text-lg font-bold text-[#2d4010]">Provisioning Complete</p>
          {deviceName && (
            <p className="text-sm text-[#2d4010]/70 mt-1">
              <strong>{deviceName}</strong> is now connected to{' '}
              <strong>{ssid}</strong>.
            </p>
          )}
          {!deviceName && (
            <p className="text-sm text-[#2d4010]/70 mt-1">
              The device is now connected to <strong>{ssid}</strong>.
            </p>
          )}
          <p className="text-xs text-[#2d4010]/50 mt-2">
            It will appear on the dashboard within a few seconds.
          </p>
        </div>
        <button
          onClick={() => {
            reset();
            setSsid('');
            setPassword('');
          }}
          className="px-5 py-2 rounded-lg bg-[#4a5b1c] text-[#f0e8cc] text-sm font-medium hover:bg-[#5d7c30] transition-colors"
        >
          Provision Another Device
        </button>
      </div>
    );
  }

  // ── WiFi Failed (can retry with BLE still connected) ──
  if (status === 'wifi_failed') {
    return (
      <div className="flex flex-col gap-6 py-4 px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <WifiOff className="w-12 h-12 text-amber-600" />
          <div>
            <p className="text-lg font-bold text-[#2d4010]">WiFi Connection Failed</p>
            {deviceName && (
              <p className="text-xs text-[#2d4010]/60 mt-1">
                Still connected to <strong>{deviceName}</strong> via Bluetooth.
              </p>
            )}
            <p className="text-sm text-[#2d4010]/70 mt-2">
              The device could not connect to <strong>{ssid}</strong>. Check
              your credentials and try again.
            </p>
          </div>
        </div>

        {/* Allow editing credentials for retry */}
        <fieldset className="flex flex-col gap-4">
          <legend className="sr-only">WiFi credentials (retry)</legend>

          <div className="flex flex-col gap-1">
            <label htmlFor="ssid" className="text-sm font-medium text-[#2d4010]">
              WiFi Network (SSID)
            </label>
            <input
              id="ssid"
              type="text"
              value={ssid}
              onChange={(e) => setSsid(e.target.value)}
              placeholder="Your network name"
              required
              className="w-full px-3 py-2 rounded-lg border border-[#d4c897] bg-white text-[#2d4010] placeholder-[#2d4010]/40 focus:outline-none focus:ring-2 focus:ring-[#6b8f3a] text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium text-[#2d4010]">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank for open networks"
                className="w-full px-3 py-2 pr-10 rounded-lg border border-[#d4c897] bg-white text-[#2d4010] placeholder-[#2d4010]/40 focus:outline-none focus:ring-2 focus:ring-[#6b8f3a] text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#2d4010]/50 hover:text-[#2d4010]"
                tabIndex={-1}
              >
                {showPass ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </fieldset>

        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            disabled={!ssid.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#4a5b1c] text-[#f0e8cc] font-semibold text-sm hover:bg-[#5d7c30] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
          <button
            onClick={() => {
              reset();
              setSsid('');
              setPassword('');
            }}
            className="px-4 py-2.5 rounded-xl border-2 border-[#2d4010]/20 text-[#2d4010]/70 text-sm font-medium hover:border-[#2d4010]/40 transition-colors"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  // ── Active flow, idle, or error ──
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Credentials form */}
      <fieldset disabled={isRunning} className="flex flex-col gap-4">
        <legend className="sr-only">WiFi credentials</legend>

        <div className="flex flex-col gap-1">
          <label htmlFor="ssid" className="text-sm font-medium text-[#2d4010]">
            WiFi Network (SSID)
          </label>
          <input
            id="ssid"
            type="text"
            value={ssid}
            onChange={(e) => setSsid(e.target.value)}
            placeholder="Your network name"
            required
            className="w-full px-3 py-2 rounded-lg border border-[#d4c897] bg-white text-[#2d4010] placeholder-[#2d4010]/40 focus:outline-none focus:ring-2 focus:ring-[#6b8f3a] disabled:opacity-50 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-[#2d4010]">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank for open networks"
              className="w-full px-3 py-2 pr-10 rounded-lg border border-[#d4c897] bg-white text-[#2d4010] placeholder-[#2d4010]/40 focus:outline-none focus:ring-2 focus:ring-[#6b8f3a] disabled:opacity-50 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#2d4010]/50 hover:text-[#2d4010]"
              tabIndex={-1}
            >
              {showPass ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </fieldset>

      {/* Progress steps (shown while running) */}
      {isRunning && (
        <ul className="flex flex-col gap-3 border border-[#d4c897] rounded-xl p-4 bg-[#f0e8cc]/60">
          {STEPS.filter((s) => s.key !== 'wifi_connected').map((step) => (
            <StepRow key={step.key} step={step} status={status} />
          ))}
        </ul>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="flex items-start gap-3 border border-red-300 bg-red-50 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700">
              Provisioning failed
            </p>
            <p className="text-xs text-red-600 mt-0.5 wrap-break-word">
              {error}
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-red-600 underline hover:no-underline shrink-0"
          >
            Try again
          </button>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isRunning || !ssid.trim()}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#4a5b1c] text-[#f0e8cc] font-semibold text-sm hover:bg-[#5d7c30] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Wifi className="w-4 h-4" />
        {isRunning ? 'Provisioning…' : 'Connect Device to WiFi'}
      </button>
    </form>
  );
}
