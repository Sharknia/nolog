import { Client } from '@notionhq/client';
import { QueryDatabaseResponse } from '@notionhq/client/build/src/api-endpoints';
import { NotionAPI } from '../utils/notionapi';

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

    public static async create(
        databaseid: string,
        filterUdate?: string,
    ): Promise<DataBase> {
        if (!this.instance) {
            const notionApi: NotionAPI = await NotionAPI.create();

            this.instance = new DataBase(notionApi.client, databaseid);
            if (filterUdate === 'lastest') {
                // KST로 현재 시간 설정
                const nowInKST = new Date(
                    new Date().toLocaleString('en-US', {
                        timeZone: 'Asia/Seoul',
                    }),
                );
                // KST에서 24시간을 뺌
                nowInKST.setHours(nowInKST.getHours() - 36);
                // UTC로 변환
                filterUdate = nowInKST.toISOString().split('T')[0];
            }
            this.instance.database = await this.instance.queryDatabase(
                filterUdate,
            );
        }
        return this.instance;
    }

    public async queryDatabase(
        filterUdate?: string,
    ): Promise<QueryDatabaseResponse> {
        try {
            const response: QueryDatabaseResponse =
                await this.notion.databases.query({
                    database_id: this.databaseId,
                    filter: {
                        and: [
                            {
                                property: '상태',
                                select: {
                                    equals: 'POST',
                                },
                            },
                            ...(filterUdate
                                ? [
                                      {
                                          property: 'update',
                                          date: { on_or_after: filterUdate },
                                      },
                                  ]
                                : []),
                            {
                                property: 'title',
                                title: {
                                    equals: 'NotionAPI를 활용한 자동 포스팅(4)',
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
