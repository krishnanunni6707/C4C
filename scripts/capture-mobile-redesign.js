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
    { id: 1, name: "mobile_01_landing" },
    { id: 2, name: "mobile_02_choose_location" },
    { id: 3, name: "mobile_03_edit_pages" },
    { id: 4, name: "mobile_04_print_preferences" },
    { id: 5, name: "mobile_05_payment_sheet" },
    { id: 6, name: "mobile_06_success_sheet" },
    { id: 7, name: "mobile_07_upload_step" },
    { id: 8, name: "mobile_08_active_job" },
    { id: 9, name: "mobile_09_notifications" },
    { id: 10, name: "mobile_10_token_slip" },
  ];

  for (const s of screens) {
    const page = await browser.newPage({
      viewport: { width: 440, height: 950 },
      deviceScaleFactor: 2,
    });

    try {
      await page.goto(`http://localhost:3000/student/mobile-preview?screen=${s.id}`, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });

      // Wait a moment for styles, fonts, and icons to settle
      await page.waitForTimeout(600);

      // Take screenshot of the mobile viewport element
      const element = await page.$("#mobile-viewport");
      const filePath = path.join(artifactDir, `${s.name}.png`);

      if (element) {
        await element.screenshot({ path: filePath });
      } else {
        await page.screenshot({ path: filePath });
      }

      console.log(`Saved screenshot: ${filePath}`);
    } catch (err) {
      console.error(`Error capturing screen ${s.id} (${s.name}):`, err.message);
    } finally {
      await page.close();
    }
  }

  // Also capture the real /student page on real mobile viewport (390x844)
  const studentPage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });

  try {
    await studentPage.goto("http://localhost:3000/student", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await studentPage.waitForTimeout(800);
    const studentPath = path.join(artifactDir, "mobile_actual_student_page.png");
    await studentPage.screenshot({ path: studentPath });
    console.log(`Saved screenshot: ${studentPath}`);
  } catch (err) {
    console.error("Error capturing /student:", err.message);
  } finally {
    await studentPage.close();
  }

  await browser.close();
  console.log("All 10 mobile screen screenshots captured successfully.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
