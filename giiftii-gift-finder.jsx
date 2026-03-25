import { useState, useEffect, useRef } from "react";

const SYSTEM_PROMPT = `You are Giiftii's Gift Recommendation Engine — a world-class professional gift shopper and lifestyle magazine gift editor combined with a data-driven product discovery system.

YOUR MISSION: Generate exactly 40 curated, highly specific gift recommendations based on the user's criteria.

RECOMMENDATION SIGNALS — Base every pick on real, current market signals:
• Viral or trending products on TikTok, Instagram, Pinterest (last 12 months priority)
• Best-selling items from major US retailers (Amazon, Target, Walmart, Nordstrom, Sephora, Best Buy, REI, etc.)
• Products frequently featured in gift guides (Wirecutter, GQ, Vogue, Oprah's Favorites, etc.)
• Items with strong reviews and social proof (4.5+ stars, thousands of reviews)
• Emerging lifestyle trends: wellness, productivity, cozy living, self-care, creator tools, AI gadgets, sustainability

STRICT RULES:
1. ALL 40 items must fit within the stated budget (Approx Price ≤ budget). Be precise — if budget is $50, no item should exceed $50.
2. Show DIVERSITY across product categories. Unless the user asks for a specific type, spread across: Tech/Gadgets, Fashion/Accessories, Beauty/Skincare, Home/Kitchen, Food/Beverage, Books/Media, Experiences, Sports/Outdoors, Wellness/Self-Care, Stationery/Desk, Games/Toys, Subscription Services, etc.
3. NO duplicate or near-duplicate items. Each recommendation must be distinct.
4. Every product must be a REAL, currently available product with an actual brand name. No generic or made-up items.
5. Recommendations must be age-appropriate and gender-considerate for the recipient.
6. Prioritize products that gained popularity in the last 12 months.
7. Think like a professional gift shopper — these should be items that delight, surprise, and feel thoughtful.

EVALUATION STEP: After generating your initial list, evaluate each item as if you ARE the gift recipient (same age, gender, preferences). Ask: "Would I actually want this?" Remove anything that feels generic, outdated, or undesirable. Replace with better picks.

OUTPUT FORMAT: Return ONLY a valid JSON array of exactly 40 objects. No markdown, no backticks, no preamble. Each object must have these exact keys:
{
  "rank": number (1-40),
  "productName": "string — specific product name",
  "brand": "string — actual brand name",
  "category": "string — product category",
  "whyTrending": "string — 1-2 sentences on trending signals",
  "whyGreatGift": "string — 1-2 sentences on gift appeal",
  "approxPrice": number (USD, no dollar sign),
  "retailerSearchURLs": ["url1", "url2", "url3"]
}

For retailerSearchURLs, generate 3 search URLs using this pattern:
- Amazon: https://www.amazon.com/s?k={encoded product name + brand}
- Target: https://www.target.com/s?searchTerm={encoded product name + brand}
- Google Shopping: https://www.google.com/search?tbm=shop&q={encoded product name + brand}

Remember: Return ONLY the raw JSON array. Nothing else.`;

// ─── Theme & Constants ───
const COLORS = {
  bg: "#FAFAF7",
  card: "#FFFFFF",
  accent: "#D4583A",
  accentHover: "#BF4A2F",
  accentSoft: "#FFF0EC",
  text: "#1A1A1A",
  textMuted: "#6B6B6B",
  textLight: "#9A9A9A",
  border: "#E8E5E0",
  borderHover: "#D4D0C8",
  success: "#2D8A56",
  successBg: "#EEFBF3",
  tagBg: "#F5F3EF",
  inputBg: "#FFFFFF",
  shadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)",
  shadowHover: "0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.05)",
  shadowLg: "0 4px 16px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.06)",
};

const FONT = `'DM Sans', 'Helvetica Neue', sans-serif`;
const FONT_DISPLAY = `'Playfair Display', 'Georgia', serif`;

const AGE_RANGES = [
  "0–2 (Baby)", "3–5 (Toddler)", "6–9 (Child)", "10–12 (Tween)",
  "13–17 (Teen)", "18–24 (Young Adult)", "25–34", "35–44",
  "45–54", "55–64", "65–74", "75+"
];

const BUDGET_OPTIONS = [
  { label: "Under $25", value: 25 },
  { label: "Under $50", value: 50 },
  { label: "Under $75", value: 75 },
  { label: "Under $100", value: 100 },
  { label: "Under $150", value: 150 },
  { label: "Under $200", value: 200 },
  { label: "Under $300", value: 300 },
  { label: "Under $500", value: 500 },
  { label: "$500+", value: 1000 },
];

// ─── Styles ───
const styles = {
  global: {
    fontFamily: FONT,
    color: COLORS.text,
    background: COLORS.bg,
    minHeight: "100vh",
    WebkitFontSmoothing: "antialiased",
  },
  header: {
    textAlign: "center",
    padding: "48px 24px 20px",
    borderBottom: `1px solid ${COLORS.border}`,
    background: COLORS.card,
  },
  logoMark: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: COLORS.accent,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: 18,
  },
  logoText: {
    fontFamily: FONT_DISPLAY,
    fontSize: 28,
    fontWeight: 700,
    color: COLORS.text,
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    marginTop: 6,
    fontWeight: 400,
    letterSpacing: "0.2px",
  },
  formWrap: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "36px 24px 48px",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "1.2px",
    color: COLORS.textMuted,
    marginBottom: 14,
  },
  row: {
    display: "flex",
    gap: 16,
    marginBottom: 28,
    flexWrap: "wrap",
  },
  fieldGroup: {
    flex: 1,
    minWidth: 180,
  },
  fieldLabel: {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: COLORS.text,
    marginBottom: 8,
  },
  select: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 14,
    fontFamily: FONT,
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: 10,
    background: COLORS.inputBg,
    color: COLORS.text,
    outline: "none",
    cursor: "pointer",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%236B6B6B' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 14px center",
    transition: "border-color 0.2s",
  },
  textarea: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 14,
    fontFamily: FONT,
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: 10,
    background: COLORS.inputBg,
    color: COLORS.text,
    outline: "none",
    resize: "vertical",
    minHeight: 90,
    lineHeight: 1.6,
    transition: "border-color 0.2s",
    boxSizing: "border-box",
  },
  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: (active) => ({
    padding: "9px 18px",
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    fontFamily: FONT,
    border: `1.5px solid ${active ? COLORS.accent : COLORS.border}`,
    borderRadius: 50,
    background: active ? COLORS.accentSoft : COLORS.card,
    color: active ? COLORS.accent : COLORS.text,
    cursor: "pointer",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
  }),
  button: (disabled) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    padding: "16px 24px",
    fontSize: 15,
    fontWeight: 600,
    fontFamily: FONT,
    letterSpacing: "0.3px",
    border: "none",
    borderRadius: 12,
    background: disabled ? COLORS.borderHover : COLORS.accent,
    color: "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    transition: "all 0.25s",
    marginTop: 8,
    boxShadow: disabled ? "none" : `0 2px 8px ${COLORS.accent}44`,
  }),
  // Results
  resultsWrap: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "32px 20px 60px",
  },
  resultsMeta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  resultsTitle: {
    fontFamily: FONT_DISPLAY,
    fontSize: 24,
    fontWeight: 700,
    color: COLORS.text,
  },
  tag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 500,
    background: COLORS.tagBg,
    borderRadius: 6,
    color: COLORS.textMuted,
  },
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 500,
    fontFamily: FONT,
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: 8,
    background: COLORS.card,
    color: COLORS.text,
    cursor: "pointer",
    marginBottom: 20,
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    background: COLORS.card,
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: COLORS.shadow,
  },
  th: {
    textAlign: "left",
    padding: "14px 16px",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    color: COLORS.textMuted,
    background: COLORS.tagBg,
    borderBottom: `1.5px solid ${COLORS.border}`,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "14px 16px",
    fontSize: 13,
    lineHeight: 1.55,
    borderBottom: `1px solid ${COLORS.border}`,
    verticalAlign: "top",
    color: COLORS.text,
  },
  rankCell: {
    fontWeight: 700,
    fontSize: 14,
    color: COLORS.accent,
    width: 44,
    textAlign: "center",
  },
  priceCell: {
    fontWeight: 600,
    whiteSpace: "nowrap",
    color: COLORS.success,
  },
  linkPill: {
    display: "inline-block",
    padding: "4px 10px",
    fontSize: 11,
    fontWeight: 500,
    background: COLORS.accentSoft,
    color: COLORS.accent,
    borderRadius: 5,
    textDecoration: "none",
    marginRight: 5,
    marginBottom: 4,
    whiteSpace: "nowrap",
    transition: "background 0.15s",
  },
  brandCell: {
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  catTag: {
    display: "inline-block",
    padding: "3px 9px",
    fontSize: 11,
    fontWeight: 500,
    background: COLORS.tagBg,
    borderRadius: 5,
    whiteSpace: "nowrap",
  },
  // Loading
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 400,
    gap: 24,
    padding: 40,
  },
  spinner: {
    width: 48,
    height: 48,
    border: `3px solid ${COLORS.border}`,
    borderTopColor: COLORS.accent,
    borderRadius: "50%",
    animation: "giiftii-spin 0.8s linear infinite",
  },
  progressBar: {
    width: 300,
    height: 6,
    borderRadius: 3,
    background: COLORS.border,
    overflow: "hidden",
  },
  progressFill: (pct) => ({
    width: `${pct}%`,
    height: "100%",
    background: `linear-gradient(90deg, ${COLORS.accent}, #E8845C)`,
    borderRadius: 3,
    transition: "width 0.6s ease",
  }),
  errorBox: {
    maxWidth: 560,
    margin: "60px auto",
    padding: 32,
    textAlign: "center",
    background: COLORS.card,
    borderRadius: 14,
    boxShadow: COLORS.shadow,
  },
  // Card view for mobile
  cardView: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  itemCard: {
    background: COLORS.card,
    borderRadius: 14,
    padding: "18px 20px",
    boxShadow: COLORS.shadow,
    transition: "box-shadow 0.2s",
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  cardRank: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: COLORS.accentSoft,
    color: COLORS.accent,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 14,
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 600,
    lineHeight: 1.35,
    color: COLORS.text,
  },
  cardBrand: {
    fontSize: 12,
    fontWeight: 500,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: 700,
    color: COLORS.success,
    marginLeft: "auto",
    flexShrink: 0,
  },
  cardSection: {
    fontSize: 12,
    lineHeight: 1.55,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  cardSectionLabel: {
    fontWeight: 600,
    color: COLORS.text,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: 3,
  },
};

// ─── Loading Messages ───
const LOADING_MESSAGES = [
  "Scanning trending products across TikTok, Instagram & Pinterest...",
  "Analyzing best-sellers from major retailers...",
  "Cross-referencing gift guides from Wirecutter, GQ & Vogue...",
  "Checking social proof and review scores...",
  "Matching products to recipient demographics...",
  "Evaluating desirability from recipient's perspective...",
  "Curating final selection of 40 gifts...",
  "Generating retailer search links...",
];

// ─── Gender Selector ───
function GenderSelector({ value, onChange }) {
  const options = [
    { label: "Male", icon: "♂" },
    { label: "Female", icon: "♀" },
    { label: "Non-binary", icon: "⚧" },
    { label: "Prefer not to say", icon: "—" },
  ];
  return (
    <div style={styles.chipRow}>
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          style={styles.chip(value === o.label)}
          onClick={() => onChange(o.label)}
          onMouseEnter={(e) => {
            if (value !== o.label) e.currentTarget.style.borderColor = COLORS.borderHover;
          }}
          onMouseLeave={(e) => {
            if (value !== o.label) e.currentTarget.style.borderColor = COLORS.border;
          }}
        >
          <span style={{ marginRight: 4 }}>{o.icon}</span> {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main App ───
export default function GiiftiiGiftFinder() {
  const [budget, setBudget] = useState(null);
  const [gender, setGender] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [context, setContext] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // table or cards
  const resultsRef = useRef(null);

  const canSubmit = budget && gender && ageRange && !loading;

  // Cycle loading messages
  useEffect(() => {
    if (!loading) return;
    const iv = setInterval(() => {
      setLoadingMsg((p) => (p + 1) % LOADING_MESSAGES.length);
    }, 4000);
    return () => clearInterval(iv);
  }, [loading]);

  // Animate progress
  useEffect(() => {
    if (!loading) { setProgress(0); return; }
    const iv = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 6 + 1, 92));
    }, 800);
    return () => clearInterval(iv);
  }, [loading]);

  // Scroll to results
  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [results]);

  // ─── Helper: Build search URLs client-side to save tokens ───
  function buildRetailerURLs(productName, brand) {
    const q = encodeURIComponent(`${productName} ${brand}`);
    return [
      `https://www.amazon.com/s?k=${q}`,
      `https://www.target.com/s?searchTerm=${q}`,
      `https://www.google.com/search?tbm=shop&q=${q}`,
    ];
  }

  // ─── Helper: Repair truncated JSON ───
  function repairJSON(raw) {
    let s = raw.replace(/```json|```/g, "").trim();
    // If it doesn't start with '[', wrap it
    if (!s.startsWith("[")) s = "[" + s;

    // Try direct parse first
    try { return JSON.parse(s); } catch (e) { /* continue to repair */ }

    // Find the last complete object by finding the last '}' followed by possible comma/whitespace
    const lastCompleteObj = s.lastIndexOf("}");
    if (lastCompleteObj === -1) throw new Error("No valid JSON objects found in response");

    // Take everything up to and including that last '}'
    let trimmed = s.substring(0, lastCompleteObj + 1);

    // Remove any trailing comma
    trimmed = trimmed.replace(/,\s*$/, "");

    // Close the array
    if (!trimmed.endsWith("]")) trimmed += "]";

    try { return JSON.parse(trimmed); } catch (e) {
      // More aggressive: find all complete {...} blocks via matching
      const objects = [];
      let depth = 0, start = -1;
      for (let i = 0; i < s.length; i++) {
        if (s[i] === "{") { if (depth === 0) start = i; depth++; }
        else if (s[i] === "}") {
          depth--;
          if (depth === 0 && start >= 0) {
            try {
              objects.push(JSON.parse(s.substring(start, i + 1)));
            } catch (e2) { /* skip malformed object */ }
            start = -1;
          }
        }
      }
      if (objects.length > 0) return objects;
      throw new Error("Could not parse gift recommendations. Please try again.");
    }
  }

  // ─── Helper: Single API batch call ───
  async function fetchBatch(batchPrompt) {
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

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(`API returned ${response.status}: ${errBody.substring(0, 200)}`);
    }

    const data = await response.json();

    // Check for stop reason
    const stopReason = data.stop_reason;
    const text = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    return { text, stopReason };
  }

  // ─── Main submit handler ───
  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setResults(null);
    setLoadingMsg(0);
    setProgress(0);

    const budgetLabel = BUDGET_OPTIONS.find((b) => b.value === budget)?.label || `$${budget}`;
    const criteriaBlock = `Gift criteria:
• Budget: ${budgetLabel} (max $${budget} per item)
• Recipient Gender: ${gender}
• Recipient Age: ${ageRange}
${context ? `• Additional Context: ${context}` : "• No additional context provided"}
• Country: United States of America`;

    const MAX_RETRIES = 2;
    let allItems = [];

    try {
      // ─── BATCH 1: Items 1–20 ───
      setLoadingMsg(0);
      const batch1Prompt = `${criteriaBlock}

Generate gift recommendations ranked 1 to 20 (the first half of 40 total).

IMPORTANT — to save tokens, do NOT include retailerSearchURLs. I will generate those myself. Return each object with these keys only:
{ "rank", "productName", "brand", "category", "whyTrending", "whyGreatGift", "approxPrice" }

Keep whyTrending and whyGreatGift to ONE concise sentence each.

Return ONLY valid JSON array. No markdown, no backticks, no explanation.`;

      let batch1Items = [];
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const { text } = await fetchBatch(batch1Prompt);
          batch1Items = repairJSON(text);
          if (Array.isArray(batch1Items) && batch1Items.length > 0) break;
        } catch (e) {
          if (attempt === MAX_RETRIES) throw e;
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      setProgress(45);
      setLoadingMsg(4);

      // ─── BATCH 2: Items 21–40 ───
      const existingNames = batch1Items.map((i) => i.productName).join(", ");
      const batch2Prompt = `${criteriaBlock}

Generate gift recommendations ranked 21 to 40 (the second half of 40 total).

ALREADY RECOMMENDED (do NOT repeat or suggest similar): ${existingNames}

IMPORTANT — to save tokens, do NOT include retailerSearchURLs. Return each object with these keys only:
{ "rank", "productName", "brand", "category", "whyTrending", "whyGreatGift", "approxPrice" }

Keep whyTrending and whyGreatGift to ONE concise sentence each.

Return ONLY valid JSON array. No markdown, no backticks, no explanation.`;

      let batch2Items = [];
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const { text } = await fetchBatch(batch2Prompt);
          batch2Items = repairJSON(text);
          if (Array.isArray(batch2Items) && batch2Items.length > 0) break;
        } catch (e) {
          if (attempt === MAX_RETRIES) throw e;
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      setProgress(80);
      setLoadingMsg(6);

      // ─── COMBINE & NORMALIZE ───
      allItems = [...batch1Items, ...batch2Items];

      // Re-rank, add retailer URLs client-side, deduplicate
      const seen = new Set();
      const deduped = [];
      for (const item of allItems) {
        const key = (item.productName || "").toLowerCase().trim();
        if (key && !seen.has(key)) {
          seen.add(key);
          deduped.push(item);
        }
      }

      // Ensure each item has required fields and add retailer URLs
      const final = deduped.slice(0, 40).map((item, i) => ({
        rank: i + 1,
        productName: item.productName || "Unknown Product",
        brand: item.brand || "Various",
        category: item.category || "General",
        whyTrending: item.whyTrending || "",
        whyGreatGift: item.whyGreatGift || "",
        approxPrice: typeof item.approxPrice === "number" ? item.approxPrice : parseFloat(item.approxPrice) || 0,
        retailerSearchURLs: buildRetailerURLs(item.productName || "", item.brand || ""),
      }));

      if (final.length === 0) {
        throw new Error("No valid recommendations were generated. Please try again.");
      }

      setProgress(100);
      setTimeout(() => setResults(final), 400);
    } catch (err) {
      console.error("Giiftii error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResults(null);
    setError(null);
  }

  // ─── RENDER ───
  return (
    <div style={styles.global}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');
        @keyframes giiftii-spin { to { transform: rotate(360deg) } }
        @keyframes giiftii-fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        select:focus, textarea:focus { border-color: ${COLORS.accent} !important; box-shadow: 0 0 0 3px ${COLORS.accent}18; }
        button:active { transform: scale(0.98); }
        .giiftii-link:hover { background: ${COLORS.accent} !important; color: #fff !important; }
        .giiftii-row:hover td { background: ${COLORS.bg}; }
        .giiftii-card:hover { box-shadow: ${COLORS.shadowHover}; }
        @media (max-width: 768px) {
          .giiftii-table-wrap { display: none !important; }
          .giiftii-card-view { display: flex !important; }
        }
        @media (min-width: 769px) {
          .giiftii-card-view { display: none !important; }
        }
      `}</style>

      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.logoMark}>
          <div style={styles.logoIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="8" width="18" height="13" rx="2" />
              <path d="M12 8v13" />
              <path d="M3 13h18" />
              <path d="M8 4c0 0-1 4 4 4 5 0 4-4 4-4" />
            </svg>
          </div>
          <span style={styles.logoText}>Giiftii</span>
        </div>
        <p style={styles.subtitle}>
          AI-Powered Gift Finder — Curated Recommendations from What's Trending Now
        </p>
      </header>

      {/* FORM or RESULTS */}
      {!results && !loading && !error && (
        <div style={styles.formWrap}>
          <p style={{ ...styles.sectionLabel, marginBottom: 24 }}>Tell us about the gift recipient</p>

          {/* Budget */}
          <div style={{ marginBottom: 28 }}>
            <label style={styles.fieldLabel}>
              Your Budget <span style={{ color: COLORS.accent }}>*</span>
            </label>
            <div style={styles.chipRow}>
              {BUDGET_OPTIONS.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  style={styles.chip(budget === b.value)}
                  onClick={() => setBudget(b.value)}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div style={{ marginBottom: 28 }}>
            <label style={styles.fieldLabel}>
              Recipient's Gender <span style={{ color: COLORS.accent }}>*</span>
            </label>
            <GenderSelector value={gender} onChange={setGender} />
          </div>

          {/* Age Range */}
          <div style={{ marginBottom: 28 }}>
            <label style={styles.fieldLabel}>
              Recipient's Age Range <span style={{ color: COLORS.accent }}>*</span>
            </label>
            <select
              style={styles.select}
              value={ageRange}
              onChange={(e) => setAgeRange(e.target.value)}
            >
              <option value="">Select age range...</option>
              {AGE_RANGES.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Context */}
          <div style={{ marginBottom: 32 }}>
            <label style={styles.fieldLabel}>
              Additional Context <span style={{ color: COLORS.textLight, fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              style={styles.textarea}
              placeholder="Tell us about the recipient's hobbies, interests, favorite brands, sports teams, music tastes, books they love, or anything that might help us find the perfect gift..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
              maxLength={1000}
            />
            <div style={{ textAlign: "right", fontSize: 11, color: COLORS.textLight, marginTop: 4 }}>
              {context.length}/1000
            </div>
          </div>

          {/* Submit */}
          <button
            style={styles.button(!canSubmit)}
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            Find 40 Perfect Gifts
          </button>

          <p style={{ textAlign: "center", fontSize: 12, color: COLORS.textLight, marginTop: 14 }}>
            Powered by AI trend analysis across TikTok, Instagram, Pinterest & major retailers
          </p>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>
              Curating Your Gift List
            </p>
            <p style={{
              fontSize: 13,
              color: COLORS.textMuted,
              minHeight: 20,
              animation: "giiftii-fadeIn 0.4s ease",
              key: loadingMsg,
            }}>
              {LOADING_MESSAGES[loadingMsg]}
            </p>
          </div>
          <div style={styles.progressBar}>
            <div style={styles.progressFill(progress)} />
          </div>
          <p style={{ fontSize: 11, color: COLORS.textLight }}>
            This may take 30–60 seconds for best results
          </p>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div style={styles.errorBox}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Something went wrong</p>
          <p style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 20 }}>{error}</p>
          <button
            style={{ ...styles.button(false), maxWidth: 200, margin: "0 auto" }}
            onClick={() => { setError(null); handleSubmit(); }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* RESULTS */}
      {results && (
        <div ref={resultsRef} style={styles.resultsWrap}>
          <button style={styles.backBtn} onClick={handleReset}>
            ← New Search
          </button>

          <div style={styles.resultsMeta}>
            <div>
              <h2 style={styles.resultsTitle}>{results.length} Gift Recommendations</h2>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={styles.tag}>
                💰 {BUDGET_OPTIONS.find((b) => b.value === budget)?.label}
              </span>
              <span style={styles.tag}>👤 {gender}</span>
              <span style={styles.tag}>🎂 {ageRange}</span>
              {context && <span style={styles.tag}>📝 Custom context</span>}
            </div>
          </div>

          {/* View toggle (desktop) */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              style={{
                ...styles.chip(viewMode === "table"),
                fontSize: 12,
              }}
              onClick={() => setViewMode("table")}
            >
              Table View
            </button>
            <button
              style={{
                ...styles.chip(viewMode === "cards"),
                fontSize: 12,
              }}
              onClick={() => setViewMode("cards")}
            >
              Card View
            </button>
          </div>

          {/* TABLE VIEW */}
          {viewMode === "table" && (
            <div className="giiftii-table-wrap" style={{ overflowX: "auto", borderRadius: 14 }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, textAlign: "center", width: 44 }}>#</th>
                    <th style={{ ...styles.th, minWidth: 180 }}>Product</th>
                    <th style={{ ...styles.th, minWidth: 90 }}>Brand</th>
                    <th style={{ ...styles.th, minWidth: 100 }}>Category</th>
                    <th style={{ ...styles.th, minWidth: 180 }}>Why It's Trending</th>
                    <th style={{ ...styles.th, minWidth: 180 }}>Why It's a Great Gift</th>
                    <th style={{ ...styles.th, width: 80, textAlign: "right" }}>Price</th>
                    <th style={{ ...styles.th, minWidth: 160 }}>Shop</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((item, i) => (
                    <tr key={i} className="giiftii-row">
                      <td style={{ ...styles.td, ...styles.rankCell }}>{item.rank || i + 1}</td>
                      <td style={{ ...styles.td, fontWeight: 600, fontSize: 13 }}>{item.productName}</td>
                      <td style={{ ...styles.td, ...styles.brandCell }}>{item.brand}</td>
                      <td style={styles.td}>
                        <span style={styles.catTag}>{item.category}</span>
                      </td>
                      <td style={{ ...styles.td, fontSize: 12, color: COLORS.textMuted }}>{item.whyTrending}</td>
                      <td style={{ ...styles.td, fontSize: 12, color: COLORS.textMuted }}>{item.whyGreatGift}</td>
                      <td style={{ ...styles.td, ...styles.priceCell, textAlign: "right" }}>
                        ${typeof item.approxPrice === "number" ? item.approxPrice.toFixed(0) : item.approxPrice}
                      </td>
                      <td style={styles.td}>
                        {(item.retailerSearchURLs || []).map((url, j) => {
                          let label = "Shop";
                          if (url.includes("amazon")) label = "Amazon";
                          else if (url.includes("target")) label = "Target";
                          else if (url.includes("google")) label = "Google";
                          else if (url.includes("walmart")) label = "Walmart";
                          return (
                            <a
                              key={j}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={styles.linkPill}
                              className="giiftii-link"
                            >
                              {label}
                            </a>
                          );
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* CARD VIEW */}
          {(viewMode === "cards") && (
            <div className="giiftii-card-view" style={styles.cardView}>
              {results.map((item, i) => (
                <div key={i} style={styles.itemCard} className="giiftii-card">
                  <div style={styles.cardHeader}>
                    <div style={styles.cardRank}>{item.rank || i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={styles.cardTitle}>{item.productName}</div>
                      <div style={styles.cardBrand}>{item.brand} · <span style={styles.catTag}>{item.category}</span></div>
                    </div>
                    <div style={styles.cardPrice}>
                      ${typeof item.approxPrice === "number" ? item.approxPrice.toFixed(0) : item.approxPrice}
                    </div>
                  </div>
                  <div style={styles.cardSection}>
                    <div style={styles.cardSectionLabel}>📈 Why It's Trending</div>
                    {item.whyTrending}
                  </div>
                  <div style={styles.cardSection}>
                    <div style={styles.cardSectionLabel}>🎁 Why It's a Great Gift</div>
                    {item.whyGreatGift}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    {(item.retailerSearchURLs || []).map((url, j) => {
                      let label = "Shop";
                      if (url.includes("amazon")) label = "Amazon";
                      else if (url.includes("target")) label = "Target";
                      else if (url.includes("google")) label = "Google Shopping";
                      return (
                        <a key={j} href={url} target="_blank" rel="noopener noreferrer" style={styles.linkPill} className="giiftii-link">
                          {label} →
                        </a>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mobile card view (always visible on small screens) */}
          <div className="giiftii-card-view" style={{ ...styles.cardView, display: "none" }}>
            {results.map((item, i) => (
              <div key={i} style={styles.itemCard} className="giiftii-card">
                <div style={styles.cardHeader}>
                  <div style={styles.cardRank}>{item.rank || i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.cardTitle}>{item.productName}</div>
                    <div style={styles.cardBrand}>{item.brand} · <span style={styles.catTag}>{item.category}</span></div>
                  </div>
                  <div style={styles.cardPrice}>
                    ${typeof item.approxPrice === "number" ? item.approxPrice.toFixed(0) : item.approxPrice}
                  </div>
                </div>
                <div style={styles.cardSection}>
                  <div style={styles.cardSectionLabel}>📈 Trending</div>
                  {item.whyTrending}
                </div>
                <div style={styles.cardSection}>
                  <div style={styles.cardSectionLabel}>🎁 Gift Appeal</div>
                  {item.whyGreatGift}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {(item.retailerSearchURLs || []).map((url, j) => {
                    let label = "Shop";
                    if (url.includes("amazon")) label = "Amazon";
                    else if (url.includes("target")) label = "Target";
                    else if (url.includes("google")) label = "Google";
                    return (
                      <a key={j} href={url} target="_blank" rel="noopener noreferrer" style={styles.linkPill} className="giiftii-link">
                        {label} →
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ textAlign: "center", marginTop: 32, padding: "20px 0", borderTop: `1px solid ${COLORS.border}` }}>
            <p style={{ fontSize: 12, color: COLORS.textLight }}>
              Recommendations generated by Giiftii AI · Prices are approximate · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
            <button
              style={{ ...styles.button(false), maxWidth: 240, margin: "16px auto 0" }}
              onClick={handleReset}
            >
              🔄 Start New Search
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
