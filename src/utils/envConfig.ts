import * as dotenv from "dotenv";

export class EnvConfig {
    private static instance: EnvConfig | null = null;

    public notionKey: string | null = null;
    public databaseid: string | null = null;

    private constructor() {
        dotenv.config({ path: `${__dirname}/../../.env` });
        this.notionKey = process.env.NOTION_KEY || "";
        this.databaseid = process.env.NOTION_DATABASE_ID || "";
    }

    public static create() {
        if (!this.instance) {
            this.instance = new EnvConfig();
        }
        return this.instance;
    }
}