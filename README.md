# PiCUA – Computer Use Agent (CUA)

PiCUA is an AI‑first experience for **controlling any device**, combining a hosted assistant, an HTTP API, and a modern web UI. It is designed for both non‑technical users and developers who want reliable, scriptable remote control.

This repository contains the building blocks behind PiCUA AI:

- **Core Node.js library** for interacting with PiKVM
- **HTTP API server** (Express)
- **Web frontend** (Vite + React) in `picua-frontend/`

---

## Features

- **Full HID control**  
  Keyboard typing, single keys, shortcuts, mouse move/click/scroll.

- **Power management (ATX)**  
  Power on/off, reset, and cycle the attached host.

- **Mass Storage Device (MSD)**  
  List images, upload ISO from URL, connect/disconnect MSD.

- **Screenshots**  
  Capture the current PiKVM framebuffer for monitoring or automation.

- **AI desktop automation**  
  Conversational control of your desktop and PiKVM via Anthropic (`@anthropic-ai/sdk`) and the hosted assistant at [picua.withgiga.ai](https://picua.withgiga.ai/).

- **Multiple entrypoints**  
  Use PiCUA through the hosted AI assistant, the web UI, or directly via the HTTP API.

---

## Requirements

- **Node.js** `>= 14.0.0`
- A **PiKVM** device reachable from where you run PiCUA
- Network access between PiCUA and the PiKVM

---

## Installation

Clone and install in this repository root:

```bash
git clone https://github.com/yourusername/picua.git
cd picua
npm install
```

> If you publish this as a package you can also install globally and call the CLI as `picua`, but the default flow here is **local usage from this repo**.

---

## Configuration

PiCUA reads configuration from a `.env` file in the project root.

Create it (or copy from an example, if present):

```bash
cp .env.example .env    # if .env.example exists
```

Then edit `.env`:

```env
# Anthropic API key (optional – only for AI automation features)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# PiKVM connection (can also be provided via UI or other means)
PIKVM_IP=192.168.1.7
PIKVM_USERNAME=admin
PIKVM_PASSWORD=admin

# HTTP server configuration
PORT=3000
NODE_ENV=development
```

> **Security note:** keep `.env` out of version control and never share real credentials.

---

## How to Use PiCUA

PiCUA can be used in two primary ways:

1. **Hosted PiCUA AI** – no local setup required
2. **Self‑hosted backend + web UI** – for local or on‑prem deployments

---

## PiCUA AI (hosted assistant)

For the easiest way to use PiCUA, go to:

- **PiCUA AI**: [https://picua.withgiga.ai/](https://picua.withgiga.ai/)

There you can:

- **Talk to an AI agent** that understands PiKVM control primitives
- Ask it to perform actions like typing, mouse moves, power operations, and more
- Let it orchestrate multi‑step desktop workflows for you

No local installation is required to use the hosted experience.

---

## Self‑hosting (for developers)

If you want to run PiCUA components yourself (for local development or private deployments), you can start the **HTTP API server** and **web frontend** from this repo.

### 1. HTTP API server

Start the server from the root:

```bash
# Using npm script
npm run start-server

# Or directly
node server.js
```

By default the server listens on `http://localhost:3000` (or the `PORT` in your `.env`).

Typical endpoints (may vary with your implementation):

- `POST /api/hid/type` – type text
- `POST /api/hid/key` – press a key
- `POST /api/hid/shortcut` – send a keyboard shortcut
- `POST /api/hid/mouse/move` – move mouse
- `POST /api/hid/mouse/click` – mouse click
- `POST /api/atx/power` – power control
- `GET  /api/snapshot` – capture screenshot
- `GET  /api/msd/status` – MSD status
- `POST /api/msd/upload` – upload ISO image

Use these from your own scripts, dashboards, or automation tools.

### 2. Web frontend (React)

The browser UI lives in `picua-frontend/` and is powered by Vite + React.

From the repo root:

```bash
cd picua-frontend

# Development server (with HMR)
npm install        # first time only
npm run dev
```

The default Vite dev server runs at `http://localhost:5173` (or the port Vite prints).

For a production build:

```bash
cd picua-frontend
npm run build      # outputs static assets under dist/
npm run preview    # optional: preview the production build
```

Depending on how you wire things, the frontend may:

- Call the Node/Express API in this repo
- Proxy directly to the PiKVM instance

Check your API base URL configuration (environment variables or config files) when deploying.

---

## Project Structure (high level)

```text
picua/
├── src/              # Core library & API modules
├── picua-frontend/   # React web UI (Vite)
├── cli.js            # CLI entrypoint
├── server.js         # HTTP API server
├── package.json      # Root scripts & deps
└── README.md
```

---

## Development

In the repo root:

```bash
# Run core library in dev mode (if applicable)
npm run dev

# Run unit tests
npm test

# Lint & format
npm run lint
npm run format
```

In `picua-frontend/`:

```bash
cd picua-frontend
npm run dev     # start frontend
npm run lint    # lint frontend
npm run build   # build frontend
```

---

## License

This project is licensed under the **Apache License 2.0**. See the [LICENSE](LICENSE) file for details.

---

PiCUA – making PiKVM automation and remote control straightforward and scriptable.
