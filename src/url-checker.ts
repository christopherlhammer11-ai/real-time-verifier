import { VerifyUrlResult } from './types';

/**
 * Check if URLs are reachable, measure response time,
 * detect redirects, and assess reliability.
 */
export async function checkUrls(
  urls: string[],
  timeout = 5000,
): Promise<VerifyUrlResult[]> {
  return Promise.all(urls.map(url => checkSingleUrl(url, timeout)));
}

async function checkSingleUrl(url: string, timeout: number): Promise<VerifyUrlResult> {
  const issues: string[] = [];
  const start = Date.now();

  // Basic URL validation
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      url,
      reachable: false,
      statusCode: null,
      responseTimeMs: 0,
      contentType: null,
      redirected: false,
      finalUrl: null,
      issues: ['Invalid URL format'],
      trustScore: 0,
    };
  }

  // Protocol check
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return {
      url,
      reachable: false,
      statusCode: null,
      responseTimeMs: 0,
      contentType: null,
      redirected: false,
      finalUrl: null,
      issues: [`Unsupported protocol: ${parsed.protocol}`],
      trustScore: 0,
    };
  }

  if (parsed.protocol === 'http:') {
    issues.push('Uses HTTP instead of HTTPS');
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timer);
    const responseTimeMs = Date.now() - start;

    const contentType = response.headers.get('content-type');
    const redirected = response.redirected;
    const finalUrl = response.url !== url ? response.url : null;

    if (response.status >= 400) {
      issues.push(`HTTP ${response.status} response`);
    }
    if (response.status === 403) {
      issues.push('Access forbidden — may require authentication');
    }
    if (response.status === 404) {
      issues.push('Resource not found');
    }
    if (responseTimeMs > 3000) {
      issues.push(`Slow response: ${responseTimeMs}ms`);
    }
    if (redirected) {
      issues.push(`Redirected to ${finalUrl}`);
    }

    // Calculate trust score
    let trustScore = 1.0;
    if (response.status >= 500) trustScore -= 0.5;
    if (response.status >= 400) trustScore -= 0.4;
    if (response.status === 301 || response.status === 302) trustScore -= 0.1;
    if (parsed.protocol === 'http:') trustScore -= 0.1;
    if (responseTimeMs > 3000) trustScore -= 0.1;
    trustScore = Math.max(0, Math.round(trustScore * 100) / 100);

    return {
      url,
      reachable: response.status < 400,
      statusCode: response.status,
      responseTimeMs,
      contentType,
      redirected,
      finalUrl,
      issues,
      trustScore,
    };
  } catch (err) {
    const responseTimeMs = Date.now() - start;
    const message = (err as Error).message || 'Unknown error';

    if (message.includes('abort')) {
      issues.push(`Timeout after ${timeout}ms`);
    } else {
      issues.push(`Connection failed: ${message}`);
    }

    return {
      url,
      reachable: false,
      statusCode: null,
      responseTimeMs,
      contentType: null,
      redirected: false,
      finalUrl: null,
      issues,
      trustScore: 0,
    };
  }
}
