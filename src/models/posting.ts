import { DataBase } from "./database";

export class Posting {
    public pageIds: { pageId: string }[] = [];
    private static _instance?: Posting; // Singleton 인스턴스 저장용
    public dbInstance?: DataBase;

    private constructor() { }

    public static getInstance(): Posting {
        if (!this._instance) {
            this._instance = new Posting();
        }
        return this._instance;
    }

    public async initialize(): Promise<void> {
        try {
            this.dbInstance = await DataBase.create();
            console.log(this.dbInstance.pageIds);
        } catch (error) {
            console.error("Error creating database instance:", error);
        }
    }
}

// 사용 예시
const posting = Posting.getInstance();
posting.initialize();
