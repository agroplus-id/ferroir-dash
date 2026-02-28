# Ferroir — Device Integration Guide

> **Purpose:** This document describes the complete MQTT API, BLE provisioning protocol, and device behavior of the Ferroir coffee fermentation monitor. Feed this to any agent or developer building a dashboard, mobile app, or backend that integrates with Ferroir devices.

---

## 1. Device Identity

- **Device ID:** 8-character uppercase hex string derived from the ESP32 eFuse MAC.
  - Example: `A1B2C3D4`
- **BLE Name / Display Name:** `Ferroir-XXXX` (first 4 chars of Device ID)
  - Example: `Ferroir-A1B2`

---

## 2. MQTT Broker

| Parameter    | Value |
|-------------|-------|
| **Host**     | `64226d61d40b4f32be4ab902bbea42d2.s1.eu.hivemq.cloud` |
| **Port**     | `8883` (TLS, encrypted) |
| **Username** | `agroplus` |
| **Password** | `AgroplusJaya123.` |
| **Client ID** | `ferroir-{deviceId}` (e.g. `ferroir-A1B2C3D4`) |
| **TLS**      | Yes (no cert verification, still encrypted) |

---

## 3. MQTT Topics — Complete Reference

All topics follow the pattern `ferroir/{deviceId}/...`

### 3.1 Sensor Data — `ferroir/{deviceId}/sensors`

| Property | Value |
|----------|-------|
| Direction | **Device → Broker** (publish) |
| QoS | 0 |
| Retained | No |
| Frequency | Every **5 seconds** |

**Payload:**

```json
{
  "mq3":      0.00,
  "mq5":      0.00,
  "mq8":      0.00,
  "temp":     0.00,
  "humidity": 0.00,
  "dht_temp": 0.00,
  "tds":      0.00,
  "ph":       0.00,
  "aerator":  false,
  "led":      false,
  "ts":       123456
}
```

| Field      | Type   | Description |
|-----------|--------|-------------|
| `mq3`     | float  | MQ-3 alcohol gas sensor — raw ADC value (0–4095) |
| `mq5`     | float  | MQ-5 LPG/methane gas sensor — raw ADC value (0–4095) |
| `mq8`     | float  | MQ-8 hydrogen gas sensor — raw ADC value (0–4095) |
| `temp`    | float  | DS18B20 water/liquid temperature in °C |
| `humidity`| float  | DHT11 relative humidity in % |
| `dht_temp`| float  | DHT11 air temperature in °C |
| `tds`     | float  | Total Dissolved Solids in ppm (calibrated) |
| `ph`      | float  | pH value (0–14 range, calibrated) |
| `aerator` | bool   | Current aerator relay state (true = ON) |
| `led`     | bool   | Current LED relay state (true = ON) |
| `ts`      | number | `millis()` — ms since device boot, **NOT a Unix timestamp** |

All float values are rounded to 2 decimal places.

---

### 3.2 Relay Command — `ferroir/{deviceId}/relay/cmd`

| Property | Value |
|----------|-------|
| Direction | **Broker → Device** (subscribe) |
| QoS | 0 |
| Retained | N/A (incoming) |

**Payload (publish this to control relays):**

```json
{
  "aerator": true,
  "led": false
}
```

- Both fields are **optional** — include only the relay(s) you want to change.
- `true` = turn ON, `false` = turn OFF.
- After processing, the device immediately publishes the new state on `relay/state`.

**Examples:**

```json
{"aerator": true}
{"led": false}
{"aerator": false, "led": true}
```

---

### 3.3 Relay State — `ferroir/{deviceId}/relay/state`

| Property | Value |
|----------|-------|
| Direction | **Device → Broker** (publish) |
| QoS | 0 |
| Retained | No |
| Trigger | Published immediately after any `relay/cmd` is processed |

**Payload:**

```json
{
  "aerator": false,
  "led": false
}
```

Use this for confirmation — subscribe to it after sending a `relay/cmd` to verify the device acted on the command.

---

### 3.4 Pairing / Presence — `ferroir/{deviceId}/pairing`

| Property | Value |
|----------|-------|
| Direction | **Device → Broker** (publish) |
| QoS | **1** |
| Retained | **Yes** |
| Trigger | `"pair"` on MQTT connect; `"unpair"` on explicit disconnect or Last Will |

**Payload:**

```json
{
  "action":  "pair",
  "device":  "A1B2C3D4",
  "name":    "Ferroir-A1B2",
  "ts":      123456
}
```

| Field    | Type   | Description |
|---------|--------|-------------|
| `action` | string | `"pair"` (device online) or `"unpair"` (device offline) |
| `device` | string | 8-char hex Device ID |
| `name`   | string | Human-friendly name: `Ferroir-XXXX` |
| `ts`     | number | `millis()` since boot (not Unix time) |

**Last Will & Testament (LWT):**

If the device disconnects unexpectedly (crash, power loss, network failure), the broker automatically publishes:

```json
{"action": "unpair", "device": "A1B2C3D4"}
```

to the same topic with QoS 1 and retained = true.

---

## 4. Dashboard Integration Recipe

### Step 1: Discover all devices

```
SUBSCRIBE  ferroir/+/pairing  QoS 1
```

Because pairing messages are **retained**, you will immediately receive the last known state of every device that has ever connected. Build a device registry:

- `action == "pair"` → device is online
- `action == "unpair"` → device is offline

### Step 2: Receive sensor data from a device

```
SUBSCRIBE  ferroir/{deviceId}/sensors  QoS 0
```

Data arrives every 5 seconds. Use wall-clock time on the dashboard side for timestamps (ignore `ts` or use it for uptime display).

### Step 3: Control relays

```
PUBLISH  ferroir/{deviceId}/relay/cmd  QoS 0
PAYLOAD  {"aerator": true}
```

### Step 4: Confirm relay state

```
SUBSCRIBE  ferroir/{deviceId}/relay/state  QoS 0
```

### Step 5: Monitor all devices dynamically

```
SUBSCRIBE  ferroir/+/pairing       QoS 1    ← device discovery
SUBSCRIBE  ferroir/+/sensors       QoS 0    ← all sensor data
SUBSCRIBE  ferroir/+/relay/state   QoS 0    ← all relay feedback
```

Parse the `device` field from pairing messages to build/update a device list, then display sensor data per device.

---

## 5. Sensors — Detailed Reference

| Sensor | Type | GPIO Pin | JSON Key | Unit | Range | Calibrated? |
|--------|------|----------|----------|------|-------|-------------|
| MQ-3 | Alcohol gas | 34 | `mq3` | Raw ADC | 0–4095 | No |
| MQ-5 | LPG/Methane | 32 | `mq5` | Raw ADC | 0–4095 | No |
| MQ-8 | Hydrogen | 35 | `mq8` | Raw ADC | 0–4095 | No |
| DS18B20 | Water temp | 4 | `temp` | °C | -55 to +125 | Yes (hardware) |
| DHT11 | Air temp | 32 | `dht_temp` | °C | 0–50 | Yes (hardware) |
| DHT11 | Humidity | 32 | `humidity` | % RH | 20–90 | Yes (hardware) |
| TDS | Dissolved solids | 33 | `tds` | ppm | 0–1000+ | Polynomial |
| pH | Acidity | 36 | `ph` | pH | 0–14 | Linear (needs calibration) |

### Calibration Formulas (for reference)

**TDS:**
```
voltage = raw_adc × 3.3 / 4095
tds_ppm = (133.42 × V³ − 255.86 × V² + 857.39 × V) × 0.5
```

**pH:**
```
voltage = raw_adc × 3.3 / 4095
ph = 3.5 × voltage + 0.0    (slope/offset to be tuned)
```

---

## 6. Relays

| Relay | GPIO Pin | JSON Key | Active Level | Initial State |
|-------|----------|----------|-------------|---------------|
| Aerator | 26 | `aerator` | HIGH = ON | OFF |
| LED Light | 27 | `led` | HIGH = ON | OFF |

---

## 7. BLE WiFi Provisioning

Used when the device has no stored WiFi credentials or when re-provisioning is needed.

### BLE UUIDs

| Item | UUID |
|------|------|
| Service | `4fafc201-1fb5-459e-8fcc-c5c9c331914b` |
| SSID Characteristic | `beb5483e-36e1-4688-b7f5-ea07361b26a8` |
| Password Characteristic | `beb5483e-36e1-4688-b7f5-ea07361b26a9` |
| Status Characteristic | `beb5483e-36e1-4688-b7f5-ea07361b26aa` |

### Characteristic Access

| Characteristic | Read | Write | Notify |
|----------------|------|-------|--------|
| SSID | ✓ | ✓ | ✗ |
| Password | ✗ | ✓ | ✗ |
| Status | ✓ | ✗ | ✓ |

### Status Values

| Value | Meaning |
|-------|---------|
| `IDLE` | Waiting for credentials |
| `CONNECTING` | WiFi connection attempt in progress |
| `CONNECTED` | WiFi connected successfully |
| `FAILED` | Connection failed — user can retry |

### Provisioning Flow

1. Scan for BLE devices advertising service `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
2. Device appears as `Ferroir-XXXX`
3. Connect and discover the service
4. Write WiFi SSID string to SSID characteristic
5. Write WiFi password string to Password characteristic (**this triggers the connection**)
6. Subscribe to Status characteristic notifications
7. Receive `"CONNECTING"` → then `"CONNECTED"` (success) or `"FAILED"` (retry)
8. On success: credentials saved to NVS, BLE advertising stops
9. On failure: device stays in BLE provisioning mode for retry
10. If WiFi drops later and can't reconnect within 15 seconds, BLE advertising restarts

---

## 8. Device Startup Sequence

```
1. Serial init (115200 baud)
2. NVS init → derive Device ID from eFuse MAC
3. LCD init → show "Ferroir v1.0" + Device ID
4. Relays init → both OFF
5. Sensors init (MQ3, MQ5, MQ8, TDS, pH, DS18B20, DHT11)
6. Try WiFi with stored NVS credentials
   ├── Success → WIFI_CONNECTED event, start BLE anyway (for re-provisioning)
   └── Failure → Start BLE provisioning, show "BLE Provision" on LCD
7. MQTT init → load custom config from NVS or use Config.h defaults
8. Main loop: sensors → LCD → MQTT → BLE (repeats)
```

---

## 9. Timing Summary

| Interval | Duration | What happens |
|----------|----------|-------------|
| Sensor read | 2 sec | All sensors sampled, values published to internal EventBus |
| LCD rotate | 3 sec | Display cycles through 5 pages of sensor/status data |
| MQTT publish | 5 sec | Bundled JSON of all sensor values sent to `sensors` topic |
| MQTT reconnect | 5 sec | Retry interval on failed MQTT connection |
| WiFi timeout | 15 sec | Max wait for WiFi connection before starting BLE provisioning |

---

## 10. NVS Persisted Data

Namespace: `ferroir`

| Key | Type | Description |
|-----|------|-------------|
| `wifi_ssid` | String | Stored WiFi SSID |
| `wifi_pass` | String | Stored WiFi password |
| `mqtt_host` | String | Custom MQTT broker hostname |
| `mqtt_port` | uint16 | Custom MQTT broker port (default: 1883) |
| `mqtt_user` | String | Custom MQTT username |
| `mqtt_pass` | String | Custom MQTT password |

If `mqtt_host` is empty, the device falls back to the compiled defaults in Config.h.

---

## 11. Important Notes for Implementors

1. **`ts` is NOT Unix time.** It is `millis()` (ms since ESP32 boot). Use your server/client clock for wall-clock timestamps.
2. **Pairing is retained.** When your app connects to the broker, you immediately get the last known state of all devices.
3. **Last Will ensures offline detection.** Even if a device crashes, the broker publishes `"unpair"` automatically.
4. **Relay commands are fire-and-forget (QoS 0).** Subscribe to `relay/state` to confirm execution.
5. **MQ sensors report raw ADC values.** If you need gas concentration in PPM, apply sensor-specific calibration curves on the dashboard side.
6. **Wildcard subscriptions** — use `ferroir/+/sensors` to receive data from ALL devices, or `ferroir/{specific_id}/sensors` for one device.
7. **Sensor data includes relay state.** The periodic `sensors` payload includes `aerator` and `led` booleans, so you can also track relay state passively without subscribing to `relay/state`.
