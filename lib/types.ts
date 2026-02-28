export interface SensorData {
  ts: number;        // millis() from device — NOT Unix time
  wallClock: number; // Date.now() captured on the dashboard side
  mq8: number;       // Hydrogen — raw ADC (0–4095)
  mq3: number;       // Alcohol — raw ADC (0–4095)
  mq5: number;       // LPG/Gas — raw ADC (0–4095)
  temp: number;      // DS18B20 liquid temperature (°C)
  tds: number;       // TDS Sensor (ppm, calibrated)
  dht_temp: number;  // DHT11 air temperature (°C)
  humidity: number;  // DHT11 relative humidity (%)
  ph: number;        // pH Meter (0–14)
  aerator: boolean;  // Aerator relay state
  led: boolean;      // LED relay state
}

export interface ControlState {
  aerator: boolean;
  led: boolean;
}

export interface PairingPayload {
  action: 'pair' | 'unpair';
  device: string;   // 8-char hex Device ID
  name: string;     // e.g. "Ferroir-A1B2"
  ts?: number;      // millis() — optional
}

export interface Device {
  id: string;        // 8-char hex Device ID
  name: string;      // Human-friendly name: "Ferroir-XXXX"
  online: boolean;
  lastSeen: number;  // Date.now() when last pair/sensor message arrived
}

export interface DeviceTelemetry extends SensorData {
  deviceId: string;
}
