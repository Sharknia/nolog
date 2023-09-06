import { DataBase } from "./database";
import { NotionAPI } from "../utils/notionapi";
import { EnvConfig } from "../utils/envConfig";
import { Client } from "@notionhq/client";

export class Posting {
    public pageIds: { pageId: string }[] = [];
    private static instance: Posting | null = null;

    public dbInstance?: DataBase;
    public notionApi?: NotionAPI;
    public EnvConfig?: EnvConfig;

    private constructor() { }

    public static create(): Posting {
        if (!this.instance) {
            this.instance = new Posting();
        }
        return this.instance;
    }

    public async start(): Promise<void> {
        try {
            this.EnvConfig = EnvConfig.create();
            const notionkey: string = this.EnvConfig.notionKey || "";
            const databaseid: string = this.EnvConfig.databaseid || "";
            this.notionApi = await NotionAPI.create(notionkey);
            this.dbInstance = await DataBase.create(databaseid);
            console.log(this.dbInstance.pageIds);
        } catch (error) {
            console.error("Error creating database instance:", error);
        }
    }
}