import * as dotenv from "dotenv";
import { Client } from "@notionhq/client";

dotenv.config();

const pageId: string | undefined = process.env.NOTION_PAGE_ID;
const key: string | undefined = process.env.NOTION_KEY;

const notion = new Client({ auth: key });

(async () => {
    try {
        const response = await notion.databases.query({ database_id: pageId! });  // '!'는 값이 undefined가 아님을 확신할 때 사용
        response.results.forEach(page => {
            (async () => {
                const pageId: string = page.id;
                const pageResponse = await notion.pages.retrieve({ page_id: pageId });
                console.log("----------Page Properties----------");
                console.log(JSON.stringify(pageResponse, null, 2));

                (async () => {
                    const blockId: string = pageId;
                    const blockResponse = await notion.blocks.retrieve({
                        block_id: blockId,
                    });
                    console.log("----------Page Contents as Block----------");
                    console.log(JSON.stringify(blockResponse, null, 2));
                })();

                (async () => {
                    const blockId: string = pageId;
                    const childrenListResponse = await notion.blocks.children.list({
                        block_id: blockId,
                        page_size: 50,
                    });
                    console.log("----------Page Block List----------");
                    console.log(JSON.stringify(childrenListResponse, null, 2));
                })();
            })();
        });
    } catch (error) {
        console.error("Error querying the database:", error);
    }
})();
