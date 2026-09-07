# Farm2Home 🌾🏡

**Farm2Home** is an intelligent direct-to-consumer agricultural product delivery platform connecting local farmers directly with consumers and local delivery partners. It eliminates middlemen markups, ensures harvest freshness, provides secure OTP-verified deliveries, and offers AI-powered agronomy guidance.

---

## 🚀 Key Roles & Core Workflows

1. **🧑‍🌾 Farmer View**:
   - Add, edit, and manage crop listings with live stock, pricing, harvest dates, and organic certification badges.
   - Accept or reject incoming customer orders (rejecting an order automatically restores inventory).
   - View intelligent demand analytics: Revenue, Average Order Value (AOV), crop volume distributions, mean/median/mode calculations, and seasonal planting recommendations.

2. **🛒 Customer Marketplace**:
   - Browse fresh farm produce with category filtering (Vegetables, Fruits, Grains, Leafy Greens, Dairy).
   - Real-time stock caps, "Out of Stock" badges, and low-inventory alerts.
   - Atomic checkout validating live inventory before order creation to prevent overselling.
   - Live order tracking with secret 6-digit Delivery OTPs.

3. **🚚 Delivery Partner Portal**:
   - Claim available farm pickup jobs.
   - Route and delivery status updates (`accepted` → `out_for_delivery` → `delivered`).
   - Secure delivery completion requiring the customer's 6-digit OTP.

4. **🤖 Farm2Home AI Specialist**:
   - Multilingual agricultural and nutrition advisor (English, Telugu, Hindi, Tamil).
   - Guides farmers on crop disease diagnosis, organic pest control, soil health (NPK ratios), and harvest timing.
   - Provides nutrition, storage advice, and perishable goods logistics guidance.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS v4, Lucide React icons, Motion animations.
- **Backend**: Express 4 server with Vite middleware integration (`server.ts`).
- **AI Integration**: `@google/genai` TypeScript SDK (using `gemini-3.8-flash`).
- **Data Persistence**: File-backed JSON database (`/data/farm2home.json`) pre-seeded with sample profiles, crops, orders, and reviews.

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` or configure secrets in Google AI Studio:

| Variable | Description | Default / Required |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini API key for AI Assistant capabilities. | Optional (App operates with graceful fallback if omitted). |
| `PORT` | Server port (hardcoded to `3000` in AI Studio container). | `3000` |

> **Note on AI Assistant**: If `GEMINI_API_KEY` is not attached, the AI Assistant provides a helpful in-app fallback message guiding the user to configure their key in Settings > Secrets. The core marketplace, orders, delivery, and analytics continue to function normally.

---

## 📦 Getting Started

### In Google AI Studio Build (Recommended)
1. Import or open the project in AI Studio Build.
2. The platform automatically installs dependencies and starts the development server on port 3000 via `npm run dev`.
3. Configure `GEMINI_API_KEY` under **Settings > Secrets**.

### Local Development / Standalone
```bash
# 1. Install dependencies
npm install

# 2. Run the development server (boots backend + frontend with Vite middleware)
npm run dev

# 3. Open browser at http://localhost:3000
```

### Production Build & Run
```bash
# Build client static assets and bundle server into dist/server.cjs
npm run build

# Start production server
npm start
```

---

## 📁 Project Directory Structure

```
├── .env.example          # Environment variable template
├── .gitignore            # Git exclusion rules
├── data/
│   └── farm2home.json    # Durable local database with pre-seeded data
├── index.html            # Application entry HTML with synced metadata
├── metadata.json         # AI Studio app metadata & permissions
├── package.json          # Dependencies and scripts (React 19, Express, @google/genai)
├── server.ts             # Express API backend + Vite middleware integration
├── src/
│   ├── App.tsx           # Primary application container and role coordinator
│   ├── index.css         # Global stylesheet with Tailwind CSS v4
│   ├── main.tsx          # React application root entry point
│   ├── types.ts          # Shared TypeScript models (Profiles, Products, Orders, etc.)
│   ├── components/
│   │   ├── AiAssistantWidget.tsx   # Multilingual Gemini AI assistant
│   │   ├── CartDrawer.tsx          # Sliding cart drawer with atomic stock validation
│   │   ├── CustomerView.tsx        # Customer marketplace, wishlist, & order tracking
│   │   ├── DeliveryView.tsx        # Delivery partner job portal & OTP verification
│   │   ├── FarmerView.tsx          # Crop management, order actions, & demand analytics
│   │   ├── Header.tsx              # Navigation bar, role switch, and quick stats
│   │   ├── RoleSelectionModal.tsx  # Interactive persona switcher
│   │   └── WeatherWidget.tsx       # 7-day agricultural weather forecast
│   └── lib/
│       ├── api.ts                  # Typed client-side API layer
│       └── translations.ts         # Multilingual UI dictionary (en, te, hi, ta)
├── tsconfig.json         # TypeScript compiler configuration
└── vite.config.ts        # Vite build tool configuration
```

---

## 🔄 Account Migration Steps

When transferring this project to another Google account:

1. **Export**: In AI Studio, open **Settings** and select **Export to GitHub** or **Download ZIP**.
2. **Import**: Sign into your destination Google account, open [Google AI Studio Build](https://ai.studio/build), and choose **Import Repository** or upload the ZIP.
3. **Configure Secrets**:
   - Go to **Settings > Secrets**.
   - Add `GEMINI_API_KEY` with an active Gemini API key generated in the new account at [Google AI Studio API Keys](https://aistudio.google.com/app/apikey).
4. **Launch & Verify**:
   - The container dev server will automatically run `npm run dev` on port 3000.
   - Switch between **Customer**, **Farmer**, and **Delivery Partner** personas to confirm seamless order placement, stock management, and delivery verification.
