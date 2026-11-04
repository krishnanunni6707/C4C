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

  // Desktop 1440x900 viewport
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Printing State (RP1042)
  console.log('Capturing Printing state...');
  await page.goto('http://localhost:3000/admin-preview/job?state=printing', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(artifactDir, 'admin-job-printing.png') });
  await page.screenshot({ path: path.join(artifactDir, 'admin-job-printing-full.png'), fullPage: true });
  console.log('Saved admin-job-printing.png and full');

  // 2. Waiting + Pending-payment State
  console.log('Capturing Waiting + Pending-payment state...');
  await page.goto('http://localhost:3000/admin-preview/job?state=waiting_unpaid', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(artifactDir, 'admin-job-waiting-unpaid.png') });
  await page.screenshot({ path: path.join(artifactDir, 'admin-job-waiting-unpaid-full.png'), fullPage: true });
  console.log('Saved admin-job-waiting-unpaid.png and full');

  // 3. Ready State
  console.log('Capturing Ready state...');
  await page.goto('http://localhost:3000/admin-preview/job?state=ready', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(artifactDir, 'admin-job-ready.png') });
  await page.screenshot({ path: path.join(artifactDir, 'admin-job-ready-full.png'), fullPage: true });
  console.log('Saved admin-job-ready.png and full');

  // 4. Cancelled State
  console.log('Capturing Cancelled state...');
  await page.goto('http://localhost:3000/admin-preview/job?state=cancelled', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(artifactDir, 'admin-job-cancelled.png') });
  await page.screenshot({ path: path.join(artifactDir, 'admin-job-cancelled-full.png'), fullPage: true });
  console.log('Saved admin-job-cancelled.png and full');

  await browser.close();
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
