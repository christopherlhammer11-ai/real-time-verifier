# Real-Time Verifier

**Trust layer for AI outputs.** Real-Time Verifier checks URLs, JSON, emails, dates, numbers, and claims, then returns confidence metadata instead of blind trust.

Demo: **Watch the demo:** [Real-Time Verifier](https://christopherhammer.dev/assets/videos/narrated/project-demos/real-time-verifier-narrated.mp4)

## Who Uses It

- AI agents that generate links, JSON, summaries, or claims
- Research and news workflows
- Sales or support systems that need valid contact data
- Any app that should verify output before sending it downstream

## What It Does

- Checks URL liveness
- Validates JSON structure
- Validates emails, dates, phone-like values, and numeric claims
- Supports offline validation for basic checks
- Returns trust scores, reasons, and errors

## Why It Matters

AI output can sound confident while being wrong. Verifier turns trust into an explicit step: check the generated artifact, score it, and decide whether to accept, retry, or route to review.

## Example

```bash
rtv verify-url https://example.com
rtv verify-json '{"status":"ok"}'
rtv verify-email user@example.com
```

Programmatic usage:

```ts
import { verify } from 'real-time-verifier';

const result = await verify('https://example.com', { type: 'url' });
console.log(result.trustScore, result.reasoning);
```

## Quick Start

```bash
npm install
npm run build
npm test
```

## Portfolio Context

Real-Time Verifier is the quality-control layer for agents like HammerLock and Craig. It shows production-minded thinking around hallucinations, broken links, malformed data, and trust scoring.

---

Built by **Christopher L. Hammer** - self-taught AI/product builder shipping local-first tools, demos, and real product surfaces.

- Portfolio: [christopherhammer.dev](https://christopherhammer.dev)
- Proof demos: [https://christopherhammer.dev#proof](https://christopherhammer.dev#proof)
- GitHub: [christopherlhammer11-ai](https://github.com/christopherlhammer11-ai)

