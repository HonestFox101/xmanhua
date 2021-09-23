import { Browser, ElementHandle, Page } from "puppeteer-core";

export default class CopyMangaCrawler {
    readonly browser: Browser;
    readonly host: string;

    constructor(browser: Browser, host: string = "https://copymanga.com") {
        this.browser = browser;
        this.host = host;
    }

    async readEpisodeList(href: string): Promise<Map<string, string> | null> {
        const page = await this.browser.newPage();
        await page.goto(this.host + href);

        const episodeHandleArray: ElementHandle<Element>[] = await page.$$(
            "#default全部 > ul:nth-child(1) > a"
        );

        if (episodeHandleArray.length == 0) {
            page.close();
            return null;
        }

        console.log(`章节数：${episodeHandleArray.length}`);

        const resultMap: Map<string, string> = new Map();
        for (const episodeHandle of episodeHandleArray) {
            const entry: (string | null)[] = await page.evaluate(
                (episode: Element) => [
                    episode.getAttribute("title"),
                    episode.getAttribute("href"),
                ],
                episodeHandle
            );
            episodeHandle.dispose();
            if (
                entry[0] == null ||
                entry[0] == "" ||
                entry[1] == null ||
                entry[1] == ""
            ) {
                console.error("找不到属性");
                continue;
            }
            resultMap.set(entry[0], entry[1]);
        }

        setTimeout(async () => {
            await page.close();
        }, 3000);
        return resultMap;
    }
}

class CopyMangaFetcher {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }
}
