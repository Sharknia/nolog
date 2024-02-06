import { NotionClientWithRetry } from './notionClientWithRetry';

export class NotionAPI {
    private static instance: NotionAPI | null = null;
    public client: NotionClientWithRetry;

    private constructor(notionKey: string) {
        this.client = new NotionClientWithRetry({ auth: notionKey });
    }

    public static async create(notionKey: string = '') {
        if (!this.instance) {
            if (!notionKey) {
                throw new Error('NOTION_KEY is missing');
            }
            this.instance = new NotionAPI(notionKey);
        }
        return this.instance;
    }
}
