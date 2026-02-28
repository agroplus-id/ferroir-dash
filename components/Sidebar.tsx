'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMqtt } from '../lib/mqtt-context';
import { Circle, Wifi, Radio, X } from 'lucide-react';
import clsx from 'clsx';

export function Sidebar() {
  const { isConnected, connectionError, devices, selectedDeviceId, selectDevice, removeDevice } = useMqtt();
  const pathname = usePathname();

  // Sort: online first, then alphabetical
  const sortedDevices = [...devices].sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <aside className="w-56 min-h-screen bg-[#f0e8cc] flex flex-col justify-between">
      <div>
        <div className="px-6 pt-7 pb-6">
          <svg width="160" height="36" viewBox="0 0 246 55" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M35.01 0.00544409C35.4358 0.00551181 35.7809 0.350746 35.7808 0.776547L35.7794 9.95862C35.7793 10.3844 35.4341 10.7295 35.0083 10.7295L14.1632 10.7262C13.7374 10.7261 13.3921 11.0712 13.3921 11.497L13.3905 21.5401C13.3904 21.9659 13.7355 22.3112 14.1613 22.3112L29.3705 22.3137C29.7963 22.3137 30.1415 22.659 30.1414 23.0848L30.14 31.9537C30.1399 32.3795 29.7947 32.7246 29.3689 32.7246L14.1597 32.7222C13.7339 32.7221 13.3886 33.0672 13.3886 33.493L13.3853 54.1819C13.3852 54.6077 13.04 54.9528 12.6142 54.9527L0.770846 54.9509C0.345052 54.9508 -6.77083e-05 54.6056 9.96367e-09 54.1798L0.00849403 0.770856C0.00856175 0.345056 0.353791 -6.77094e-05 0.779586 9.96409e-09L35.01 0.00544409Z" fill="url(#paint0_linear_2588_898)"/>
            <path d="M45.3135 10.7325C44.8878 10.7324 44.5425 11.0776 44.5425 11.5034L44.5409 21.0768C44.5409 21.5026 44.886 21.8478 45.3118 21.8479L61.6952 21.8505C62.1209 21.8506 62.4661 22.1958 62.466 22.6216L62.4646 31.4123C62.4645 31.8381 62.1193 32.1832 61.6935 32.1832L45.3101 32.1806C44.8843 32.1805 44.5391 32.5256 44.539 32.9514L44.5374 43.4642C44.5373 43.89 44.8824 44.2352 45.3082 44.2353L64.0399 44.2383C64.4657 44.2383 64.8108 44.5836 64.8107 45.0094L64.8093 54.1914C64.8092 54.6172 64.464 54.9624 64.0382 54.9623L31.9212 54.9572C31.4954 54.9571 31.1503 54.6119 31.1504 54.1861L31.1589 0.777204C31.159 0.351403 31.5042 0.00627995 31.93 0.00634767L64.0469 0.0114556C64.4727 0.0115233 64.8178 0.356758 64.8178 0.782559L64.8163 9.96463C64.8162 10.3904 64.471 10.7356 64.0452 10.7355L45.3135 10.7325Z" fill="url(#paint1_linear_2588_898)"/>
            <path d="M90.16 54.9689C89.879 54.9689 89.6203 54.816 89.4848 54.5699L78.4992 34.6225C78.3636 34.3763 78.1049 34.2235 77.824 34.2234L75.8411 34.2231C75.4153 34.223 75.07 34.5682 75.07 34.994L75.0669 54.1955C75.0668 54.6213 74.7216 54.9665 74.2958 54.9664L62.4525 54.9645C62.0267 54.9645 61.6816 54.6192 61.6816 54.1934L61.6901 0.784528C61.6902 0.358728 62.0354 0.0136042 62.4612 0.0136719L84.1556 0.0171222C88.4869 0.017811 92.1658 0.775079 95.1922 2.28893C98.2709 3.80278 100.567 5.89055 102.08 8.55223C103.592 11.1617 104.349 14.0842 104.348 17.3197C104.348 20.9726 103.303 24.234 101.216 27.1039C99.3406 29.7472 96.6247 31.682 93.0677 32.9083C92.5958 33.071 92.3764 33.6233 92.6277 34.0547L104.137 53.812C104.436 54.326 104.065 54.9711 103.47 54.971L90.16 54.9689ZM75.0717 23.9804C75.0717 24.4062 75.4168 24.7514 75.8426 24.7515L83.3689 24.7527C85.8216 24.7531 87.6481 24.1533 88.8486 22.9532C90.1012 21.7531 90.7276 20.0572 90.728 17.8654C90.7283 15.7781 90.1024 14.1341 88.8501 12.9337C87.6501 11.7332 85.8237 11.1328 83.3711 11.1324L75.8447 11.1312C75.4189 11.1311 75.0737 11.4763 75.0736 11.9021L75.0717 23.9804Z" fill="url(#paint2_linear_2588_898)"/>
            <path d="M129.299 54.9767C129.018 54.9767 128.759 54.8238 128.623 54.5777L117.638 34.6303C117.502 34.3842 117.244 34.2313 116.963 34.2312L114.98 34.2309C114.554 34.2308 114.209 34.576 114.209 35.0018L114.206 54.2034C114.206 54.6292 113.86 54.9743 113.435 54.9742L101.591 54.9723C101.165 54.9723 100.82 54.627 100.82 54.2012L100.829 0.792341C100.829 0.36654 101.174 0.0214167 101.6 0.0214844L123.294 0.0249347C127.626 0.0256236 131.304 0.782892 134.331 2.29674C137.41 3.81059 139.705 5.89836 141.218 8.56004C142.731 11.1695 143.487 14.092 143.487 17.3275C143.486 20.9804 142.442 24.2418 140.354 27.1117C138.479 29.755 135.763 31.6898 132.206 32.9161C131.735 33.0788 131.515 33.6312 131.766 34.0625L143.275 53.8198C143.575 54.3338 143.204 54.979 142.609 54.9789L129.299 54.9767ZM114.21 23.9882C114.21 24.414 114.555 24.7593 114.981 24.7593L122.508 24.7605C124.96 24.7609 126.787 24.1611 127.987 22.961C129.24 21.761 129.866 20.065 129.867 17.8733C129.867 15.7859 129.241 14.1419 127.989 12.9415C126.789 11.741 124.962 11.1406 122.51 11.1402L114.983 11.139C114.558 11.139 114.212 11.4841 114.212 11.9099L114.21 23.9882Z" fill="url(#paint3_linear_2588_898)"/>
            <path d="M190.114 0.00161834C191.936 8.60575e-05 192.848 -0.000680106 193.413 0.564529C193.978 1.12974 193.978 2.04119 193.976 3.86409C193.956 27.2757 193.57 39.3585 185.967 46.9612C178.364 54.5639 166.282 54.9507 142.87 54.9704C141.048 54.972 140.136 54.9727 139.571 54.4075C139.006 53.8423 139.006 52.9308 139.008 51.1079C139.028 27.6963 139.414 15.6135 147.017 8.01082C154.62 0.408099 166.702 0.0212975 190.114 0.00161834ZM176.74 17.2761C174.817 15.3525 172.083 15.6105 166.615 16.1266C162.75 16.4913 160.164 17.3272 158.249 19.2427C156.333 21.1582 155.497 23.744 155.133 27.6086C154.617 33.0767 154.359 35.8108 156.282 37.7345C158.206 39.6581 160.94 39.4001 166.408 38.884C170.273 38.5193 172.858 37.6834 174.774 35.7679C176.689 33.8524 177.525 31.2666 177.89 27.402C178.406 21.9338 178.664 19.1998 176.74 17.2761Z" fill="url(#paint4_linear_2588_898)"/>
            <path d="M202.285 0.0419227C202.711 0.0419904 203.056 0.387225 203.056 0.813026L203.047 54.2219C203.047 54.6477 202.702 54.9928 202.276 54.9928L190.433 54.9909C190.007 54.9908 189.662 54.6456 189.662 54.2198L189.671 0.810896C189.671 0.385095 190.016 0.0399714 190.442 0.0400391L202.285 0.0419227Z" fill="url(#paint5_linear_2588_898)"/>
            <path d="M231.303 54.9977C231.022 54.9977 230.763 54.8448 230.627 54.5987L219.642 34.6513C219.506 34.4052 219.248 34.2523 218.967 34.2522L216.984 34.2519C216.558 34.2518 216.213 34.597 216.213 35.0228L216.21 54.2244C216.209 54.6502 215.864 54.9953 215.438 54.9952L203.595 54.9933C203.169 54.9933 202.824 54.648 202.824 54.2222L202.833 0.813337C202.833 0.387536 203.178 0.0424128 203.604 0.0424805L225.298 0.0459308C229.629 0.0466196 233.308 0.803887 236.335 2.31773C239.413 3.83159 241.709 5.91936 243.222 8.58103C244.735 11.1905 245.491 14.113 245.491 17.3485C245.49 21.0014 244.446 24.2628 242.358 27.1327C240.483 29.776 237.767 31.7108 234.21 32.9371C233.738 33.0998 233.519 33.6521 233.77 34.0835L245.279 53.8408C245.579 54.3548 245.208 54.9999 244.613 54.9999L231.303 54.9977ZM216.214 24.0092C216.214 24.435 216.559 24.7803 216.985 24.7803L224.511 24.7815C226.964 24.7819 228.791 24.1821 229.991 22.982C231.244 21.7819 231.87 20.086 231.871 17.8943C231.871 15.8069 231.245 14.1629 229.993 12.9625C228.793 11.762 226.966 11.1616 224.514 11.1612L216.987 11.16C216.562 11.16 216.216 11.5051 216.216 11.9309L216.214 24.0092Z" fill="url(#paint6_linear_2588_898)"/>
            <defs>
              <linearGradient id="paint0_linear_2588_898" x1="0" y1="27.4764" x2="35.7811" y2="27.4764" gradientUnits="userSpaceOnUse"><stop stopColor="#6F992D"/><stop offset="1" stopColor="#25330F"/></linearGradient>
              <linearGradient id="paint1_linear_2588_898" x1="31.1504" y1="27.4843" x2="64.818" y2="27.4843" gradientUnits="userSpaceOnUse"><stop stopColor="#6F992D"/><stop offset="1" stopColor="#25330F"/></linearGradient>
              <linearGradient id="paint2_linear_2588_898" x1="104.812" y1="27.4924" x2="61.6813" y2="27.4924" gradientUnits="userSpaceOnUse"><stop stopColor="#25330F"/><stop offset="1" stopColor="#6F992D"/></linearGradient>
              <linearGradient id="paint3_linear_2588_898" x1="143.951" y1="27.5002" x2="100.82" y2="27.5002" gradientUnits="userSpaceOnUse"><stop stopColor="#25330F"/><stop offset="1" stopColor="#6F992D"/></linearGradient>
              <linearGradient id="paint4_linear_2588_898" x1="139.008" y1="27.486" x2="193.604" y2="27.486" gradientUnits="userSpaceOnUse"><stop stopColor="#97520D"/><stop offset="1" stopColor="#423429"/></linearGradient>
              <linearGradient id="paint5_linear_2588_898" x1="203.056" y1="27.5164" x2="189.662" y2="27.5164" gradientUnits="userSpaceOnUse"><stop stopColor="#25330F"/><stop offset="1" stopColor="#6F992D"/></linearGradient>
              <linearGradient id="paint6_linear_2588_898" x1="245.955" y1="27.5212" x2="202.824" y2="27.5212" gradientUnits="userSpaceOnUse"><stop stopColor="#25330F"/><stop offset="1" stopColor="#6F992D"/></linearGradient>
            </defs>
          </svg>
        </div>

        <nav className="px-4 space-y-1">
          <div className="text-xs font-semibold text-[#2d4010] mb-3 px-2 border-b border-[#2d4010]/20 pb-2">
            Device(s){devices.length > 0 && <span className="text-[#2d4010]/40 ml-1">({devices.length})</span>}
          </div>

          {sortedDevices.length === 0 && (
            <div className="px-2 py-4 text-center">
              <Radio className="w-8 h-8 text-[#2d4010]/20 mx-auto mb-2" />
              <p className="text-xs text-[#2d4010]/40">No devices found</p>
              <Link
                href="/provision"
                className="text-xs text-[#6b8f3a] underline hover:no-underline mt-1 inline-block"
              >
                Provision a device
              </Link>
            </div>
          )}
          
          {sortedDevices.map((device) => (
            <div
              key={device.id}
              className={clsx(
                "group w-full flex items-center gap-3 px-2 py-2 text-sm font-medium transition-colors rounded",
                selectedDeviceId === device.id 
                  ? "text-[#2d4010]" 
                  : "text-[#2d4010]/50 hover:text-[#2d4010]/80"
              )}
            >
              <button
                onClick={() => selectDevice(device.id)}
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                <Circle
                  className={clsx(
                    "w-3 h-3 shrink-0",
                    device.online
                      ? "text-[#4a7c1c] fill-[#4a7c1c]"
                      : "text-[#2d4010]/20 fill-[#2d4010]/20"
                  )}
                />
                <span className="truncate">{device.name}</span>
                {!device.online && (
                  <span className="text-[10px] text-[#2d4010]/30 ml-auto">offline</span>
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeDevice(device.id);
                }}
                className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 text-[#2d4010]/30 hover:text-red-500 transition-all"
                title={`Remove ${device.name}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </nav>
      </div>

      <div className="p-4">
        <div className={clsx("flex items-center gap-2 text-xs px-2 py-1", isConnected ? "text-[#4a7c1c]" : "text-red-600")}>
          <div className={clsx("w-2 h-2 rounded-full shrink-0", isConnected ? "bg-[#4a7c1c] animate-pulse" : "bg-red-500")} />
          {isConnected ? "Connected" : "Disconnected"}
        </div>
        {connectionError && (
          <p className="px-2 pb-1 text-[10px] text-red-500 wrap-break-word leading-tight">{connectionError}</p>
        )}
        <Link
          href="/provision"
          className={clsx(
            "flex w-full items-center gap-2 px-2 py-2 text-sm transition rounded",
            pathname === '/provision'
              ? "text-[#2d4010] font-semibold"
              : "text-[#2d4010]/60 hover:text-[#2d4010]"
          )}
        >
          <Wifi size={15} />
          WiFi Provisioning
        </Link>
      </div>
    </aside>
  );
}
