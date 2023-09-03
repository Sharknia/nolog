import * as dotenv from "dotenv";
import { Client } from "@notionhq/client";
import { QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";

class DataBase {
    private notion: Client;
    private databaseId: string;
    private database: QueryDatabaseResponse;

    filter: Filter;

    //데이터베이스는 Pages의 리스트를 담고 있다. 
    public list: string = "Default Title";

    private constructor(notion: Client, databaseId: string, filterUdate?: string) {
        this.notion = notion;
        this.databaseId = databaseId;
        this.database = {} as QueryDatabaseResponse;

        this.filter = {
            and: [
                {
                    property: '상태',
                    select: {
                        equals: "POST",
                    },
                },
                {
                    property: 'update',
                    date: filterUdate ?
                        { on_or_after: filterUdate } :
                        { after: filterUdate }
                },
            ],
        };
    }

    public static async create(databaseid: string, notionkey: string, filterUdate?: string): Promise<DataBase> {
        const notion = new Client({ auth: notionkey });
        //수정필요
        const instance = new DataBase(notion, databaseid, filterUdate);
        instance.database = await instance.queryDatabase(filterUdate);

        return instance;
    }

    public async queryDatabase(filterUdate?: string): Promise<QueryDatabaseResponse> {
        try {
            const response = await this.notion.databases.query({
                database_id: this.databaseId,
                // filter: this.filter,
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
}

interface Filter {
    and: Condition[];
}

interface Condition {
    property: string;
    select?: { equals: string };
    date?: DateCondition;
}

interface DateCondition {
    on_or_after?: string;
    after?: string;
}
