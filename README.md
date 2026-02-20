# BOS Builder — Business Operating System Generator

A wizard-style, AI-powered web application that generates a complete **Business Operating System** (11 interconnected modules) for client companies — in hours, not months.

---

## Quick Start

```bash
cd bos-builder
npm install
cp .env.example .env.local
# Add: ANTHROPIC_API_KEY=sk-ant-...
npm run dev
# → http://localhost:3000
```

## Deploy to Vercel

```bash
npm i -g vercel
vercel
vercel env add ANTHROPIC_API_KEY
vercel --prod
```

See docs/BUILD_PLAN.md for the full 2-week build roadmap.
