import { chromium } from "playwright";

async function main() {
  console.log("Launching Chromium for manual Instagram login...");
  console.log("1) Log in to the Instagram account in the opened browser");
  console.log("2) Wait until the home/feed page loads");
  console.log("3) Return here and press Enter");

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded" });

  process.stdin.setEncoding("utf8");
  await new Promise<void>((resolve) => {
    process.stdin.once("data", () => resolve());
  });

  const storageState = await context.storageState();
  console.log("\nCopy the JSON below into /accounts -> Playwright storageState JSON:\n");
  console.log(JSON.stringify(storageState, null, 2));

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
