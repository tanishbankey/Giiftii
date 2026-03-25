# Giiftii Gift Finder — Integration Guide

## How to Deploy the AI Gift Recommendation Engine on giiftii.com/gift-finder

---

## Overview

This document covers **every practical path** for integrating the Gift Finder recommendation system into Giiftii's existing website. Your site (giiftii.com) appears to be a JavaScript-based single-page application. The Gift Finder code we built is a **React component** that calls the Anthropic Claude API to generate 40 curated gift recommendations.

There are **two architectural decisions** to make:

1. **Where does the React component live?** (Frontend integration)
2. **Where does the Anthropic API call happen?** (Backend integration — critical for security)

---

## ⚠️ CRITICAL: API Key Security

The React artifact we built calls the Anthropic API **directly from the browser**. This works inside Claude.ai's sandbox because Claude injects the API key server-side. **On your production site, you must NEVER expose your Anthropic API key in client-side code.**

You need a **backend proxy** — a small server-side endpoint that:
- Receives the gift criteria from the frontend
- Adds your Anthropic API key server-side
- Forwards the request to `https://api.anthropic.com/v1/messages`
- Returns the response to the frontend

This is non-negotiable for production.

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│  BROWSER (giiftii.com/gift-finder)                       │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Gift Finder React Component                     │    │
│  │                                                  │    │
│  │  User inputs: Budget, Gender, Age, Context       │    │
│  │           │                                      │    │
│  │           ▼                                      │    │
│  │  POST /api/gift-recommendations                  │    │
│  │   { budget, gender, ageRange, context }          │    │
│  └──────────────┬───────────────────────────────────┘    │
│                 │                                         │
└─────────────────┼─────────────────────────────────────────┘
                  │  HTTPS
                  ▼
┌──────────────────────────────────────────────────────────┐
│  YOUR BACKEND (API Proxy)                                │
│                                                          │
│  Route: POST /api/gift-recommendations                   │
│                                                          │
│  1. Validate input                                       │
│  2. Build prompt with system instructions                │
│  3. Add ANTHROPIC_API_KEY from env variable              │
│  4. Call https://api.anthropic.com/v1/messages            │
│  5. Parse + validate JSON response                       │
│  6. Return 40 gift items to frontend                     │
│                                                          │
│  Environment: ANTHROPIC_API_KEY=sk-ant-...               │
└──────────────────────────────────────────────────────────┘
```

---

## Step 1: Set Up the Backend API Proxy

Choose one of these based on your tech stack.

### Option A: Node.js / Express (standalone or existing Node backend)

Create a file called `gift-api.js` (or add this route to your existing Express app):

```javascript
// gift-api.js
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: 'https://giiftii.com' }));
app.use(express.json());

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY; // Set in your environment

const SYSTEM_PROMPT = `You are Giiftii's Gift Recommendation Engine — a world-class professional gift shopper and lifestyle magazine gift editor combined with a data-driven product discovery system.

YOUR MISSION: Generate exactly 20 curated, highly specific gift recommendations based on the user's criteria.

RECOMMENDATION SIGNALS — Base every pick on real, current market signals:
• Viral or trending products on TikTok, Instagram, Pinterest (last 12 months priority)
• Best-selling items from major US retailers (Amazon, Target, Walmart, Nordstrom, Sephora, Best Buy, REI, etc.)
• Products frequently featured in gift guides (Wirecutter, GQ, Vogue, Oprah's Favorites, etc.)
• Items with strong reviews and social proof (4.5+ stars, thousands of reviews)
• Emerging lifestyle trends: wellness, productivity, cozy living, self-care, creator tools, AI gadgets, sustainability

STRICT RULES:
1. ALL items must fit within the stated budget. Be precise.
2. Show DIVERSITY across product categories unless user asks for specific types.
3. NO duplicate or near-duplicate items. Each recommendation must be distinct.
4. Every product must be a REAL, currently available product with an actual brand name.
5. Recommendations must be age-appropriate and gender-considerate.
6. Prioritize products that gained popularity in the last 12 months.
7. Think like a professional gift shopper.

EVALUATION STEP: After generating your initial list, evaluate each item as if you ARE the gift recipient. Remove anything generic, outdated, or undesirable. Replace with better picks.

OUTPUT FORMAT: Return ONLY a valid JSON array. No markdown, no backticks, no preamble.
Each object: { "rank", "productName", "brand", "category", "whyTrending", "whyGreatGift", "approxPrice" }
Keep whyTrending and whyGreatGift to ONE concise sentence each.`;

// Helper: Repair truncated JSON
function repairJSON(raw) {
  let s = raw.replace(/\`\`\`json|\`\`\`/g, '').trim();
  if (!s.startsWith('[')) s = '[' + s;
  try { return JSON.parse(s); } catch (e) { /* continue */ }

  const lastObj = s.lastIndexOf('}');
  if (lastObj === -1) throw new Error('No valid JSON objects found');
  let trimmed = s.substring(0, lastObj + 1).replace(/,\s*$/, '') + ']';
  try { return JSON.parse(trimmed); } catch (e) {
    // Extract individual objects
    const objects = [];
    let depth = 0, start = -1;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '{') { if (depth === 0) start = i; depth++; }
      else if (s[i] === '}') {
        depth--;
        if (depth === 0 && start >= 0) {
          try { objects.push(JSON.parse(s.substring(start, i + 1))); } catch {}
          start = -1;
        }
      }
    }
    if (objects.length > 0) return objects;
    throw new Error('Could not parse response');
  }
}

// Helper: Build retailer URLs
function buildRetailerURLs(productName, brand) {
  const q = encodeURIComponent(`${productName} ${brand}`);
  return [
    `https://www.amazon.com/s?k=${q}`,
    `https://www.target.com/s?searchTerm=${q}`,
    `https://www.google.com/search?tbm=shop&q=${q}`,
  ];
}

// Helper: Call Anthropic API for one batch
async function fetchBatch(prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errText.substring(0, 200)}`);
  }

  const data = await response.json();
  const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
  return repairJSON(text);
}

// Main endpoint
app.post('/api/gift-recommendations', async (req, res) => {
  try {
    const { budget, budgetLabel, gender, ageRange, context } = req.body;

    // Validate required fields
    if (!budget || !gender || !ageRange) {
      return res.status(400).json({ error: 'Missing required fields: budget, gender, ageRange' });
    }

    const criteria = `Gift criteria:
• Budget: ${budgetLabel || 'Under $' + budget} (max $${budget} per item)
• Recipient Gender: ${gender}
• Recipient Age: ${ageRange}
${context ? `• Additional Context: ${context}` : '• No additional context provided'}
• Country: United States of America`;

    // Batch 1: Items 1-20
    const batch1Prompt = `${criteria}\n\nGenerate gift recommendations ranked 1 to 20.\nReturn ONLY valid JSON array. No markdown.`;
    const batch1 = await fetchBatch(batch1Prompt);

    // Batch 2: Items 21-40
    const existingNames = batch1.map(i => i.productName).join(', ');
    const batch2Prompt = `${criteria}\n\nGenerate gift recommendations ranked 21 to 40.\nALREADY RECOMMENDED (do NOT repeat): ${existingNames}\nReturn ONLY valid JSON array. No markdown.`;
    const batch2 = await fetchBatch(batch2Prompt);

    // Combine, deduplicate, normalize
    const all = [...batch1, ...batch2];
    const seen = new Set();
    const deduped = [];
    for (const item of all) {
      const key = (item.productName || '').toLowerCase().trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    }

    const final = deduped.slice(0, 40).map((item, i) => ({
      rank: i + 1,
      productName: item.productName || 'Unknown Product',
      brand: item.brand || 'Various',
      category: item.category || 'General',
      whyTrending: item.whyTrending || '',
      whyGreatGift: item.whyGreatGift || '',
      approxPrice: typeof item.approxPrice === 'number' ? item.approxPrice : parseFloat(item.approxPrice) || 0,
      retailerSearchURLs: buildRetailerURLs(item.productName || '', item.brand || ''),
    }));

    res.json({ recommendations: final, count: final.length });

  } catch (err) {
    console.error('Gift recommendation error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Gift API running on port ${PORT}`));
```

**Deploy this with:**
```bash
npm install express cors
ANTHROPIC_API_KEY=sk-ant-your-key-here node gift-api.js
```

### Option B: Next.js API Route (if Giiftii uses Next.js)

Create `app/api/gift-recommendations/route.js`:

```javascript
// app/api/gift-recommendations/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  const { budget, budgetLabel, gender, ageRange, context } = await request.json();

  // ... same logic as Option A above ...
  // Use process.env.ANTHROPIC_API_KEY

  return NextResponse.json({ recommendations: final, count: final.length });
}
```

### Option C: Serverless (Vercel / AWS Lambda / Cloudflare Worker)

Same logic wrapped in a serverless function handler. The key point is the Anthropic API key stays server-side.

---

## Step 2: Modify the React Component for Production

The React component needs **one key change** — replace the direct Anthropic API call with a call to YOUR backend proxy.

In the `fetchBatch` function inside the component, change:

```javascript
// ❌ BEFORE (calls Anthropic directly — insecure for production)
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: batchPrompt }],
  }),
});
```

```javascript
// ✅ AFTER (calls your secure backend proxy)
const response = await fetch("/api/gift-recommendations", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    budget,
    budgetLabel: BUDGET_OPTIONS.find((b) => b.value === budget)?.label,
    gender,
    ageRange,
    context,
  }),
});
```

With this change, the frontend sends the user's criteria to your server, which handles the Anthropic API call securely and returns the 40 recommendations.

---

## Step 3: Embed the Component on giiftii.com/gift-finder

### If Giiftii is a React / Next.js App

1. Copy the Gift Finder component file into your components directory
2. Import and use it on your gift-finder page:

```jsx
// pages/gift-finder.js (or app/gift-finder/page.jsx)
import GiiftiiGiftFinder from '../components/GiiftiiGiftFinder';

export default function GiftFinderPage() {
  return <GiiftiiGiftFinder />;
}
```

### If Giiftii is NOT a React App (vanilla JS, WordPress, etc.)

Convert the component to a **standalone HTML/JS widget** that can be embedded via an `<iframe>` or script tag.

**Option 1: iframe embed**

Host the Gift Finder as a standalone page (e.g., `gift-finder-app.giiftii.com`) and embed it:

```html
<!-- On giiftii.com/gift-finder -->
<iframe
  src="https://gift-finder-app.giiftii.com"
  style="width: 100%; min-height: 800px; border: none;"
  title="Giiftii Gift Finder"
></iframe>
```

**Option 2: Script embed**

Build the React component into a standalone JS bundle and mount it:

```html
<!-- On giiftii.com/gift-finder -->
<div id="giiftii-gift-finder-root"></div>
<script src="https://your-cdn.com/gift-finder-bundle.js"></script>
```

To create the bundle:
```bash
# In a new project directory
npx create-react-app gift-finder --template minimal
# Copy the component in, then:
npm run build
# Deploy the build/static/js/*.js file to your CDN
```

---

## Step 4: Environment & API Key Setup

### Get Your Anthropic API Key

1. Go to https://console.anthropic.com
2. Create an account or sign in
3. Navigate to API Keys
4. Create a new key
5. Store it as an environment variable — **never in code**

### Set the Environment Variable

```bash
# Linux / macOS
export ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxx

# In .env file (for Node.js with dotenv)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxx

# Vercel
vercel env add ANTHROPIC_API_KEY

# AWS Lambda
aws lambda update-function-configuration \
  --function-name gift-recommendations \
  --environment "Variables={ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxx}"
```

---

## Step 5: Production Hardening

### Rate Limiting

Protect against abuse — each request makes 2 Anthropic API calls (2 batches of 20):

```javascript
// Add to your Express backend
const rateLimit = require('express-rate-limit');

const giftLimiter = rateLimit({
  windowMs: 60 * 1000,      // 1 minute
  max: 5,                    // 5 requests per minute per IP
  message: { error: 'Too many requests. Please wait a moment.' },
});

app.use('/api/gift-recommendations', giftLimiter);
```

### Input Validation

```javascript
// Validate budget is a known value
const VALID_BUDGETS = [25, 50, 75, 100, 150, 200, 300, 500, 1000];
if (!VALID_BUDGETS.includes(Number(budget))) {
  return res.status(400).json({ error: 'Invalid budget value' });
}

// Sanitize free text (limit length, strip HTML)
const safeContext = (context || '').substring(0, 1000).replace(/<[^>]*>/g, '');
```

### Caching (Optional but Recommended)

Cache responses for identical criteria to save API costs:

```javascript
const crypto = require('crypto');
const cache = new Map(); // Use Redis in production

function getCacheKey(params) {
  return crypto.createHash('md5').update(JSON.stringify(params)).digest('hex');
}

app.post('/api/gift-recommendations', async (req, res) => {
  const key = getCacheKey({ budget, gender, ageRange, context });

  if (cache.has(key)) {
    return res.json(cache.get(key));
  }

  // ... generate recommendations ...

  cache.set(key, result);
  setTimeout(() => cache.delete(key), 3600000); // Expire after 1 hour
});
```

### Error Handling

The frontend already has retry logic built in. On the backend, add:

```javascript
// Retry wrapper for Anthropic API calls
async function fetchBatchWithRetry(prompt, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchBatch(prompt);
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
}
```

---

## Cost Estimate

Each gift recommendation request makes **2 API calls** (batch 1 + batch 2):

| Component | Tokens (approx) |
|-----------|-----------------|
| System prompt (input) | ~500 tokens × 2 calls |
| User prompt (input) | ~200 tokens × 2 calls |
| Response (output) | ~4,000 tokens × 2 calls |
| **Total per request** | **~9,400 tokens** |

At Claude Sonnet pricing, each full recommendation (40 gifts) costs approximately **$0.04–$0.08 USD**. With caching, repeated identical queries cost nothing.

---

## Deployment Checklist

- [ ] Anthropic API key obtained and stored as environment variable
- [ ] Backend proxy deployed (Node.js, Next.js API route, or serverless)
- [ ] Frontend component updated to call your proxy (not Anthropic directly)
- [ ] CORS configured to only allow `https://giiftii.com`
- [ ] Rate limiting enabled (recommend 5 req/min per IP)
- [ ] Input validation and sanitization in place
- [ ] Error handling and retry logic tested
- [ ] SSL/HTTPS enforced on all endpoints
- [ ] Response caching implemented (optional but recommended)
- [ ] Load tested with concurrent users
- [ ] Mobile responsiveness verified (card view auto-activates < 768px)
- [ ] Analytics/logging added to track usage

---

## File Summary

| File | Purpose | Where It Goes |
|------|---------|---------------|
| `giiftii-gift-finder.jsx` | Frontend React component | Your frontend codebase |
| `gift-api.js` | Backend API proxy | Your server / serverless function |
| `.env` | API key storage | Server environment (never committed to git) |

---

## Questions for Your Dev Team

Before integration, your developers should decide:

1. **What is Giiftii's current tech stack?** (React? Next.js? Vue? Plain HTML/JS?)
2. **Where is the backend hosted?** (Vercel? AWS? Heroku? Custom server?)
3. **Do you want caching?** (Saves money but returns same results for identical queries)
4. **Do you want to add web search** to the Anthropic API call for real-time trending data? (Costs slightly more per query but gives fresher results)
5. **Do you want to track analytics** on what demographics are searching most?

The component is designed to work with any frontend framework — the only firm requirement is the secure backend proxy for the API key.
