import { debug } from "debug";
import pc from "picocolors";
import { chromium, LaunchOptions, Page } from "playwright";

const BASE_URL = "https://www.facebook.com";
const BROWSER_CONFIG: LaunchOptions = { headless: false };
const DEBUG = debug("fb-group-dl");
const GROUP_PATH = "/groups/2750972221800438/media/albums";
const LOGIN_PATH = "/login";

export class Application {
  public async run(): Promise<void> {
    console.log(`${pc.blue("starting...")}`);

    const browser = await chromium.launch(BROWSER_CONFIG);
    const context = await browser.newContext();
    const page = await context.newPage();

    // Log and continue all network requests
    await page.route("**", (route) => {
      DEBUG(route.request().url());
      route.continue();
    });

    await this.authenticate(page);

    const response = await page.goto(`${BASE_URL}${GROUP_PATH}`);
    if (!response.ok()) {
      await browser.close();
      throw new Error("Unable to open Facebook group!");
    }

    await this.scrollToBottom(page);

    const albums = await this.getAlbumLinks(page);

    console.log(albums);
  }

  private async authenticate(page: Page): Promise<void> {
    await page.goto(`${BASE_URL}${LOGIN_PATH}`);
    await page.waitForNavigation({ url: BASE_URL, timeout: 0 });
  }

  private async getAlbumLinks(page: Page): Promise<string[]> {
    const albums = await page.evaluate(() => {
      const links = [];

      document.body.querySelectorAll("a").forEach((element) => {
        if (element) {
          const link = element.getAttribute("href");

          if (link && link.toString().indexOf("media/set") > -1) {
            links.push(link);
          }
        }
      });

      return links;
    });

    return albums;
  }

  private async scrollToBottom(page: Page): Promise<void> {
    return new Promise<void>(async (resolve) => {
      const intervalId = setInterval(async () => {
        await page.evaluate(() => {
          console.log("scrolling...");

          const scrollingElement = document.scrollingElement || document.body;
          scrollingElement.scrollTop = scrollingElement.scrollHeight;
        });
      }, 200);

      let previousHeight = undefined;

      this.wait(1000);

      while (true) {
        const currentHeight = await page.evaluate(() => window.innerHeight + window.scrollY);

        console.log(`checking | prev: ${previousHeight} | curr: ${currentHeight}`);

        if (!previousHeight) {
          console.log("hit initial set...");
          previousHeight = currentHeight;
          this.wait(1000);
        } else if (previousHeight === currentHeight) {
          clearInterval(intervalId);

          console.log("should break out...");

          break;
        } else {
          console.log("continuing...");
          previousHeight = currentHeight;
          this.wait(1000);
        }
      }

      console.log("finished.");
      resolve();
    });
  }

  private wait(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
