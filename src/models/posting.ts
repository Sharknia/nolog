import { EnvConfig } from '../utils/envConfig';
import { NotionAPI } from '../utils/notionapi';
import { DataBase } from './database';
import { Page } from './page';

export class Posting {
    public pageIds: { pageId: string }[] = [];
    private static instance: Posting | null = null;

    public dbInstance?: DataBase;
    public notionApi?: NotionAPI;
    public EnvConfig?: EnvConfig;

    private constructor() {}

    public static create(): Posting {
        if (!this.instance) {
            this.instance = new Posting();
        }
        return this.instance;
    }

    public async start(): Promise<void> {
        console.log('[posting.ts] start!');
        try {
            this.EnvConfig = EnvConfig.create();
            const notionkey: string = this.EnvConfig.notionKey || '';
            const databaseid: string = this.EnvConfig.databaseid || '';
            this.notionApi = await NotionAPI.create(notionkey);
            this.dbInstance = await DataBase.create(databaseid, '');

            console.log('[posting.ts] page 순회 시작');
            for (const item of this.dbInstance.pageIds) {
                const page: Page = await Page.create(item.pageId);
            }
        } catch (error) {
            console.error('Error creating database instance:', error);
        }
    }
}
