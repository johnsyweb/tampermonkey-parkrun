#!/usr/bin/env ts-node

import puppeteer, { Browser } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

interface ScreenshotConfig {
  name: string;
  url: string;
  script: string;
  waitForSelector?: string;
  waitForTimeout?: number;
  viewport?: { width: number; height: number };
}

function getMeta(content: string, key: string): string | null {
  const m = content.match(new RegExp(`@${key}\\s+(.+)`));
  return m ? m[1].trim() : null;
}

function loadScreenshotConfigs(): ScreenshotConfig[] {
  // Read from src/ so we see @screenshot-* keys (they are stripped from the built output)
  const srcDir = path.resolve(__dirname, '..', 'src');
  const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.user.js'));
  const configs: ScreenshotConfig[] = [];

  for (const file of files) {
    const filePath = path.join(srcDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const metaMatch = content.match(/\/\/ ==UserScript==([\s\S]*?)\/\/ ==\/UserScript==/);
    if (!metaMatch) continue;
    const meta = metaMatch[1];
    const url = getMeta(meta, 'screenshot-url');
    if (!url) continue;

    const selector = getMeta(meta, 'screenshot-selector') ?? undefined;
    const timeoutStr = getMeta(meta, 'screenshot-timeout');
    const timeout = timeoutStr ? parseInt(timeoutStr, 10) : 8000;
    const viewportStr = getMeta(meta, 'screenshot-viewport');
    let viewport: { width: number; height: number } | undefined;
    if (viewportStr) {
      const [w, h] = viewportStr.split('x').map((n) => parseInt(n, 10));
      if (!isNaN(w) && !isNaN(h)) viewport = { width: w, height: h };
    }
    if (!viewport) viewport = { width: 1200, height: 800 };

    configs.push({
      name: file.replace('.user.js', ''),
      script: file,
      url,
      waitForSelector: selector,
      waitForTimeout: timeout,
      viewport,
    });
  }

  return configs;
}

const screenshotConfigs: ScreenshotConfig[] = loadScreenshotConfigs();

async function generateScreenshots(scriptName?: string, force = false): Promise<void> {
  let browser: Browser | null = null;

  try {
    // Filter configs if a specific script name is provided
    let configsToProcess = screenshotConfigs;
    if (scriptName) {
      configsToProcess = screenshotConfigs.filter(
        (config) => config.name === scriptName || config.script === scriptName
      );
      if (configsToProcess.length === 0) {
        console.error(`❌ Script not found: ${scriptName}`);
        console.log('Available scripts:');
        screenshotConfigs.forEach((config) => {
          console.log(`  - ${config.name} (${config.script})`);
        });
        process.exit(1);
      }
    }

    console.log('🚀 Starting screenshot generation...');
    if (scriptName) {
      console.log(`📸 Generating screenshot for: ${scriptName}`);
    }
    if (force) {
      console.log(
        '⚡ Force mode enabled: screenshots will be regenerated regardless of timestamps'
      );
    }
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    if (isCI) {
      console.log('📝 Running in CI mode (headless browser)');
    } else {
      console.log('📝 Note: This script will open a browser window and inject the userscript.');
    }

    // Before launching a browser, filter out any configs where the screenshot
    // already exists and is newer than the userscript file, unless `force` is set.
    const configsAfterSkip = [] as typeof screenshotConfigs;
    for (const config of configsToProcess) {
      try {
        const screenshotPath = path.join(process.cwd(), 'docs', 'images', `${config.name}.png`);
        const scriptPath = path.join(process.cwd(), config.script);
        if (!force && fs.existsSync(screenshotPath) && fs.existsSync(scriptPath)) {
          const shotStat = fs.statSync(screenshotPath);
          const scriptStat = fs.statSync(scriptPath);
          if (shotStat.mtimeMs > scriptStat.mtimeMs) {
            console.log(
              `⏭️  Skipping ${config.name}: existing screenshot is newer than ${config.script}`
            );
            continue;
          }
        }
      } catch (err) {
        // If anything goes wrong determining mtimes, fall back to generating.
        console.warn(`⚠️  Could not stat files for ${config.name}, will regenerate:`, String(err));
      }
      configsAfterSkip.push(config);
    }

    if (configsAfterSkip.length === 0) {
      console.log('✅ No screenshots to generate (all up-to-date).');
      return;
    }

    browser = await puppeteer.launch({
      headless: isCI ? true : false,
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
      ],
      defaultViewport: null,
    });

    const page = await browser.newPage();

    for (const config of configsAfterSkip) {
      console.log(`📸 Capturing screenshot: ${config.name}`);

      if (config.viewport) {
        await page.setViewport(config.viewport);
      }

      console.log(`🌐 Navigating to ${config.url}...`);
      const response = await page.goto(config.url, { waitUntil: 'networkidle2', timeout: 60000 });

      if (!response) {
        console.error(`❌ Failed to load page: ${config.url}`);
        return;
      }

      const status = response.status();
      if (status < 200 || status >= 300) {
        console.error(`❌ Page returned status ${status}: ${config.url}`);
        return;
      }

      console.log(`✅ Page loaded successfully (status: ${status})`);

      await new Promise((resolve) => setTimeout(resolve, 3000));

      console.log('💉 Injecting userscript...');
      const scriptContent = fs.readFileSync(path.join(process.cwd(), config.script), 'utf8');

      // Extract @require URLs and inject them first
      const requireMatches = scriptContent.matchAll(/@require\s+(https:\/\/[^\s]+)/g);
      for (const match of requireMatches) {
        const requireUrl = match[1];
        console.log(`   Loading @require: ${requireUrl}`);
        try {
          const requireContent = await (await fetch(requireUrl)).text();
          await page.addScriptTag({ content: requireContent });
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.warn(`   Failed to load @require ${requireUrl}:`, error);
        }
      }

      // Remove @require and other metadata from script before injecting
      const cleanScript = scriptContent.replace(
        /^\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\n\n?/gm,
        ''
      );

      try {
        await page.evaluate(cleanScript);
      } catch (error) {
        console.warn('⚠️  Script injection had an error, but continuing...', error);
      }

      if (config.waitForSelector) {
        try {
          await page.waitForSelector(config.waitForSelector, {
            timeout: 15000,
          });
        } catch {
          console.warn(`⚠️  Selector ${config.waitForSelector} not found, continuing...`);
        }
      }

      if (config.waitForTimeout) {
        await new Promise((resolve) => setTimeout(resolve, config.waitForTimeout));
      }

      // Scroll to the target element for better screenshot composition
      if (config.waitForSelector) {
        try {
          await page.evaluate((selector) => {
            const element = document.querySelector(selector);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, config.waitForSelector);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch {
          // Ignore scroll errors
        }
      }

      console.log('🧹 Configuring page and cleaning up third-party content...');
      await page.evaluate(() => {
        // Set display to "detailed" if the select exists
        const displaySelect = document.querySelector('select[name="display"]') as HTMLSelectElement;
        if (displaySelect && displaySelect.value !== 'detailed') {
          displaySelect.value = 'detailed';
          // Trigger change event for any listeners
          const changeEvent = new Event('change', { bubbles: true });
          displaySelect.dispatchEvent(changeEvent);
        }

        // Set sort to "vols-desc" if the select exists
        const sortSelect = document.querySelector('select[name="sort"]') as HTMLSelectElement;
        if (sortSelect && sortSelect.value !== 'vols-desc') {
          sortSelect.value = 'vols-desc';
          // Trigger change event for any listeners
          const changeEvent = new Event('change', { bubbles: true });
          sortSelect.dispatchEvent(changeEvent);
        }

        // Click "Start Analysis" button if it exists (for cancellation-impact script)
        const startAnalysisBtn = document.querySelector('.start-analysis-btn') as HTMLButtonElement;
        if (startAnalysisBtn && !startAnalysisBtn.disabled) {
          console.log('Clicking Start Analysis button...');
          startAnalysisBtn.click();
        }
      });

      // Wait for any updates after changing the display
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await page.evaluate(() => {
        const selectorsToHide = [
          'iframe[src*="close"]',
          'iframe[src*="message"]',
          'iframe[src*="popup"]',
          'iframe[src*="overlay"]',
          'iframe[src*="Close"]',
          'iframe[src*="Message"]',
          'iframe[title*="close"]',
          'iframe[title*="Close"]',
          'iframe[title*="message"]',
          'iframe[title*="Message"]',
          '.close-message',
          '.popup-overlay',
          '.third-party-iframe',
          '[id*="close"]',
          '[class*="close"]',
          '[id*="popup"]',
          '[class*="popup"]',
          '[id*="Close"]',
          '[class*="Close"]',
          '[id*="Message"]',
          '[class*="Message"]',
        ];

        let hiddenCount = 0;
        selectorsToHide.forEach((selector) => {
          const elements = document.querySelectorAll(selector);
          elements.forEach((element) => {
            (element as HTMLElement).style.display = 'none';
            hiddenCount++;
          });
        });

        // Also hide any iframes that might be positioned over the content
        const allIframes = document.querySelectorAll('iframe');
        allIframes.forEach((iframe) => {
          const rect = iframe.getBoundingClientRect();
          // Hide iframes that are positioned like overlays (small, positioned absolutely/fixed)
          if (rect.width < 400 && rect.height < 300) {
            (iframe as HTMLElement).style.display = 'none';
            hiddenCount++;
          }
        });

        console.log(`Hidden ${hiddenCount} third-party elements`);
      });

      const screenshotPath = path.join(process.cwd(), 'docs', 'images', `${config.name}.png`);

      await page.screenshot({
        path: screenshotPath as `${string}.png`,
        type: 'png',
      });
      console.log(`✅ Screenshot saved: ${screenshotPath}`);
    }

    if (scriptName) {
      console.log(`🎉 Screenshot generated successfully for: ${scriptName}!`);
    } else {
      console.log('🎉 All screenshots generated successfully!');
    }
  } catch (error) {
    console.error('❌ Error generating screenshots:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  let scriptName: string | undefined;
  let force = false;
  for (const a of argv) {
    if (a === '--force' || a === '-f') {
      force = true;
    } else if (!scriptName) {
      scriptName = a;
    }
  }

  generateScreenshots(scriptName, force).catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

declare const require: any;

export { generateScreenshots };
