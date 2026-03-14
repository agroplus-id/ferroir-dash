'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  deviceId: string;
  deviceName: string;
  open: boolean;
  onClose: () => void;
  onConfirm: (forget: boolean) => void;
}

export default function ProvisionModal({ deviceId, deviceName, open, onClose, onConfirm }: Props) {
  const [forget, setForget] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="bg-white rounded shadow-lg max-w-md w-full p-4 z-10">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold">Re-Provision device</h3>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-800">
            <X />
          </button>
        </div>
        <p className="text-xs text-gray-700 mb-3">This will ask the device to drop WiFi and restart BLE advertising so it can be re-provisioned via the mobile app or BLE tool.</p>
        <p className="text-xs text-gray-600 mb-3"><strong>Device:</strong> {deviceName} <span className="text-[10px] text-gray-400 ml-2">{deviceId}</span></p>
        <label className="flex items-center gap-2 text-sm mb-4">
          <input type="checkbox" checked={forget} onChange={(e) => setForget(e.target.checked)} />
          <span className="text-xs">Also forget saved WiFi credentials (factory WiFi reset)</span>
        </label>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 rounded bg-gray-100 text-sm">Cancel</button>
          <button
            onClick={() => {
              onConfirm(forget);
              onClose();
            }}
            className="px-3 py-1 rounded bg-[#6b8f3a] text-white text-sm"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
