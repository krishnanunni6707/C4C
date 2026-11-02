const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

async function main() {
  const artifactDir = "/home/krishnanunni/.gemini/antigravity-ide/brain/c2969bfb-4f3d-4639-ab8e-43f55bcd589b";
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
  });

  const states = [
    { name: "desktop_idle", viewport: { width: 1440, height: 900 }, state: "idle" },
    { name: "desktop_processing", viewport: { width: 1440, height: 900 }, state: "processing" },
    { name: "desktop_success", viewport: { width: 1440, height: 900 }, state: "success" },
    { name: "desktop_failure", viewport: { width: 1440, height: 900 }, state: "failure" },
    { name: "mobile_sheet_idle", viewport: { width: 390, height: 844 }, state: "idle" },
    { name: "mobile_sheet_success", viewport: { width: 390, height: 844 }, state: "success" },
  ];

  for (const item of states) {
    const page = await browser.newPage({ viewport: item.viewport });
    try {
      await page.goto(`http://localhost:3000/student/payment-preview?state=${item.state}`, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });

      // Wait a moment for animations to settle
      await page.waitForTimeout(600);

      const filePath = path.join(artifactDir, `payment_${item.name}.png`);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`Saved screenshot: ${filePath}`);
    } catch (err) {
      console.error(`Error capturing ${item.name}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
