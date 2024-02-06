import { NotionAPI } from './src/apis/notionapi';
import { DataBase } from './src/models/database';
import { Page } from './src/models/page';
import { EnvConfig } from './src/utils/envConfig';
import { MetadataManager } from './src/utils/metadataManager';

async function start() {
    console.log('[index.ts] start!');
    try {
        const metadataManager = await MetadataManager.create();
        const envConfig = EnvConfig.create();
        const notionkey: string = envConfig.notionKey || '';
        const databaseid: string = envConfig.databaseid || '';

        const notionApi = await NotionAPI.create(notionkey);
        const dbInstance = await DataBase.create(databaseid, '');

        console.log('[index.ts] page 순회 시작');
        for (const item of dbInstance.pageIds) {
            await Page.create(item.pageId);
        }

        await metadataManager.saveMetadata();
        console.log('[index.ts] 포스팅 갱신 작업 완료');
    } catch (error) {
        console.error('Error in processing:', error);
    }
}

(async () => {
    await start(); // start
})();
