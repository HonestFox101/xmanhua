import { launch } from "puppeteer-core";
import App from "./XManHuaFetcher";

const host: string = "https://www.xmanhua.com";
const targetPath: string = "/25106xm/";

(async () => {
    const app = new App(
        await launch({
            executablePath:
                "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
            headless: false,
        })
    );
    let resultMap: Map<string, string> | null = await app.readEpisodeList(
        host + targetPath
    );
    if (resultMap == null) {
        console.error("无法获取漫画列表");
        return;
    } else {
        console.log("找到以下的章节:");
        for (const EpisodeName of resultMap.keys()) {
            console.log(EpisodeName);
        }
        console.log("");
    }

    app.newTask(resultMap);

    /* const fetcherCount = 3;
    const fetchTasks: Map<string, string>[] = new Array(fetcherCount);
    for (let i = 0; i < fetchTasks.length; i++){
        fetchTasks[i] = new Map();
    }
    const entryIterator: IterableIterator<[string, string]> = resultMap.entries();
    resultMap = null;

    const loopIter = (function* (max: number) {
        let num = 0;
        while (true) {
            if (num >= max) {
                num = 0;
            }
            yield num++;
        }
    })(fetcherCount);

    for (
        let iteratorResult = entryIterator.next();
        !iteratorResult.done;
        iteratorResult = entryIterator.next()
    ) {
        const key:string = iteratorResult.value[0];
        const value:string = iteratorResult.value[1];
        const taskNum: number = loopIter.next().value;
        console.log(`set ${taskNum}: ${key} ==> ${value}`);
        fetchTasks[taskNum].set(key, value);
    }

    for (const task of fetchTasks) {
        app.newTask(task);
    } */
})();
