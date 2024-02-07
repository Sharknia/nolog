import * as dotenv from 'dotenv';

export class EnvConfig {
    private static instance: EnvConfig | null = null;

    public notionKey: string;
    public databaseid: string;
    public blogUrl: string;
    public saveDir: string;
    public saveSubDir: string | null; // 선택적
    public blogRepo: string;
    public gitUserName: string;
    public gitUserEmail: string;

    private constructor() {
        dotenv.config({ path: `${__dirname}/../../.env` });

        // 필수 환경변수 확인
        this.notionKey =
            process.env.NOTION_KEY ?? this.throwConfigError('NOTION_KEY');
        this.databaseid =
            process.env.NOTION_DATABASE_ID ??
            this.throwConfigError('NOTION_DATABASE_ID');
        this.blogUrl =
            process.env.BLOG_URL ?? this.throwConfigError('BLOG_URL');
        this.saveDir =
            process.env.SAVE_DIR ?? this.throwConfigError('SAVE_DIR');
        this.blogRepo =
            process.env.BLOG_REPO ?? this.throwConfigError('BLOG_REPO');
        this.gitUserName =
            process.env.GIT_USER_NAME ?? this.throwConfigError('GIT_USER_NAME');
        this.gitUserEmail =
            process.env.GIT_USER_EMAIL ??
            this.throwConfigError('GIT_USER_EMAIL');
        this.saveSubDir = process.env.SAVE_SUB_DIR || null; // 선택적, 없으면 null

        // URL 및 디렉토리 경로 처리
        if (this.blogUrl.endsWith('/')) {
            this.blogUrl = this.blogUrl.slice(0, -1);
        }
        if (!this.saveDir.endsWith('/')) {
            this.saveDir += '/';
        }
        if (this.saveSubDir && !this.saveSubDir.endsWith('/')) {
            this.saveSubDir += '/';
        }
    }

    private throwConfigError(varName: string): never {
        throw new Error(`환경 변수 ${varName}이(가) 설정되지 않았습니다.`);
    }

    public static create() {
        if (!this.instance) {
            this.instance = new EnvConfig();
        }
        return this.instance;
    }
}
