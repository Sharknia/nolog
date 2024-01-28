import { DataBase } from './database';
import { Page } from './page';
import { NotionAPI } from '../utils/notionapi';
import { EnvConfig } from '../utils/envConfig';

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
        try {
            this.EnvConfig = EnvConfig.create();
            const notionkey: string = this.EnvConfig.notionKey || '';
            const databaseid: string = this.EnvConfig.databaseid || '';
            this.notionApi = await NotionAPI.create(notionkey);
            this.dbInstance = await DataBase.create(databaseid);

            for (const item of this.dbInstance.pageIds) {
                const page: Page = await Page.create(item.pageId);
                console.log(`start - pageTitle : ${page.pageTitle}`);
                console.log(`start - properties : ${page.properties}`);
            }
        } catch (error) {
            console.error('Error creating database instance:', error);
        }
    }
}
