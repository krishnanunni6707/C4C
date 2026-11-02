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

  const screens = [
    { name: "desktop_A_payment_success", screen: "success", viewport: { width: 1440, height: 900 } },
    { name: "desktop_B_active_jobs", screen: "active", viewport: { width: 1440, height: 900 } },
    { name: "desktop_C_print_history", screen: "history", viewport: { width: 1440, height: 900 } },
    { name: "desktop_D_print_centers", screen: "locations", viewport: { width: 1440, height: 900 } },
    { name: "mobile_B_active_jobs", screen: "active", viewport: { width: 390, height: 844 } },
    { name: "mobile_C_print_history", screen: "history", viewport: { width: 390, height: 844 } },
    { name: "mobile_D_print_centers", screen: "locations", viewport: { width: 390, height: 844 } },
  ];

  for (const item of screens) {
    const page = await browser.newPage({ viewport: item.viewport });
    try {
      await page.goto(`http://localhost:3000/student/desktop-preview?screen=${item.screen}`, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });

      // Wait a moment for fonts and layout to settle
      await page.waitForTimeout(800);

      const filePath = path.join(artifactDir, `${item.name}.png`);
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
