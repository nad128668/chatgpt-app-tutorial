# How To Create a ChatGPT App with UI in ReactJS + Tailwind

### Step-by-Step Guide (ChatGPT + MCP + Map UI)

In this tutorial, you’ll build a **ChatGPT App with a custom UI**, powered by:

* **React + Tailwind CSS** for the frontend
* **Mapbox GL** for map visualization
* **MCP (Model Context Protocol)** for tool execution
* A **Python MCP server** with a single tool: `find_places()`

When a user sends a prompt like:

> **“Show me some hotels in New York”**

ChatGPT will:

1. Call your MCP tool with structured input
2. Receive place data
3. Render a **live Map UI inside ChatGPT**, showing the results

### Example tool input

```json
{
  "keyword": "hotels",
  "cityName": "New York",
  "countryCode": "US"
}
```

### Example returned data (hardcoded JSON for demo)

```json
{
  "name",
  "address",
  "location",
  "rate",
  "phoneNumber"
}
```

> 📌 **Data source:**
> We fetch location data using Apify Actor:
> **Free Google Maps Scraper – Low-cost & Extensive Version**

<p align="center">
  <img src="./assets/chatgpt_demo.gif" alt="Demo" width="600" />
</p>

---

## Table of Contents

- [How To Create a ChatGPT App with UI in ReactJS + Tailwind](#how-to-create-a-chatgpt-app-with-ui-in-reactjs--tailwind)
    + [Step-by-Step Guide (ChatGPT + MCP + Map UI)](#step-by-step-guide-chatgpt--mcp--map-ui)
    + [Example tool input](#example-tool-input)
    + [Example returned data (hardcoded JSON for demo)](#example-returned-data-hardcoded-json-for-demo)
  * [Table of Contents](#table-of-contents)
  * [Prerequisites](#prerequisites)
  * [Project Setup](#project-setup)
  * [Build the React + Tailwind UI](#build-the-react--tailwind-ui)
    + [Initialize React with Vite](#initialize-react-with-vite)
    + [Install Tailwind CSS](#install-tailwind-css)
  * [Configure Vite as a Multi-Page App (MPA)](#configure-vite-as-a-multi-page-app-mpa)
    + [Cleanup default Vite files](#cleanup-default-vite-files)
    + [Update `package.json` dependencies](#update-packagejson-dependencies)
    + [Configure Tailwind](#configure-tailwind)
    + [Configure Vite for ChatGPT-Compatible Output](#configure-vite-for-chatgpt-compatible-output)
  * [Add Shared Types and Hooks](#add-shared-types-and-hooks)
    + [`src/types.ts`](#srctypests)
    + [`src/index.css`](#srcindexcss)
    + [Hooks](#hooks)
  * [Create the Places Map UI Page](#create-the-places-map-ui-page)
    + [HTML entry point](#html-entry-point)
    + [React page logic](#react-page-logic)
  * [Build and Serve the UI](#build-and-serve-the-ui)
  * [Build the MCP Server (Python)](#build-the-mcp-server-python)
    + [Key MCP Concepts (Quick Explanation)](#key-mcp-concepts-quick-explanation)
    + [Run the MCP Server](#run-the-mcp-server)
  * [Test with MCP Inspector](#test-with-mcp-inspector)
  * [Connect MCP to ChatGPT](#connect-mcp-to-chatgpt)
    + [Expose MCP via ngrok](#expose-mcp-via-ngrok)
    + [Create the ChatGPT App](#create-the-chatgpt-app)
    
---

## Prerequisites

Make sure the following tools are installed:

* `git`
* `npm` or `pnpm`
* **Python 3.10+** (for MCP server)
* `uv` (recommended for Python environment management)

---

## Project Setup

Create a new workspace for the tutorial:

```
mkdir chatgpt-app-tutorial
cd chatgpt-app-tutorial
git init
```

You’ll be working in **two main parts**:

1. `ui-js/` → React + Tailwind UI
2. `mcp_server/` → Python MCP backend

---

## Build the React + Tailwind UI

> 💡 We’ll reuse UI patterns from **OpenAI Apps SDK Examples**
> This helps ensure compatibility with ChatGPT’s embedded renderer.

### Initialize React with Vite

```
npm create vite@latest ui-js -- --template react
```

Follow the on-screen prompts to finish setup.

---

### Install Tailwind CSS

Inside the `ui-js` folder:

```
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```

Start the dev server to verify everything works:

```
npm run dev
```

You should see something like:

```
VITE v7.3.1 ready in 243 ms
Local: http://localhost:5173/
```

> Tip: Press **`o + Enter`** to open the browser automatically.

---

## Configure Vite as a Multi-Page App (MPA)

We want **each UI widget to be deployable independently**, meaning:

* Each page has its own HTML
* Each page has its own bundled JS/CSS
* ChatGPT can load the UI reliably via full URLs

### Cleanup default Vite files

* Remove everything inside `src/`
* Delete the `public/` folder
* Remove `src/index.html`

---

### Update `package.json` dependencies

Add the following (do not remove your existing scripts):

```json
"dependencies": {
  "@openai/apps-sdk-ui": "^0.2.1",
  "embla-carousel-react": "^8.6.0",
  "framer-motion": "^12.29.2",
  "lucide-react": "^0.563.0",
  "mapbox-gl": "^3.18.1",
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "react-router-dom": "^7.13.0"
},
"devDependencies": {
  "@eslint/js": "^9.39.1",
  "@tailwindcss/vite": "^4.1.18",
  "@types/react": "^19.2.5",
  "@types/react-dom": "^19.2.3",
  "@vitejs/plugin-react": "^5.1.1",
  "babel-plugin-react-compiler": "^1.0.0",
  "eslint": "^9.39.1",
  "eslint-plugin-react-hooks": "^7.0.1",
  "eslint-plugin-react-refresh": "^0.4.24",
  "globals": "^16.5.0",
  "tailwindcss": "^4.1.18",
  "vite": "^7.2.4"
}
```

---

### Configure Tailwind

Update `tailwind.config.js`:

```js
export default {
  content: ["./index.html", "./**/*.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
```

---

### Configure Vite for ChatGPT-Compatible Output

Update `vite.config.js` exactly as follows:

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "http://localhost:5173/",
  plugins: [react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }), tailwindcss()],
  build: {
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        "places-map": resolve(__dirname, "places-map/index.html"),
      },
      output: {
        manualChunks: undefined,
        entryFileNames: ({ name }) => `${name}/assets/[name].js`,
        // Put *all* chunks (if any) alongside the entry that imports them.
        // With manualChunks undefined, you should get very few chunks.
        chunkFileNames: ({ facadeModuleId }) => {
          // try to infer the page from where the chunk comes from
          const id = (facadeModuleId || "").replace(/\\/g, "/");
          const m = id.match(/\/src\/pages\/([^/]+)\//); // src/pages/<page>/
          const page = m?.[1] || "places-map"; // fallback
          return `${page}/assets/[name].js`;
        },

        // Put assets under the inferred page folder too
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name?.replace(/\\/g, "/") || "";
          const m = name.match(/src\/pages\/([^/]+)\//);
          const page = m?.[1] || "places-map";
          return `${page}/assets/[name][extname]`;
        },
      }
    },
  },
});
```

> ⚠️ **Important**
> ChatGPT **requires absolute URLs** for assets.
> Relative paths like `assets/app.js` will NOT render correctly.

Your final `dist` output should look like:

```
dist/
└── places-map/
    ├── index.html
    └── assets/
```

And `index.html` must include full URLs such as:

```html
<script src="http://localhost:5173/places-map/assets/places-map.js"></script>
```

---

## Add Shared Types and Hooks

These files handle communication between:

* ChatGPT host
* UI widget
* MCP tool state

### `src/types.ts`

```ts
export type OpenAiGlobals<
  ToolInput = UnknownObject,
  ToolOutput = UnknownObject,
  ToolResponseMetadata = UnknownObject,
  WidgetState = UnknownObject
> = {
  // visuals
  theme: Theme;

  userAgent: UserAgent;
  locale: string;

  // layout
  maxHeight: number;
  displayMode: DisplayMode;
  safeArea: SafeArea;

  // state
  toolInput: ToolInput;
  toolOutput: ToolOutput | null;
  toolResponseMetadata: ToolResponseMetadata | null;
  widgetState: WidgetState | null;
  setWidgetState: (state: WidgetState) => Promise<void>;
};

// currently copied from types.ts in chatgpt/web-sandbox.
// Will eventually use a public package.
type API = {
  callTool: CallTool;
  sendFollowUpMessage: (args: { prompt: string }) => Promise<void>;
  openExternal(payload: { href: string }): void;

  // Layout controls
  requestDisplayMode: RequestDisplayMode;
  requestModal: (args: { title?: string; params?: UnknownObject }) => Promise<unknown>;
  requestClose: () => Promise<void>;
};

export type UnknownObject = Record<string, unknown>;

export type Theme = "light" | "dark";

export type SafeAreaInsets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type SafeArea = {
  insets: SafeAreaInsets;
};

export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";

export type UserAgent = {
  device: { type: DeviceType };
  capabilities: {
    hover: boolean;
    touch: boolean;
  };
};

/** Display mode */
export type DisplayMode = "pip" | "inline" | "fullscreen";
export type RequestDisplayMode = (args: { mode: DisplayMode }) => Promise<{
  /**
   * The granted display mode. The host may reject the request.
   * For mobile, PiP is always coerced to fullscreen.
   */
  mode: DisplayMode;
}>;

export type CallToolResponse = {
  result: string;
};

/** Calling APIs */
export type CallTool = (
  name: string,
  args: Record<string, unknown>
) => Promise<CallToolResponse>;

/** Extra events */
export const SET_GLOBALS_EVENT_TYPE = "openai:set_globals";
export class SetGlobalsEvent extends CustomEvent<{
  globals: Partial<OpenAiGlobals>;
}> {
  readonly type = SET_GLOBALS_EVENT_TYPE;
}

/**
 * Global oai object injected by the web sandbox for communicating with chatgpt host page.
 */
declare global {
  interface Window {
    openai: API & OpenAiGlobals;
  }

  interface WindowEventMap {
    [SET_GLOBALS_EVENT_TYPE]: SetGlobalsEvent;
  }
}
```

### `src/index.css`

This enables:

* Tailwind CSS
* OpenAI UI styling
* Scrollbar compatibility inside ChatGPT

```css
@import "tailwindcss";
@import "@openai/apps-sdk-ui/css";
@source "../node_modules/@openai/apps-sdk-ui";
@source ".";

@layer utilities {
  .overflow-auto > *,
  .overflow-scroll > *,
  .overflow-x-auto > *,
  .overflow-y-auto > * {
    scrollbar-color: auto;
  }

  /* Base style for scrollable elements */
  .overflow-auto,
  .overflow-scroll,
  .overflow-x-auto,
  .overflow-y-auto,
  .overflow-x-scroll,
  .overflow-y-scroll {
    scrollbar-color: rgb(0, 0, 0, 0.1) transparent;

    @media (prefers-color-scheme: dark) {
      scrollbar-color: rgb(255, 255, 255, 0.1) transparent;
    }
  }

  /* Hover state directly on the scrollable element */
  .overflow-auto:hover,
  .overflow-scroll:hover,
  .overflow-x-auto:hover,
  .overflow-y-auto:hover {
    scrollbar-color: rgb(0, 0, 0, 0.2) transparent;

    @media (prefers-color-scheme: dark) {
      scrollbar-color: rgb(255, 255, 255, 0.2) transparent;
    }
  }
}
```

### Hooks

* `use-max-height.ts`

```js
import { useOpenAiGlobal } from "./use-openai-global";

export const useMaxHeight = (): number | null => {
  return useOpenAiGlobal("maxHeight");
};

```

* `use-openai-global.ts`

```js
import { useSyncExternalStore } from "react";
import {
  SET_GLOBALS_EVENT_TYPE,
  SetGlobalsEvent,
  type OpenAiGlobals,
} from "../types";

export function useOpenAiGlobal<K extends keyof OpenAiGlobals>(
  key: K
): OpenAiGlobals[K] | null {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined") {
        return () => {};
      }

      const handleSetGlobal = (event: SetGlobalsEvent) => {
        const value = event.detail.globals[key];
        if (value === undefined) {
          return;
        }

        onChange();
      };

      window.addEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal, {
        passive: true,
      });

      return () => {
        window.removeEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal);
      };
    },
    () => window.openai?.[key] ?? null,
    () => window.openai?.[key] ?? null
  );
}
```

These hooks allow the widget to:

* Respect ChatGPT layout constraints
* React to global UI changes

---

## Create the Places Map UI Page

To add a new UI widget:

1. Create an HTML entry
2. Create a matching React page

### HTML entry point


`src/places-map/index.html`

```html
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Place Map</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/pages/places-map/main.tsx"></script>
  </body>
</html>
```

This is the file ChatGPT loads directly.

### React page logic

`src/pages/places-map/`

> You can repeat this structure to create **multiple ChatGPT widgets**.

---

## Build and Serve the UI

Install dependencies:

```
npm install
```

Run a local dev preview:

```
npm run dev
```

When ready, build for production:

```
npm run build
```

Serve the final output:

```
npm i -g serve
serve dist -p 5173
```

Verify in browser:

```
http://localhost:5173/places-map/
```

---

## Build the MCP Server (Python)

Now we connect ChatGPT → Tool → UI.

Create the MCP folder:

```
mkdir mcp_server
```

This server will:

* Expose a single tool: `find_places`
* Return structured data
* Attach a UI widget to the response

---

### Key MCP Concepts (Quick Explanation)

* **Tool** → callable function (`find_places`)
* **Widget** → UI rendered in ChatGPT
* **Resource** → HTML template for the widget
* **Structured Content** → JSON passed to the UI

---

### Run the MCP Server

Create and activate a virtual environment:

```
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Start the server:

```
uvicorn mcp_server.main:app --host 0.0.0.0 --port 2091
```

You should see:

```
Uvicorn running on http://0.0.0.0:2091
```

---

## Test with MCP Inspector

In a new terminal:

```
npx @modelcontextprotocol/inspector
```

Open the provided URL to:

* List tools
* Call `find_places`
* Inspect structured responses

---

## Connect MCP to ChatGPT

### Expose MCP via ngrok

```
ngrok http 2091
```

Copy the generated HTTPS URL.

---

### Create the ChatGPT App

1. Open **ChatGPT Settings**
2. Enable **Developer Mode**
3. Click **Create App**
4. Paste ngrok URL
5. Select **No Auth**
6. Save as Draft

Now, when you prompt:

> “Show me some hotels in New York”

🎉 ChatGPT will:

* Call your MCP tool
* Load your React UI
* Render the map inline

