'use client';

import React from 'react';
import { useMqtt } from '../lib/mqtt-context';
import clsx from 'clsx';

interface ControlButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function ControlButton({ label, active, onClick }: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 px-4 py-1.5 rounded-full font-semibold text-sm transition-all active:scale-95 border-2',
        active
          ? 'bg-[#6b8f3a] border-[#6b8f3a] text-white hover:bg-[#5d7c30]'
          : 'bg-transparent border-[#2d4010]/30 text-[#2d4010]/60 hover:border-[#2d4010]/60'
      )}
    >
      <span>{label}</span>
      <span
        className={clsx(
          'text-xs font-bold px-2 py-0.5 rounded-full',
          active ? 'bg-white/20 text-white' : 'text-[#2d4010]/50'
        )}
      >
        {active ? 'On' : 'Off'}
      </span>
    </button>
  );
}

export function ControlPanel() {
  const { controls, sendControl, selectedDevice } = useMqtt();

  const currentState = controls[selectedDevice] || { aerator: false, light: false };

  const toggle = (key: 'aerator' | 'light') => {
    sendControl(selectedDevice, key, !currentState[key]);
  };

  return (
    <div className="flex gap-3">
      <ControlButton
        label="Lights"
        active={currentState.light}
        onClick={() => toggle('light')}
      />
      <ControlButton
        label="Aerator"
        active={currentState.aerator}
        onClick={() => toggle('aerator')}
      />
    </div>
  );
}
