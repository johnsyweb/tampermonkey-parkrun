#!/usr/bin/env ts-node

import puppeteer, { Browser, Page } from 'puppeteer';
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

async function removeThirdPartyOverlays(page: Page): Promise<void> {
  await page.evaluate(() => {
    const selectorsToHide = [
      // Recite Me and accessibility launchers/overlays.
      '#reciteme',
      '#recite-me',
      '#reciteMe',
      '[id*="recite" i]',
      '[class*="recite" i]',
      '[id*="accessibility" i]',
      '[class*="accessibility" i]',
      // Generic popups/overlays.
      'iframe[src*="close"]',
      'iframe[src*="message"]',
      'iframe[src*="popup"]',
      'iframe[src*="overlay"]',
      'iframe[title*="close" i]',
      'iframe[title*="message" i]',
      '.close-message',
      '.popup-overlay',
      '.third-party-iframe',
      '[id*="popup" i]',
      '[class*="popup" i]',
      '[id*="overlay" i]',
      '[class*="overlay" i]',
      '[id*="consent" i]',
      '[class*="consent" i]',
      '[id*="cookie" i]',
      '[class*="cookie" i]',
      '[id*="modal" i]',
      '[class*="modal" i]',
    ];

    selectorsToHide.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        (element as HTMLElement).style.display = 'none';
      });
    });

    // Hide fixed elements that commonly float above content.
    document.querySelectorAll<HTMLElement>('*').forEach((element) => {
      const style = window.getComputedStyle(element);
      if (style.position !== 'fixed' && style.position !== 'sticky') {
        return;
      }
      const zIndex = Number.parseInt(style.zIndex || '0', 10);
      if (Number.isFinite(zIndex) && zIndex >= 999) {
        element.style.display = 'none';
      }
    });
  });
}

async function injectUserscript(page: Page, scriptContent: string): Promise<void> {
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

  const cleanScript = scriptContent.replace(
    /^\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\n\n?/gm,
    ''
  );

  const wrappedScript = `(() => {
    const module = undefined;
    const exports = undefined;
    ${cleanScript}
  })();`;

  try {
    await page.evaluate(wrappedScript);
  } catch (error) {
    console.warn('⚠️  Script injection had an error, but continuing...', error);
  }
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
      console.log(
        '📝 CI environment detected; skipping screenshot generation to avoid hitting external parkrun sites.'
      );
      return;
    } else {
      console.log('📝 Note: This script will open a browser window and inject the userscript.');
    }

    // Before launching a browser, filter out any configs where the screenshot
    // already exists and is newer than the *source* userscript file in src/,
    // unless `force` is set. This ensures we only regenerate screenshots when
    // the actual script source changes, regardless of rebuilds.
    const configsAfterSkip = [] as typeof screenshotConfigs;
    for (const config of configsToProcess) {
      try {
        const screenshotPath = path.join(process.cwd(), 'docs', 'images', `${config.name}.png`);
        const scriptPath = path.join(process.cwd(), 'src', config.script);
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

      await injectUserscript(page, scriptContent);

      if (config.waitForSelector) {
        try {
          await page.waitForSelector(config.waitForSelector, {
            timeout: 30000,
          });
        } catch (error) {
          const localFallbackPath = path.join(process.cwd(), 'test-data', '1001388.html');
          if (!fs.existsSync(localFallbackPath)) {
            throw error;
          }
          const fallbackUrl = `file://${localFallbackPath}`;
          console.warn(
            `⚠️  Selector ${config.waitForSelector} not found on remote page; retrying with local fixture ${fallbackUrl}`
          );
          await page.goto(fallbackUrl, { waitUntil: 'networkidle2', timeout: 60000 });
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await injectUserscript(page, scriptContent);
          await page.waitForSelector(config.waitForSelector, {
            timeout: 30000,
          });
        }
      }

      if (config.waitForTimeout) {
        await new Promise((resolve) => setTimeout(resolve, config.waitForTimeout));
      }

      // Scroll to the target element for better screenshot composition
      if (config.waitForSelector) {
        await page.evaluate((selector) => {
          const element = document.querySelector(selector);
          if (element) {
            element.scrollIntoView({ behavior: 'auto', block: 'center' });
          }
        }, config.waitForSelector);
        await new Promise((resolve) => setTimeout(resolve, 1000));
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

      await removeThirdPartyOverlays(page);

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
