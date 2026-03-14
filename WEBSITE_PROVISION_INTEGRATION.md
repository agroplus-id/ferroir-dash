Ferroir — Website Integration: Provision-Request

Purpose
- Instructions for a web frontend or backend to trigger device WiFi disconnect and restart BLE provisioning via MQTT.

Summary
- MQTT control topic: `ferroir/{deviceId}/control`
- Supported actions: `provision` and `disconnect`.
- Optional flag: `forget` (boolean) — when true, device clears saved WiFi credentials.
- The device will publish a retained `pairing` message with `action:"unpair"` before dropping MQTT, then restart BLE advertising so a user can re-provision via BLE.

Topics and QoS
- Device-specific control topic: `ferroir/{deviceId}/control` (QoS 0 is used by device; server may use QoS 0 or 1)
- Device pairing topic (for status): `ferroir/{deviceId}/pairing` (QoS 1, retained)

Control Payloads (JSON)
- Request provisioning without forgetting stored credentials:

```json
{ "action": "provision" }
```

- Request provisioning and clear stored WiFi credentials:

```json
{ "action": "provision", "forget": true }
```

- Equivalent `disconnect` action (semantics identical to `provision` — causes WiFi disconnect and BLE restart):

```json
{ "action": "disconnect", "forget": true }
```

Expected Device Behavior
1. On receiving a valid control message (`provision` or `disconnect`):
   - Publish retained pairing message with `{"action":"unpair","device":"{deviceId}"}` (so dashboards see offline state).
   - Disconnect MQTT and WiFi. If `forget=true`, delete stored WiFi credentials from NVS.
   - Turn off WiFi radio (the device's code calls `WiFi.mode(WIFI_OFF)`), then start BLE advertising for provisioning (device advertises as `Ferroir-XXXX`).
2. User uses a mobile app or a BLE tool to write SSID/password to the device. On success the device reconnects to WiFi and publishes `{"action":"pair", ...}` (retained).

Website UI Flow Recommendation
- Device list: subscribe to `ferroir/+/pairing` (QoS 1) to maintain a registry of devices and online/offline status.
- On device row, add action button: "Re-Provision" or "Disconnect WiFi".
- When user clicks action:
  1. Show confirm modal: explain that device will go offline and enter BLE provisioning mode. (Optional checkbox: "Forget saved WiFi credentials".)
  2. Backend publishes JSON to `ferroir/{deviceId}/control` with `action` and `forget` fields.
  3. UI subscribes to the device's pairing topic or listens to a server-side event stream to detect the `unpair` retained message. When `unpair` is observed, show instructions: "Open mobile provisioning UI and connect to BLE device named Ferroir-XXXX".
  4. Optionally show a progress indicator and timeouts.

Server-side Publish Examples
- Node.js (mqtt.js):

```js
const mqtt = require('mqtt');
const client = mqtt.connect('mqtts://your-broker:8883', { username: 'user', password: 'pass' });

const deviceId = 'A1B2C3D4';
const topic = `ferroir/${deviceId}/control`;
const payload = JSON.stringify({ action: 'provision', forget: true });

client.publish(topic, payload, { qos: 0 }, (err) => {
  if (err) console.error('Publish failed', err);
  else console.log('Provision request sent');
  client.end();
});
```

- Python (paho-mqtt):

```py
import paho.mqtt.client as mqtt
client = mqtt.Client(client_id='web-admin')
client.username_pw_set('user','pass')
client.tls_set()  # configure CA if required
client.connect('broker.host', 8883)
client.publish(f'ferroir/{deviceId}/control', payload='{"action":"provision","forget":true}')
client.disconnect()
```

REST API Pattern (optional)
- Provide a server HTTP endpoint that the website calls; the server authenticates user, checks authorization, and publishes MQTT message on behalf of the website.

POST /api/devices/{deviceId}/provision
Body: { "forget": true }

Server behavior:
- Verify user allowed to manage device
- Publish `{ "action":"provision", "forget": <bool> }` to `ferroir/{deviceId}/control`
- Return 202 Accepted and stream events to UI or let UI subscribe directly to pairing topic

Security Considerations
- AUTHORIZE: Only authenticated, authorized users should be allowed to publish to the control topic. Implement server-side ACLs or broker ACLs that prevent arbitrary clients from publishing to control topics.
- DO NOT allow web clients to publish directly to MQTT unless they are authenticated to the broker and permitted to control that device.
- AUDIT: Log who triggered provisioning/disconnect for auditability.
- VALIDATE: Server should validate `deviceId` and user permissions; do not accept wildcards from the UI.
- TLS: Use TLS to protect the MQTT connection credentials and payload.

Frontend UX Tips
- Confirm modal with clear consequences.
- Show device name `Ferroir-XXXX` and a copyable deviceId.
- Display the `unpair` retained message arrival as confirmation that device is offline and provisioning can proceed.
- Give the user step-by-step BLE provisioning instructions with screenshots or a link to the mobile provisioning app.
- Offer a "Retry" or "Cancel" option if the device does not re-appear within a timeout.

Troubleshooting
- If pairing/unpair events are not seen, check broker ACLs and ensure the server publishes to the correct `ferroir/{deviceId}/control` topic.
- If device does not start BLE advertising after the request, check device serial logs for errors — device will log `[MQTT] Control action='provision'` and `[Core] Provision requested via MQTT`.
- If device fails to reconnect after provisioning, ensure mobile app used correct SSID/password and that the AP is 2.4 GHz.

Appendix: Device Signals to Watch
- `ferroir/{deviceId}/pairing` retained payloads:
  - `{"action":"pair", "device":"{id}", ...}` → device online
  - `{"action":"unpair","device":"{id}"}` → device going offline / entering provisioning

- `ferroir/{deviceId}/sensors` → live sensor data (useful to detect final sensor sample before offline)


Done — the website/backend can publish the control payload to trigger provisioning and optionally erase saved credentials. Use server-side MQTT publishing and broker ACLs to enforce authorization.
