import { existsSync, mkdirSync, writeFileSync } from "fs";
import { Browser, ElementHandle, HTTPResponse, Page } from "puppeteer-core";
import { stringify } from "querystring";
import { clearInterval } from "timers";

export default class XManHuaCrawler {
    readonly browser: Browser;
    readonly _mainLooper: NodeJS.Timer;
    readonly _host: string;

    _mangaFetcherPool: MangaFetcher[] = [];

    constructor(
        browser: Browser,
        mainLooperCircleTime: number = 20000,
        host: string = "https://www.xmanhua.com"
    ) {
        this.browser = browser;
        this._host = host;
        this._mainLooper = setInterval(async () => {
            const pages: Page[] = await this.browser.pages();
            console.log(`当前窗口:`);
            for (const page of pages) {
                const title = await page.title();
                if (title != "") {
                    console.log(await page.title());
                } else if (pages.length <= 1) {
                    clearInterval(this._mainLooper);
                    this.browser.close();
                }
            }

            this._mangaFetcherPool = this._mangaFetcherPool.filter(
                (fetcher: MangaFetcher) => !fetcher.getTaskCompleted()
            );
        }, mainLooperCircleTime);
    }

    async newTask(
        task: Map<string, string>,
        saveDir: string = "./manga/",
        mainTimerInterval: number = 5000
    ): Promise<void> {
        this._mangaFetcherPool.push(
            new MangaFetcher(
                await this.browser.newPage(),
                task,
                mainTimerInterval,
                saveDir,
                this._host
            )
        );
    }

    _clearAllMangaFetcher(): void {
        for (const mangaFetcher of this._mangaFetcherPool) {
            clearInterval(mangaFetcher._mangaFetcherMainLooper);
            mangaFetcher.page.close();
        }
        this._mangaFetcherPool.length = 0;
    }

    async readEpisodeList(href: string): Promise<Map<string, string> | null> {
        const url = this._host + href;
        const page: Page = await this.browser.newPage();
        await page.goto(url);
        const formItemHandles: ElementHandle<Element>[] = await page.$$(
            ".detail-list-form-item"
        );

        if (formItemHandles.length == 0) {
            return Promise.resolve(null);
        }

        let resultMap: Map<string, string> = new Map();

        for (let i = formItemHandles.length - 1; i >= 0; i--){
            const elementHandle = formItemHandles[i];
            const name: string = (
                String(formItemHandles.length - i) +
                "---" +
                (await page.evaluate(
                    (element: Element) => element.innerHTML,
                    elementHandle
                ))
            )
                .replace(/\s/g, "")
                .replace(/<\/?span>/g, "")
                .replace('"', "");
            const link: string = String(
                await page.evaluate(
                    (element: Element) => element.getAttribute("href"),
                    elementHandle
                )
            );
            elementHandle.dispose();
            resultMap.set(name, link);
        }


        setTimeout(async () => {
            await page.close();
        }, 3000);

        return Promise.resolve(resultMap);
    }
}

class MangaFetcher {
    readonly page: Page;
    readonly task: Map<string, string>;
    readonly saveDir: string;
    readonly host: string;

    readonly _mangaFetcherMainLooper: NodeJS.Timer;

    _taskCompleted: boolean = false;
    _working: boolean = false;
    _loadedImageNumbers: number[] = [];
    _currentPageNum: number = 0;
    _totalPageCount: number = 0;
    _taskRecorder: IterableIterator<string>;
    _nextPageClicker: NodeJS.Timer | undefined;

    constructor(
        page: Page,
        task: Map<string, string>,
        mainTimerInterval: number = 5000,
        saveDir: string = "./manga/",
        host: string = "https://www.xmanhua.com"
    ) {
        this.page = page;
        this.task = task;
        if (saveDir.charAt(saveDir.length - 1) != "/") {
            saveDir += "/";
        }
        // TODO: 处理目录不存在的情况
        this.saveDir = saveDir;
        this.host = host;

        this._taskRecorder = task.keys();

        this._mangaFetcherMainLooper = setInterval(() => {
            console.log(
                `当前页码${this._currentPageNum}/${this._totalPageCount}`
            );
            console.log(`已加载图片:${this._loadedImageNumbers.toString()}`);

            if (!this._working && !this._taskCompleted) {
                this._continueFetchingOneEpisode().then((flag: number) => {
                    if (flag != 0) {
                        console.warn(`网页将关闭! 代号:${flag}`);
                        this.stop();
                        clearInterval(this._mangaFetcherMainLooper);
                    }
                });
            }
        }, mainTimerInterval);
    }

    async _continueFetchingOneEpisode(): Promise<number> {
        const episodeName: string | undefined = this._taskRecorder.next().value;

        if (episodeName == undefined) {
            console.log("所有任务已完成!");
            return 1;
        }
        console.log("开始工作");
        this._working = true;
        const episodePath: string = this.task.get(episodeName)!;
        // 添加网页响应监听器，用于获取漫画图像。
        const saveDir = (this.saveDir + episodeName + "/").replace("\\", "/");
        if (!existsSync(saveDir)) {
            mkdirSync(saveDir);
        }
        this.page.removeAllListeners();
        this.page.on("response", async (resp: HTTPResponse): Promise<void> => {
            const url: string = resp.url();
            if (url.match(/^.+\/\d{1,3}_\d{4}\.(jpg|png)\??.*/g)) {
                console.log("捕获图片:" + url);
                const fileName: string = url.match(
                    /\d{1,3}_\d{4}\.(jpg|png)/g
                )![0];
                const bf: Buffer = await resp.buffer();

                const imageNumber = Number(fileName.split("_", 1)[0]);
                if (!this._loadedImageNumbers.includes(imageNumber)) {
                    this._loadedImageNumbers.push(imageNumber);
                }

                writeFileSync(saveDir + fileName, bf, {
                    flag: "w+",
                });
            }
        });
        // 转到漫画阅读所在URL
        await this.page.goto(this.host + episodePath);
        // 获取漫画总页数，失败将返回!
        // TODO: 当前 a.chapterpage 在未加载完成下将直接停止任务，为增加稳定性需要重构。
        await ((sleepTime: number): Promise<null> =>
            new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve(null);
                }, sleepTime);
            }))(1000); // 延迟一秒
        const pageListHandle: ElementHandle<Element>[] = await this.page.$$(
            "a.chapterpage"
        );
        if (pageListHandle.length > 0) {
            this._totalPageCount = pageListHandle.length;
            console.log("本集总页数：" + pageListHandle.length);
        } else if (episodeName.match(/[\(（]\d+p[\)）]/g)) {
            this._totalPageCount = Number(
                episodeName.match(/[\(（]\d+p[\)）]/g)![0].match(/\d+/)![0]
            );
            if (this._totalPageCount == NaN) {
                console.error(`获取漫画页数失败！${episodeName}将被跳过`);
                this._working = false;
                return 0;
            }
        } else {
            console.error(`获取漫画页数失败！${episodeName}将被跳过`);
            this._working = false;
            return 0;
        }
        // 创建一个点击器，它将以固定的周期点击漫画图像以跳转到下一页
        // TODO: 自定义_nextPageTimer周期
        this._nextPageClicker = setInterval(async (): Promise<void> => {
            const selectedElementHandle: ElementHandle<Element> | null =
                await this.page.$("img#cp_image");
            if (selectedElementHandle == null) {
                console.log("选择器没有定位到img#cp_image，图片未加载完成");
                return;
            }

            const currentPageHandle: ElementHandle<Element> | null =
                await this.page.$("#lbcurrentpage");
            if (currentPageHandle == null) {
                console.error("Could not find currentPage's element");
                return;
            }
            this._currentPageNum = await this.page
                .evaluate(
                    (currentPageElement: Element): number =>
                        Number(currentPageElement.innerHTML),
                    currentPageHandle
                )
                .catch((reason) => -1);
            await currentPageHandle.dispose();

            if (this._loadedImageNumbers.includes(this._currentPageNum)) {
                await selectedElementHandle.click();
            }
            selectedElementHandle.dispose();

            if (
                this._loadedImageNumbers.length == this._totalPageCount &&
                this._totalPageCount > 0
            ) {
                this._currentPageNum = 0;
                this._totalPageCount = 0;
                this._loadedImageNumbers.length = 0;
                this._working = false;
                clearInterval(this._nextPageClicker!);
            }
        }, 2500);
        return 0;
    }

    getTaskCompleted(): boolean {
        return this._taskCompleted;
    }

    stop(): void {
        this.page.removeAllListeners();
        this._taskCompleted = true;
        if (!this.page.isClosed()) {
            this.page.close();
        }
    }
}
