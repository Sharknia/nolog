import { Client } from "@notionhq/client";
import { QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import * as dotenv from "dotenv";
import { NotionAPI } from "./notionapi";

export class DataBase {
    private static instance: DataBase | null = null;

    private notion: Client;
    private databaseId: string;
    public database: QueryDatabaseResponse;

    public pageIds: { pageId: string }[] = [];

    private constructor(notion: Client, databaseId: string) {
        this.notion = notion;
        this.databaseId = databaseId;
        this.database = {} as QueryDatabaseResponse;
    }

    public static async create(filterUdate?: string): Promise<DataBase> {
        if (!this.instance) {
            dotenv.config({ path: `${__dirname}/../../.env` });
            const notionkey: string = process.env.NOTION_KEY || "";
            const databaseid: string = process.env.NOTION_DATABASE_ID || "";

            if (!notionkey || !databaseid) {
                throw new Error("NOTION_KEY or NOTION_DATABASE_ID is missing in the environment variables.");
            }

            let notionApi = await NotionAPI.create(notionkey);
            const notion = notionApi.client;
            
            this.instance = new DataBase(notion, databaseid);
            if (filterUdate === "lastest") {
                const today = new Date();
                today.setDate(today.getDate() - 1);
                filterUdate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            }
            this.instance.database = await this.instance.queryDatabase(filterUdate);
        }
        return this.instance;
    }

    public async queryDatabase(filterUdate?: string): Promise<QueryDatabaseResponse> {
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
                        ...(filterUdate ? [{
                            property: 'update',
                            date: { on_or_after: filterUdate }
                        }] : []),
                    ]
                },
                sorts: [
                    {
                        property: 'update',
                        direction: 'descending',
                    },
                ],
            });
            // pageId 리스트 업데이트
            this.pageIds = response.results.map(page => ({ pageId: page.id }));
            return response;
        } catch (error) {
            console.error("Error querying the database:", error);
            throw error;
        }
    }
}