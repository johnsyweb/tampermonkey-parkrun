#!/usr/bin/env node
/**
 * Builds the userscript, opens a browser with the screenshot URL, injects the
 * built script, and leaves the browser open for manual verification.
 * Usage: node scripts/preview-userscript.js [scriptName]
 * Default scriptName: parkrun-cancellation-impact
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const srcDir = path.join(root, 'src');

function getMeta(content, key) {
  const m = content.match(new RegExp(`@${key}\\s+(.+)`));
  return m ? m[1].trim() : null;
}

function loadPreviewConfig(scriptName) {
  const scriptFile = scriptName.endsWith('.user.js') ? scriptName : `${scriptName}.user.js`;
  const srcPath = path.join(srcDir, scriptFile);
  const builtPath = path.join(root, scriptFile);

  if (!fs.existsSync(srcPath)) {
    console.error(`❌ Source not found: ${srcPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(builtPath)) {
    console.error(`❌ Built script not found: ${builtPath}. Run 'pnpm run build:scripts' first.`);
    process.exit(1);
  }

  const content = fs.readFileSync(srcPath, 'utf-8');
  const metaMatch = content.match(/\/\/ ==UserScript==([\s\S]*?)\/\/ ==\/UserScript==/);
  if (!metaMatch) {
    console.error(`❌ No UserScript block in ${srcPath}`);
    process.exit(1);
  }
  const meta = metaMatch[1];
  const url = getMeta(meta, 'screenshot-url');
  if (!url) {
    console.error(`❌ No @screenshot-url in ${scriptFile}`);
    process.exit(1);
  }

  const selector = getMeta(meta, 'screenshot-selector') ?? undefined;
  const timeoutStr = getMeta(meta, 'screenshot-timeout');
  const waitForTimeout = timeoutStr ? parseInt(timeoutStr, 10) : 8000;
  const viewportStr = getMeta(meta, 'screenshot-viewport');
  let viewport = { width: 1200, height: 800 };
  if (viewportStr) {
    const [w, h] = viewportStr.split('x').map((n) => parseInt(n, 10));
    if (!isNaN(w) && !isNaN(h)) viewport = { width: w, height: h };
  }

  return {
    name: scriptFile.replace('.user.js', ''),
    scriptFile,
    builtPath,
    url,
    waitForSelector: selector,
    waitForTimeout,
    viewport,
  };
}

async function main() {
  const scriptName = process.argv[2] || 'parkrun-cancellation-impact';
  const config = loadPreviewConfig(scriptName);

  console.log(`📦 Using built script: ${config.builtPath}`);
  console.log(`🌐 URL: ${config.url}`);
  console.log(`🎯 Selector: ${config.waitForSelector ?? '(none)'}`);

  const puppeteer = require('puppeteer');
  const scriptContent = fs.readFileSync(config.builtPath, 'utf8');

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--disable-web-security',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--no-first-run',
    ],
    defaultViewport: null,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport(config.viewport);

    console.log('🌐 Navigating...');
    const response = await page.goto(config.url, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });
    if (!response || response.status() < 200 || response.status() >= 300) {
      console.error(`❌ Page load failed: ${response?.status() ?? 'no response'}`);
      await browser.close();
      process.exit(1);
    }

    await new Promise((r) => setTimeout(r, 3000));

    console.log('💉 Injecting userscript...');
    const requireMatches = scriptContent.matchAll(/@require\s+(https:\/\/[^\s]+)/g);
    for (const match of requireMatches) {
      const requireUrl = match[1];
      console.log(`   @require: ${requireUrl}`);
      try {
        const requireContent = await (await fetch(requireUrl)).text();
        await page.addScriptTag({ content: requireContent });
        await new Promise((r) => setTimeout(r, 1000));
      } catch (err) {
        console.warn(`   Failed to load @require ${requireUrl}:`, err.message);
      }
    }

    const cleanScript = scriptContent.replace(
      /^\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\n\n?/gm,
      ''
    );
    try {
      await page.evaluate(cleanScript);
    } catch (err) {
      console.warn('⚠️  Injection error (continuing):', err.message);
    }

    if (config.waitForSelector) {
      try {
        await page.waitForSelector(config.waitForSelector, { timeout: 15000 });
        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, config.waitForSelector);
        await new Promise((r) => setTimeout(r, 1000));
      } catch {
        console.warn(`⚠️  Selector ${config.waitForSelector} not found`);
      }
    }

    if (config.waitForTimeout) {
      await new Promise((r) => setTimeout(r, Math.min(config.waitForTimeout, 5000)));
    }

    console.log('✅ Browser left open for verification. Close the window when done.');
    browser.disconnect();
  } catch (err) {
    console.error('❌', err);
    await browser.close();
    process.exit(1);
  }
}

main();
