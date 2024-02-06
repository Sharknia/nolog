import { Client } from '@notionhq/client';

export class NotionClientWithRetry extends Client {
    private maxRetries: number;
    private retryDelay: number;

    constructor(options: {
        auth: string;
        maxRetries?: number;
        retryDelay?: number;
    }) {
        super({ auth: options.auth });
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 1000; // 기본 1초 대기
    }

    private async retryAPI<T>(
        operation: () => Promise<T>,
        retries: number = this.maxRetries,
    ): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            if (retries <= 0) throw error;
            console.log(
                `[retryAPI] ${this.maxRetries - retries} retrying.....`,
            );
            await new Promise((resolve) =>
                setTimeout(resolve, this.retryDelay),
            );
            return this.retryAPI(operation, retries - 1);
        }
    }

    public async blocksRetrieve(args: { block_id: string }) {
        return this.retryAPI(() => this.blocks.retrieve(args));
    }

    public async databasesQuery(args: {
        database_id: string;
        filter?: any;
        sorts?: any;
    }) {
        return this.retryAPI(() => this.databases.query(args));
    }

    public async pagesRetrieve(args: { page_id: string }) {
        return this.retryAPI(() => this.pages.retrieve(args));
    }
}
