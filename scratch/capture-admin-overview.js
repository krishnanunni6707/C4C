const { createRequire } = require('module');
const requireWorkspace = createRequire('/home/krishnanunni/Projects/C4C/package.json');
const { chromium } = requireWorkspace('playwright');
const path = require('path');

async function capture() {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const artifactDir = '/home/krishnanunni/.gemini/antigravity-ide/brain/c2969bfb-4f3d-4639-ab8e-43f55bcd589b';

  // Desktop 1440x900
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Capture Loaded State
  console.log('Capturing Loaded state...');
  await page.goto('http://localhost:3000/admin-preview?state=loaded', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactDir, 'overview-loaded.png') });
  await page.screenshot({ path: path.join(artifactDir, 'overview-loaded-full.png'), fullPage: true });
  console.log('Saved overview-loaded.png and full');

  // 2. Capture Loading State
  console.log('Capturing Loading state...');
  await page.goto('http://localhost:3000/admin-preview?state=loading', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(artifactDir, 'overview-loading.png') });
  await page.screenshot({ path: path.join(artifactDir, 'overview-loading-full.png'), fullPage: true });
  console.log('Saved overview-loading.png and full');

  // 3. Capture Error State
  console.log('Capturing Error state...');
  await page.goto('http://localhost:3000/admin-preview?state=error', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(artifactDir, 'overview-error.png') });
  await page.screenshot({ path: path.join(artifactDir, 'overview-error-full.png'), fullPage: true });
  console.log('Saved overview-error.png and full');

  await browser.close();
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
