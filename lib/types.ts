export interface SensorData {
  timestamp: number;
  mq8: number;      // Hydrogen (ppm)
  mq3: number;      // Alcohol (mg/L or ppm)
  mq5: number;      // LPG/Gas (ppm)
  temp_liquid: number; // DS18B20 (Celsius)
  tds: number;      // TDS Sensor (ppm)
  temp_air: number; // DHT11 (Celsius)
  humidity: number; // DHT11 (%)
  ph: number;       // pH Meter
}

export interface ControlState {
  aerator: boolean;
  light: boolean;
}

export interface DeviceTelemetry extends SensorData {
  deviceId: string;
}
