import { launch } from "puppeteer-core";
import XManHuaCrawler from "./XManHuaCrawler";

const targetHref: string = "/1474xm/";

function sliceMap<K,V>(map: Map<K, V>, start?: number, end?: number):Map<K,V> {
    let resultEntries: [K,V][] = [];
    for (const entry of map.entries()) {
        resultEntries.push(entry);
    }
    return new Map(resultEntries.slice(start,end));
}

(async () => {
    const app = new XManHuaCrawler(await launch(
        {
            executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
            headless: true
        }
    ));
    
    const episodeMap = (await app.readEpisodeList(targetHref))!;
    
    app.newTask(sliceMap(episodeMap, 0, 9));
})();
