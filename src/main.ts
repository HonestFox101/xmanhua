import { launch } from "puppeteer-core";
import CopyMangaCrawler from "./copyMangaFetcher";

const host: string = "https://copymanga.com";
const targetHref: string = "/comic/yingfengongxueqingchuanshangyifu";

function sliceMap<K,V>(map: Map<K, V>, start?: number, end?: number):Map<K,V> {
    let resultEntries: [K,V][] = [];
    for (const entry of map.entries()) {
        resultEntries.push(entry);
    }
    return new Map(resultEntries.slice(start,end));
}

(async () => {
    const app = new CopyMangaCrawler(await launch(
        {
            executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
            headless: false
        }
    ));
    let episodeMap = await app.readEpisodeList(targetHref);
    
    if (episodeMap == null) {
        console.log("未能获取章节");
        return;
    }

    for (const entry of episodeMap.entries()) {
        console.log(`${entry[0]} ===> ${entry[1]}`);
    }

    await app.browser.close();
})();
