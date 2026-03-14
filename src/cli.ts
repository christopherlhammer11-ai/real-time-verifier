#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import { verify, verifyOffline } from './verifier';
import { validateJson } from './json-validator';

const program = new Command();

program
  .name('rtv')
  .description('Real-time Verifier — verify API responses and data claims')
  .version('0.1.0');

program
  .command('check')
  .description('Verify content from a file or stdin')
  .argument('[file]', 'Input file. Reads stdin if omitted.')
  .option('--offline', 'Skip URL liveness checks (no network)')
  .option('--timeout <ms>', 'URL check timeout in ms', '5000')
  .option('--json', 'Output raw JSON report')
  .action(async (file: string | undefined, opts: Record<string, string | boolean>) => {
    try {
      const input = file
        ? fs.readFileSync(file, 'utf-8')
        : await readStdin();

      const report = opts['offline']
        ? verifyOffline(input)
        : await verify(input, {
            timeout: parseInt(opts['timeout'] as string, 10) || 5000,
          });

      if (opts['json']) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        printReport(report);
      }

      // Exit with non-zero if issues found
      if (report.issues.length > 0) process.exit(1);
    } catch (err) {
      console.error('Error:', (err as Error).message);
      process.exit(2);
    }
  });

program
  .command('json')
  .description('Validate a JSON file or string')
  .argument('<input>', 'JSON file path or inline JSON string')
  .action((input: string) => {
    const content = fs.existsSync(input)
      ? fs.readFileSync(input, 'utf-8')
      : input;

    const result = validateJson(content);

    if (result.valid) {
      console.log(`Valid JSON — ${result.fieldCount} fields, depth ${result.depth}, trust ${result.trustScore}`);
    } else {
      console.log('Invalid JSON:');
      for (const issue of result.issues) {
        console.log(`  - ${issue}`);
      }
    }

    process.exit(result.valid ? 0 : 1);
  });

program.parse();

function printReport(report: import('./types').VerifyReport): void {
  const icon = report.overallTrustScore >= 0.8 ? 'PASS' : report.overallTrustScore >= 0.5 ? 'WARN' : 'FAIL';
  console.log(`[${icon}] Trust Score: ${report.overallTrustScore} (${report.durationMs}ms)`);
  console.log('');

  if (report.urls.length) {
    console.log('URLs:');
    for (const url of report.urls) {
      const status = url.reachable ? 'OK' : 'FAIL';
      console.log(`  [${status}] ${url.url} (${url.statusCode || 'N/A'}, ${url.responseTimeMs}ms, trust ${url.trustScore})`);
    }
    console.log('');
  }

  if (report.claims.length) {
    console.log('Claims:');
    for (const claim of report.claims) {
      const status = claim.valid ? 'OK' : 'FLAG';
      console.log(`  [${status}] ${claim.type}: ${claim.claim.slice(0, 60)} — ${claim.details}`);
    }
    console.log('');
  }

  if (report.json) {
    console.log(`JSON: ${report.json.valid ? 'Valid' : 'Invalid'} (${report.json.fieldCount} fields, depth ${report.json.depth})`);
    if (report.json.issues.length) {
      for (const issue of report.json.issues) {
        console.log(`  - ${issue}`);
      }
    }
    console.log('');
  }

  if (report.issues.length) {
    console.log(`Issues (${report.issues.length}):`);
    for (const issue of report.issues) {
      console.log(`  - ${issue}`);
    }
  }
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
    setTimeout(() => { if (!data) reject(new Error('No stdin input')); }, 5000);
  });
}
