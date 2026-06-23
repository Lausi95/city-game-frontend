# In-app QR decoding uses the `qr-scanner` library, not the native BarcodeDetector

In-app scanning (ADR 0032) must work on **iPhones and Android phones** — the realistic field audience for a public city game. The browser-native `BarcodeDetector` API would be a zero-dependency decoder, but it is **not available in iOS Safari/WebKit** (and therefore in *every* iOS browser, since they all use WebKit), so it cannot carry the iOS half of the audience. We add the [`qr-scanner`](https://github.com/nimiq/qr-scanner) library instead: small, QR-only, and batteries-included — it manages `getUserMedia`, the decode worker, and camera selection, so we write the least camera plumbing ourselves.

A reader who sees a JS/WASM decoder added to a deliberately lean dependency list (the app otherwise runs on essentially Next/React/Leaflet) might ask why we didn't use the native API. The answer is the iOS constraint above; the dependency is the cost of supporting iPhones at all.

Considered and rejected: native **`BarcodeDetector`** (unusable on iOS); **jsQR** alone (a decoder with no camera handling — we'd own the `getUserMedia`/canvas/frame loop, more of our own code to test); **zxing-wasm / @zxing/browser** (very robust and multi-format, but the heaviest option and overkill when we only ever decode QR).
