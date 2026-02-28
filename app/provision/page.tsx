import BluetoothProvisioner from '@/components/BluetoothProvisioner';

export const metadata = {
  title: 'WiFi Provisioning — FERROIR',
};

export default function ProvisionPage() {
  return (
    <div className="flex-1 flex flex-col bg-[#4a5b1c] min-h-screen overflow-y-auto">

      {/* Header bar */}
      <header className="bg-[#f0e8cc] px-8 py-5 shrink-0 border-b border-[#d4c897]">
        <h1 className="text-xl font-bold text-[#2d4010]">WiFi Provisioning</h1>
        <p className="text-sm text-[#2d4010]/60 mt-0.5">
          Connect a FERROIR device to your local network via Bluetooth.
        </p>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-md bg-[#f0e8cc] rounded-2xl border border-[#d4c897] shadow-lg overflow-hidden">

          {/* Card header */}
          <div className="px-6 pt-6 pb-4 border-b border-[#d4c897]">
            <h2 className="text-base font-semibold text-[#2d4010]">Device Setup</h2>
            <p className="text-xs text-[#2d4010]/60 mt-1">
              Make sure Bluetooth is enabled and the device is in provisioning mode.
            </p>
          </div>

          {/* Card body */}
          <div className="px-6 py-6">
            <BluetoothProvisioner />
          </div>
        </div>
      </div>
    </div>
  );
}
