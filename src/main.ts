import { Browser, launch, Page } from "puppeteer-core";
import XManHuaCrawler from "./XManHuaCrawler";
import { CopyMangaFetcher } from "./copyMangaCrawler";

const targetHref: string = "/577xm/";

function sliceMap<K, V>(
    map: Map<K, V>,
    start?: number,
    end?: number
): Map<K, V> {
    let resultEntries: [K, V][] = [];
    for (const entry of map.entries()) {
        resultEntries.push(entry);
    }
    return new Map(resultEntries.slice(start, end));
}

(async () => {
    const app = new XManHuaCrawler(await launch(
        {
            executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
            headless: true
        }
    ));
    
    const episodeMap = (await app.readEpisodeList(targetHref))!;
    
    app.newTask(sliceMap(episodeMap, 70));

    /* const browser: Browser = await launch({
        executablePath:
            "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        headless: true,
    });
    const page = await browser.newPage();
    const fetcher: CopyMangaFetcher = new CopyMangaFetcher(
        page,
        new Map<string, string>()
    );
    await fetcher.jumpToTargetEpisode(
        "https://copymanga.com/comic/modujingbingdenuli/chapter/52615840-10a4-11e9-b68d-00163e0ca5bd"
    );
    browser.close(); */
})();
