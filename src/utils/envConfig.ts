import * as dotenv from 'dotenv';

export class EnvConfig {
    private static instance: EnvConfig | null = null;

    public notionKey: string | null = null;
    public databaseid: string | null = null;
    public blogUrl: string | null = null;
    public saveDir: string | null = null;
    public saveSubDir: string | null = null;

    private constructor() {
        dotenv.config({ path: `${__dirname}/../../.env` });
        this.notionKey = process.env.NOTION_KEY || '';
        this.databaseid = process.env.NOTION_DATABASE_ID || '';
        this.blogUrl = process.env.BLOG_URL || '';
        this.saveDir = process.env.SAVE_DIR || '';
        this.saveSubDir = process.env.SAVE_SUB_DIR || '';

        // If blogUrl ends with a slash, remove it
        if (this.blogUrl && this.blogUrl.endsWith('/')) {
            this.blogUrl = this.blogUrl.slice(0, -1);
        }

        // If saveDir does not end with a slash, add it
        if (this.saveDir && !this.saveDir.endsWith('/')) {
            this.saveDir += '/';
        }

        // If saveSubDir does not end with a slash, add it
        if (this.saveSubDir && !this.saveSubDir.endsWith('/')) {
            this.saveSubDir += '/';
        }
    }

    public static create() {
        if (!this.instance) {
            this.instance = new EnvConfig();
        }
        return this.instance;
    }
}
