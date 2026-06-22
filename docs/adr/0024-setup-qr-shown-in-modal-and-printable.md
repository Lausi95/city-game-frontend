# The setup QR is shown in a modal and is printable, not opened in a new tab

The operator views a [Setup link](../../CONTEXT.md)'s QR from the admin team and agent lists in a **modal dialog** (`SetupQrDialog`), not by opening the backend PNG endpoint in a new browser tab. The dialog carries a short explanation of what the code does and a **Drucken** (print) action for both teams and agents.

A reader might expect the setup QR to stay a plain link to the PNG (its earlier behaviour). It deliberately moves in-app: the modal is where the operator reads *which* QR this is and how it is meant to be distributed, and where printing is initiated — so the page stays uncluttered while the guidance sits next to the exact code being shown.

The two kinds share one mechanism but carry **different guidance**, because the two onboarding flows are genuinely different:

- **Team** setup is a [Registration](../../CONTEXT.md): the [Setup link](../../CONTEXT.md) carries only `gameId`+`teamId`, and scanning mints a fresh `memberId` via `POST /team-register`. A team has many members, so the code is meant to be **printed and distributed**, letting members set up their own devices without the admin panel. The guidance steers toward printing.
- **Agent** setup is a [Confirmation](../../CONTEXT.md): the [Setup link](../../CONTEXT.md) carries the whole `agentId`, so nothing is minted — the device just claims an existing identity. An agent is unique and reports to the operator anyway, so the recommendation is to **scan it straight off the admin screen**. Print is still offered (some operators will want paper), but the guidance steers toward screen-scan.

Consequences:
- The modal forces a white background and renders the PNG large with a quiet zone, regardless of light/dark theme — the same treatment as the find-QR (ADR 0011), because the agent code in particular is scanned off this screen by a *second* phone, so contrast and size matter more than visual consistency with the other dialogs.
- **Print is browser-native (`window.print()`) with an `@media print` sheet**, not a PDF or a popup window. The print sheet carries the name on top (team name / agent alias), the QR, and a self-explanatory caption so an unattended team member knows what to do. It reuses the *same PNG URL the modal already displays* — served from cache — so printing never fires on a not-yet-decoded (blank) QR. The image is rendered with no `onLoad` gate, since a cached PNG may never fire the event (see `FindQrDialog`).
- The earlier "open in a new tab" wording in ADR 0011 is superseded by this decision.
