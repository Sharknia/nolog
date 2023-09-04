import { Client } from "@notionhq/client";
import { QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import * as dotenv from "dotenv";


export class DataBase {
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
        dotenv.config({ path: `${__dirname}/../../.env` });
        const notionkey: string = process.env.NOTION_KEY || "";
        const databaseid: string = process.env.NOTION_DATABASE_ID || "";

        if (!notionkey || !databaseid) {
            throw new Error("NOTION_KEY or NOTION_DATABASE_ID is missing in the environment variables.");
        }

        const notion = new Client({ auth: notionkey });
        const instance = new DataBase(notion, databaseid);
        if (filterUdate == "lastest") {
            const today = new Date(); // 현재 날짜와 시간을 가져옵니다.
            today.setDate(today.getDate() - 1); // 날짜를 하루 전으로 설정합니다.

            // YYYY-MM-DD 형식의 문자열로 날짜를 가져옵니다.
            filterUdate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        }
        instance.database = await instance.queryDatabase(filterUdate);
        return instance;
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