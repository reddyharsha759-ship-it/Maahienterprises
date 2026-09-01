# 🌿 MAAHI COCOPEAT AND COIR PRODUCTS

[![License: ISC](https://img.shields.io/badge/License-ISC-green.svg)](https://opensource.org/licenses/ISC)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Razorpay](https://img.shields.io/badge/Payments-Razorpay-02042B?logo=razorpay&logoColor=3395FF)](https://razorpay.com)
[![Resend](https://img.shields.io/badge/Email-Resend-black?logo=resend&logoColor=white)](https://resend.com)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5/CSS3](https://img.shields.io/badge/UI-Vanilla%20HTML5%20%2F%20CSS3-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org)

> **Premium organic growing media and sustainable coir solutions for agriculture, commercial horticulture, and home gardening.**

---

## 📌 Overview

**MAAHI COCOPEAT AND COIR PRODUCTS** (Maahi Enterprises) is a modern full-stack e-commerce web platform for eco-friendly agricultural substrates and cocopeat products. Engineered with clean vanilla JavaScript, HTML5, and CSS3 on the client, backed by **Supabase** (PostgreSQL, Auth, Edge Functions) and integrated with **Razorpay** for online payment processing and **Resend** for transactional email pipelines.

---

## ✨ Features

### 🛍️ Customer Storefront (`index.html`)
- **Product Catalog**: High-grade cocopeat blocks (5 kg, 650 g), coco chips, coco coins/discs, grow bags, open-top grow bags, and customized substrate mixes.
- **Interactive Shopping Cart**: Client-side cart drawer with real-time quantity adjustments, persistent storage, and automatic price calculations.
- **Seamless Checkout**: Direct order placement with Razorpay integration and instant confirmation.
- **SEO & Social Sharing Ready**: Rich OpenGraph meta tags, Twitter cards, and Schema.org JSON-LD structured data for search engine visibility.
- **Responsive Design**: Fast loading, mobile-first design with smooth drawers and accessible navigation.

### 🔐 Authentication & User Accounts (`login.html`)
- **Google OAuth**: Fast single-click sign-in powered by Supabase Auth.
- **Email & Password**: Registration, sign-in, and password reset flows with client-side validation.
- **Order History**: User profile drawer to review past purchases and delivery statuses.

### 📊 Owner & Admin Dashboard (`/owner/dashboard.html`)
- **Real-Time Analytics**: Revenue metrics, order volumes, average order value, and product performance charts.
- **Order Management**: View detailed customer info, shipping addresses, ordered items, payment verification, and fulfill/update order statuses.
- **Catalog & Inventory Control**: Update product pricing, descriptions, stock availability, and SKUs.
- **Export & Search**: Search filters by customer, order ID, status, and export capabilities.

### ⚡ Serverless Edge Functions & Email Delivery (`supabase/`)
- **Automated Order Confirmations**: Deno TypeScript Edge Function (`send-order-email`) triggered via Supabase Database Webhooks on new orders.
- **Resend API Integration**: Sends responsive, branded HTML receipts to customers upon order completion with built-in idempotency protection.

---

## 🏗️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Vanilla JavaScript (ES6+), HTML5, CSS3 (Modern Flexbox & CSS Grid, Custom Properties) |
| **Backend & Database** | [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Real-Time Subscriptions) |
| **Serverless Functions** | Supabase Edge Functions (Deno / TypeScript) |
| **Authentication** | Supabase Auth (Google OAuth 2.0 & Email/Password) |
| **Payment Gateway** | [Razorpay](https://razorpay.com/) Payment Gateway |
| **Transactional Email** | [Resend](https://resend.com/) REST API |
| **Dev Server** | Node.js native HTTP server (`server.js`) |
| **Performance & SEO** | Vercel Speed Insights, Schema.org JSON-LD, Sitemap & Robots.txt |

---

## 📁 Project Structure

```text
├── index.html            # Main e-commerce storefront & landing page
├── styles.css            # Global stylesheet & design system
├── main.js               # Storefront logic, cart drawer, catalog & checkout
├── login.html            # Customer login & authentication portal
├── login.css             # Authentication UI styles
├── login.js              # Supabase Auth handling (OAuth + Email/Password)
├── config.js             # Client configuration (Supabase & Razorpay keys)
├── server.js             # Lightweight Node.js local development server
├── privacy.html          # Privacy Policy
├── terms.html            # Terms of Service
├── sitemap.xml           # Search engine sitemap
├── robots.txt            # Web crawler indexing directives
├── package.json          # Project metadata & npm scripts
│
├── owner/                # Business Management & Admin Dashboard
│   ├── dashboard.html    # Admin portal interface
│   ├── dashboard.css     # Admin dashboard styles
│   ├── dashboard.js      # Dashboard analytics, order manager & product controls
│   └── login_bg.png      # Assets
│
└── supabase/             # Supabase backend & edge functions
    ├── schema.sql        # Database tables, indexes, RLS policies, audit logs
    ├── .env.example      # Backend environment variable template
    ├── README.md         # Supabase setup & deployment instructions
    └── functions/
        └── send-order-email/
            └── index.ts  # Edge Function for order confirmation emails
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16.0.0 or newer)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional, for deploying database schema & edge functions)
- A [Supabase](https://supabase.com/) project
- A [Razorpay](https://razorpay.com/) account (for test/live payments)
- A [Resend](https://resend.com/) account (for order confirmation emails)

---

### Installation & Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/reddyharsha759-ship-it/Maahienterprises.git
   cd Maahienterprises
   ```

2. **Install optional dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment / Client Keys**:
   Edit `config.js` with your credentials:
   ```javascript
   window.MAAHI_CONFIG = {
     supabaseUrl: "https://<your-project-ref>.supabase.co",
     supabaseAnonKey: "<your-supabase-anon-key>",
     useRealGoogleOAuth: true,
     razorpayKeyId: "<your-razorpay-key-id>",
     
     // Owner credentials
     adminEmail: "your-admin-email@example.com",
     adminPassword: "your-admin-password"
   };
   ```

4. **Start the local server**:
   ```bash
   node server.js
   ```
   Open your browser and navigate to:
   ```text
   http://localhost:8080/
   ```

---

## ⚙️ Backend & Supabase Configuration

### 1. Database Migration
1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **SQL Editor** &rarr; **New Query**.
3. Paste and run the SQL code from [`supabase/schema.sql`](supabase/schema.sql).

### 2. Edge Function Secrets
Set your production environment secrets using Supabase CLI:
```bash
npx supabase secrets set RESEND_API_KEY="re_your_api_key"
npx supabase secrets set RESEND_FROM_EMAIL="MAAHI PRODUCTS <orders@yourverifieddomain.com>"
npx supabase secrets set WEBHOOK_SECRET="your_webhook_secret_key"
```

### 3. Deploy Edge Function
```bash
npx supabase functions deploy send-order-email --no-verify-jwt
```

### 4. Create Database Webhook
In the Supabase Dashboard under **Database** &rarr; **Webhooks**:
- **Table**: `public.orders`
- **Events**: `INSERT`
- **Target**: Supabase Edge Function (`send-order-email`)
- **HTTP Header**: `x-webhook-secret` matching your `WEBHOOK_SECRET`

*(Detailed step-by-step instructions are available in [`supabase/README.md`](supabase/README.md).)*

---

## 🏢 Business & Contact Information

**MAAHI COCOPEAT AND COIR PRODUCTS (Maahi Enterprises)**  
📍 **Address**: Plot No. 12, Senthilkumar S, Sri Venkateshwara Layout, Sri Ganesh Industries, Bommandapalli, Hosur, Krishnagiri, Tamil Nadu - 635109, India  
📞 **Phone**: +91 94432 16468  
✉️ **Email**: Maahienterprises6468@gmail.com  
🌐 **Website**: [https://www.maahienterprises.in/](https://www.maahienterprises.in/)

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
