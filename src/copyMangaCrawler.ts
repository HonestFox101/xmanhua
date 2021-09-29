import { Browser, ElementHandle, HTTPResponse, Page, EventEmitter } from "puppeteer-core";
import * as https from 'https';

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

export class CopyMangaFetcher {
    readonly page: Page;
    readonly task: Map<string, string>;
    readonly host: string;

    _presentImageList: string[] = [];

    constructor(page: Page, task:Map<string,string>, host:string = 'https://copymanga.com') {
        this.page = page;
        this.task = task;
        this.host = host;
    }

    async jumpToTargetEpisode(url: string) {
        this.page.off("response", this._on_page_receipt_response);
        this.page.on("response", this._on_page_receipt_response);
        await this.page.goto(url);
    }

    async _on_page_receipt_response(resp: HTTPResponse): Promise<void> {
        const url: string = resp.url();
        if (url.match(/.+loading\.jpg/g)) {
            const imgHandles: ElementHandle<Element>[] = await this.page.$$(".comicContent-list > li > img");
            if (imgHandles.length == 0) {
                console.error("选择器未定位到图片元素");
                return;
            }

            this._presentImageList.length = imgHandles.length;
            for (let i = 0; i < imgHandles.length; i++){
                const imgHandle: ElementHandle<Element> = imgHandles[i];
                const src: string = await this.page.evaluate((img: Element) => img.getAttribute("src")!, imgHandle)
                this._presentImageList[i] = src;
            }

            console.log(this._presentImageList.toString());

            this.page.off("response", this._on_page_receipt_response);
        };
    }

    handleImage(url: string) {
        
    }
}
