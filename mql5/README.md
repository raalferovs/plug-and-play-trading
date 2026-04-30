# Plug & Play Trading — MQL5 EAs

This folder contains the Expert Advisors distributed to subscribers, plus
the shared license-validation include used by all of them.

```
mql5/
├── eas/        Production Expert Advisors (.mq5)
└── include/    Shared MQL5 includes (.mqh)
    └── Licensing.mqh   License validation against the platform API
```

## End-user setup (one-time per machine)

1. **Get your license key.**
   Log into your account on Plug & Play Trading and open
   **Profile → Manage License**. Copy the key.

2. **Allow the validation URL in MT5.**
   In MetaTrader 5: `Tools → Options → Expert Advisors`.
   - Tick **Allow WebRequest for listed URL**.
   - Add this URL exactly:
     ```
     https://plug-and-play-trading-production.up.railway.app
     ```
   - Click OK.

3. **Attach the EA.**
   - Open the chart for the symbol you want to trade.
   - Drag the EA onto the chart.
   - In the **Inputs** tab, paste your license key into **License Key**.
   - Leave **License Endpoint** empty.
   - Make sure **Algo Trading** is enabled (top toolbar).

4. **Verify.**
   Open the **Experts** tab in the *Toolbox* panel. You should see:
   ```
   [LIC] Validating against https://plug-and-play-trading-production.up.railway.app/api/licenses/validate
   [LIC] OK -- next check in 24 h
   ```
   followed by the EA's normal startup messages.

## How licensing behaves

- The EA validates against the platform on start, then re-checks **every 24 hours**.
- If the server is unreachable temporarily (your internet, our maintenance), the EA keeps running for up to **72 hours** on the last successful check.
- If your subscription becomes inactive (cancelled / payment failed), the EA stops opening **new** trades within 24 hours. **Existing positions are not closed.** Renew your subscription, the EA picks it up automatically on the next check.
- The first MT5 account that validates a key is auto-bound to it. You can bind up to **5 MT5 accounts** (live or demo) per license.
- Your trading logic runs entirely on your MT5 — no trade data is sent to the server, only the license key + your MT5 account number for verification.

## Troubleshooting

| Symptom | Cause / Fix |
| --- | --- |
| `[LIC] WebRequest failed (err 4060)` | URL not in the MT5 allow-list. Re-do step 2. |
| `[LIC] DENIED: invalid_key` | Typo or stale key. Copy it again from `/licenses` on the platform. |
| `[LIC] DENIED: subscription_inactive` | Your subscription is cancelled, past_due, or never started. Visit `/billing`. |
| `[LIC] DENIED: binding_limit` | You've already bound 5 MT5 accounts. Contact support to unbind one. |
| `[LIC] DENIED: revoked` | An admin manually revoked your license. Contact support. |
| EA refuses to start (`INIT_FAILED`) | Check the **Experts** tab for the `[LIC]` lines above. |

## For developers

To add licensing to a new EA in `mql5/eas/`:

```mql5
// 1. Include the header (relative path)
#include "../include/Licensing.mqh"

// 2. Add input group at the top of your inputs
input group "<<=========== License ===========>>"
input string LicenseKey      = "";
input string LicenseEndpoint = "";   // dev override, leave empty

// 3. In OnInit
int OnInit() {
   if(!LicenseInit(LicenseKey, LicenseEndpoint))
      return INIT_FAILED;
   // ...your existing init code...
}

// 4. In OnTick
void OnTick() {
   if(!LicenseAllowed())
      return;
   // ...your existing tick logic...
}

// 5. In OnTimer (recommended; falls back to next OnInit otherwise)
void OnTimer() {
   // ...your existing timer code...
   LicenseTick();
}
```

In **Strategy Tester / Optimisation** mode, all license functions are no-ops.
Backtests run unrestricted.

For local development you can point the EA at a local server by setting the
**License Endpoint** input to e.g. `http://localhost:3007/api/licenses/validate`
(remember to allow that URL too).
