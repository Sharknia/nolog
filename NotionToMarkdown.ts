import * as dotenv from "dotenv";
import { Client } from "@notionhq/client";
import { QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";

class NotionToMarkdown {
    private notion: Client;
    private databaseId: string;
    public database: QueryDatabaseResponse;

    private constructor(notion: Client, databaseId: string) {
        this.notion = notion;
        this.databaseId = databaseId;
        this.database = {} as QueryDatabaseResponse;
    }

    public static async create(): Promise<NotionToMarkdown> {
        dotenv.config();

        if (!process.env.NOTION_KEY || !process.env.NOTION_DATABASE_ID) {
            throw new Error("Environment variable is not defined.");
        }

        const notion = new Client({ auth: process.env.NOTION_KEY });
        const instance = new NotionToMarkdown(notion, process.env.NOTION_DATABASE_ID);
        instance.database = await instance.queryDatabase();

        return instance;
    }

    public async queryDatabase(): Promise<QueryDatabaseResponse> {
        try {
            const response = await this.notion.databases.query({
                database_id: this.databaseId,
                filter: {
                    and: [
                        {
                            property: '상태',
                            select: {
                                equals: "POST",
                            },
                        },
                        {
                            property: 'update',
                            date: {
                                on_or_after: "2023-09-03",
                            },
                        },
                    ],
                },
                sorts: [
                    {
                        property: 'update',
                        direction: 'descending',
                    },
                ],
            });
            return response;
        } catch (error) {
            console.error("Error querying the database:", error);
            throw error;
        }
    }

    private async retrievePage(pageId: string): Promise<void> {
        const pageResponse = await this.notion.pages.retrieve({ page_id: pageId });
        console.log("----------Page Properties----------");
        console.log(JSON.stringify(pageResponse, null, 2));
    }

    private async listBlockChildren(blockId: string): Promise<void> {
        const childrenListResponse = await this.notion.blocks.children.list({
            block_id: blockId,
            page_size: 50,
        });
        console.log("----------Page Block List----------");
        console.log(JSON.stringify(childrenListResponse, null, 2));
    }
}

// 사용 예제:
NotionToMarkdown.create().then(handler => {
    console.log(JSON.stringify(handler.database, null, 2));  // database 속성 출력
});
