require("dotenv").config();
const { Client } = require("@notionhq/client");

const pageId = process.env.NOTION_PAGE_ID;
const key = process.env.NOTION_KEY;

const notion = new Client({ auth: key });

(async () => {
    try {
        const response = await notion.databases.query({ database_id: pageId });
        // console.log(response);
        //페이지들을 돌면서 id로 페이지를 읽어온다. 
        response.results.forEach(page => {
            (async () => {
                const pageId = page.id;
                //page properties
                const response = await notion.pages.retrieve({ page_id: pageId });
                console.log("----------Page Properties----------")
                console.log(JSON.stringify(response, null, 2));
                //page contents
                (async () => {
                    const blockId = pageId;
                    const response = await notion.blocks.retrieve({
                        block_id: blockId,
                    });
                    console.log("----------Page Contents as Block----------")
                    console.log(JSON.stringify(response, null, 2))
                })();
                (async () => {
                    const blockId = pageId;
                    const response = await notion.blocks.children.list({
                        block_id: blockId,
                        page_size: 50,
                    });
                    console.log("----------Page Block List----------");
                    console.log(JSON.stringify(response, null, 2));
                })();
            })();
        });
    } catch (error) {
        console.error("Error querying the database:", error);
    }
})();