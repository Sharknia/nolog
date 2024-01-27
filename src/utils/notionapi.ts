import { Client } from "@notionhq/client";

export class NotionAPI {
    private static instance: NotionAPI | null = null;
    public client: Client;

    private constructor(notionKey: string) {
        this.client = new Client({ auth: notionKey });
    }

    public static async create(notionKey: string = "") {
        if (!this.instance) {
            if (!notionKey) {
                throw new Error("NOTION_KEY is missing");
            }
            this.instance = new NotionAPI(notionKey);
        }
        return this.instance;
    }
}