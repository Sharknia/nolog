import { QueryDatabaseResponse } from '@notionhq/client/build/src/api-endpoints';
import { NotionClientWithRetry } from '../apis/notionClientWithRetry';
import { NotionAPI } from '../apis/notionapi';
import { PageStatus } from '../types/enums';

export class DataBase {
    private static instance: DataBase | null = null;

    private notion: NotionClientWithRetry;
    private databaseId: string;
    public database: QueryDatabaseResponse;

    public pageIds: { pageId: string }[] = [];

    private constructor(notion: NotionClientWithRetry, databaseId: string) {
        this.notion = notion;
        this.databaseId = databaseId;
        this.database = {} as QueryDatabaseResponse;
    }

    public static async create(
        databaseid: string,
        filterUdate?: string,
    ): Promise<DataBase> {
        if (!this.instance) {
            const notionApi: NotionAPI = await NotionAPI.create();

            this.instance = new DataBase(notionApi.client, databaseid);
            this.instance.database = await this.instance.queryDatabase();
        }
        return this.instance;
    }

    public async queryDatabase(): Promise<QueryDatabaseResponse> {
        try {
            const response: QueryDatabaseResponse =
                await this.notion.databasesQuery({
                    database_id: this.databaseId,
                    filter: {
                        or: [
                            {
                                property: '상태',
                                select: {
                                    equals: PageStatus.Ready,
                                },
                            },
                            {
                                property: '상태',
                                select: {
                                    equals: PageStatus.ToBeDeleted,
                                },
                            },
                        ],
                    },
                });
            // pageId 리스트 업데이트
            this.pageIds = response.results.map((page) => ({
                pageId: page.id,
            }));
            return response;
        } catch (error) {
            console.error('Error querying the database:', error);
            throw error;
        }
    }
}
