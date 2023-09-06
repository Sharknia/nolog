import { Client } from "@notionhq/client";
import { QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import { NotionAPI } from "../utils/notionapi";
import { EnvConfig } from "../utils/envConfig";

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
            const envConfig: EnvConfig = EnvConfig.create();
            const notionkey: string = envConfig.notionKey || "";
            const databaseid: string = envConfig.databaseid || "";

            if (!notionkey || !databaseid) {
                throw new Error("NOTION_KEY or NOTION_DATABASE_ID is missing in the environment variables.");
            }

            const notionApi: NotionAPI = await NotionAPI.create(notionkey);

            this.instance = new DataBase(notionApi.client, databaseid);
            if (filterUdate === "lastest") {
                const today: Date = new Date();
                today.setDate(today.getDate() - 1);
                filterUdate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            }
            this.instance.database = await this.instance.queryDatabase(filterUdate);
        }
        return this.instance;
    }

    public async queryDatabase(filterUdate?: string): Promise<QueryDatabaseResponse> {
        try {
            const response: QueryDatabaseResponse = await this.notion.databases.query({
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