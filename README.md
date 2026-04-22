# Real-Time Verifier

CLI tool for instant verification of URLs, JSON, emails, dates, and claims with trust scoring.

<!-- badges -->

## What It Does

Real-Time Verifier (`rtv`) checks URLs, email addresses, JSON validity, dates, numbers, and claims in real time, returning a trust score from 0–1 and detailed reasoning for each verification.

## Features

- **Trust Scoring**: 0–1 confidence level for every check
- **Online & Offline Modes**: verify() for live checks, verifyOffline() for local-only validation
- **Multi-Format Support**: URLs, JSON, emails, dates, phone numbers, claims
- **Threat Detection**: Suspicious TLDs, disposable email services, unreasonable numbers
- **Fast Offline**: verifyOffline() works without network for basic format validation
- **Detailed Results**: Reasoning, error messages, and confidence explanations

## Quick Start

```bash
npm install -g real-time-verifier
rtv --help
```

## Usage

```bash
# Verify a URL
rtv verify-url https://example.com

# Check an email
rtv verify-email user@domain.com

# Validate JSON
rtv verify-json '{"key": "value"}'

# Check a claim (offline)
rtv verify-offline --claim "2 + 2 = 4"

# Batch verify (from file)
rtv batch verification-list.txt
```

## Tech Stack

- Commander.js (CLI framework)
- Regex (format validation)
- Fetch API (live verification)

## Part of Genesis Marketplace

Ensures data integrity across all Genesis agent skill chains.

## Author

Christopher L. Hammer  
GitHub: [christopherlhammer11-ai](https://github.com/christopherlhammer11-ai)  
Sites: [hammercg.com](https://hammercg.com) | [hammerlockai.com](https://hammerlockai.com)
