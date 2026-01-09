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

const screenshotConfigs: ScreenshotConfig[] = [
  {
    name: 'alphabet-challenge',
    url: 'https://www.parkrun.org.uk/parkrunner/4100252/all/',
    script: 'alphabet-challenge.user.js',
    waitForSelector: '.parkrun-alphabet-container',
    waitForTimeout: 8000,
    viewport: { width: 1200, height: 800 },
  },
  {
    name: 'compass-challenge',
    url: 'https://www.parkrun.org.uk/parkrunner/1829613/all/',
    script: 'compass-challenge.user.js',
    waitForSelector: '.parkrun-compass-container',
    waitForTimeout: 8000,
    viewport: { width: 1200, height: 800 },
  },
  {
    name: 'launch-returnees',
    url: 'https://www.parkrun.org.uk/coronationpark/results/latestresults/',
    script: 'launch-returnees.user.js',
    waitForSelector: '#parkrun-launch-returnees',
    waitForTimeout: 8000,
    viewport: { width: 1200, height: 800 },
  },
  {
    name: 'p-index',
    url: 'https://www.parkrun.org.uk/parkrunner/1179626/all/',
    script: 'p-index.user.js',
    waitForSelector: '#p-index-display',
    waitForTimeout: 8000,
    viewport: { width: 1200, height: 800 },
  },
  {
    name: 'parkrun-charts',
    url: 'https://www.parkrun.org.uk/cassiobury/results/eventhistory/',
    script: 'parkrun-charts.user.js',
    waitForSelector: '#eventHistoryChart',
    waitForTimeout: 8000,
    viewport: { width: 1200, height: 800 },
  },
  {
    name: 'parkrun-annual-summary',
    url: 'https://www.parkrun.com.au/maribyrnong/results/eventhistory/',
    script: 'parkrun-annual-summary.user.js',
    waitForSelector: '.parkrun-annual-summary',
    waitForTimeout: 9000,
    viewport: { width: 1200, height: 1400 },
  },
  {
    name: 'parkrun-cancellation-impact',
    url: 'https://www.parkrun.com.au/aurora/results/eventhistory/',
    script: 'parkrun-cancellation-impact.user.js',
    waitForSelector: '.parkrun-cancellation-impact',
    waitForTimeout: 25000,
    viewport: { width: 1400, height: 2000 },
  },
  {
    name: 'parkrun-walker-analysis',
    url: 'https://www.parkrun.co.za/pigglywiggly/results/latestresults/',
    script: 'parkrun-walker-analysis.user.js',
    waitForSelector: '#walkerAnalysisContainer',
    waitForTimeout: 8000,
    viewport: { width: 1200, height: 800 },
  },
  {
    name: 'position-bingo',
    url: 'https://www.parkrun.org.uk/parkrunner/1965346/all/',
    script: 'position-bingo.user.js',
    waitForSelector: '#positionBingoContainer',
    waitForTimeout: 8000,
    viewport: { width: 1200, height: 800 },
  },
  {
    name: 'stopwatch-bingo',
    url: 'https://www.parkrun.org.uk/parkrunner/4886000/all/',
    script: 'stopwatch-bingo.user.js',
    waitForSelector: '#stopwatchBingoContainer',
    waitForTimeout: 8000,
    viewport: { width: 1200, height: 800 },
  },
  {
    name: 'visited-countries',
    url: 'https://www.parkrun.org.uk/parkrunner/1179622/all/',
    script: 'visited-countries.user.js',
    waitForSelector: '#countries-visited',
    waitForTimeout: 8000,
    viewport: { width: 1200, height: 800 },
  },
  {
    name: 'volunteer-days-display',
    url: 'https://www.parkrun.org.uk/fountainsabbey/results/latestresults/',
    script: 'volunteer-days-display.user.js',
    waitForSelector: '.volunteer-days',
    waitForTimeout: 8000,
    viewport: { width: 1200, height: 800 },
  },
  {
    name: 'w-index',
    url: 'https://www.parkrun.org.uk/parkrunner/507/all/',
    script: 'w-index.user.js',
    waitForSelector: '#w-index-display',
    waitForTimeout: 8000,
    viewport: { width: 1200, height: 800 },
  },
];

async function generateScreenshots(scriptName?: string): Promise<void> {
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
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    if (isCI) {
      console.log('📝 Running in CI mode (headless browser)');
    } else {
      console.log('📝 Note: This script will open a browser window and inject the userscript.');
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

    for (const config of configsToProcess) {
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
  const scriptName = process.argv[2];
  generateScreenshots(scriptName).catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

declare const require: any;

export { generateScreenshots };
