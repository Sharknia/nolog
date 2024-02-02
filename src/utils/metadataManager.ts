import { promises as fs } from 'fs';
import { join } from 'path';
import { EnvConfig } from './envConfig';

const METADATA_FILE_PATH = './pageMetadata.json';

interface PageMetadata {
    path: string;
}

interface Metadata {
    [pageIdx: string]: PageMetadata;
}

export class MetadataManager {
    private static instance: MetadataManager;
    private metadata: Metadata | null;
    private envConfig: EnvConfig;

    private constructor() {
        this.metadata = null;
        this.envConfig = EnvConfig.create();
    }

    /**
     * 인스턴스를 반환하는 메서드입니다.
     * @returns {MetadataManager} MetadataManager 인스턴스
     */
    public static async getInstance(): Promise<MetadataManager> {
        if (!this.instance) {
            this.instance = new MetadataManager();
            await this.instance.loadMetadata();
        }
        return this.instance;
    }

    /**
     * 메타데이터를 로드합니다.
     * @returns {Promise<void>} Promise 객체
     */
    public async loadMetadata(): Promise<void> {
        try {
            const data = await fs.readFile(METADATA_FILE_PATH, 'utf8');
            this.metadata = JSON.parse(data) as Metadata;
            console.log('메타데이터 파일 읽기 성공:', this.metadata);
        } catch (error) {
            console.error('메타데이터 파일 읽기 오류:', error);
            this.metadata = {};
        }
    }

    /**
     * 메타데이터를 반환합니다.
     * @returns 메타데이터 객체 또는 null
     */
    public getMetadata(): Metadata | null {
        return this.metadata;
    }

    /**
     * 페이지 메타데이터를 업데이트합니다.
     *
     * @param pageIdx 페이지 식별자
     * @param pageData 페이지 메타데이터
     */
    public updatePageMetadata(pageIdx: string, pageData: PageMetadata): void {
        if (!this.metadata) {
            this.metadata = {};
        }
        this.metadata[pageIdx] = pageData;
        console.log(`메타 데이터 업데이트 [${pageIdx}]`);
    }

    /**
     * 페이지 메타데이터를 삭제합니다.
     * @param pageIdx 삭제할 페이지의 ID
     */
    public deletePageMetadata(pageIdx: string): void {
        if (this.metadata && this.metadata[pageIdx]) {
            delete this.metadata[pageIdx];
        }
    }

    /**
     * 메타데이터를 파일에 저장합니다.
     * @returns 메타데이터가 성공적으로 저장될 때 해결되는 Promise입니다.
     */
    public async saveMetadata(): Promise<void> {
        if (this.metadata) {
            try {
                await fs.writeFile(
                    METADATA_FILE_PATH,
                    JSON.stringify(this.metadata, null, 2),
                );
                console;
            } catch (error) {
                console.error('메타데이터 파일 저장 오류:', error);
            }
        }
    }

    /**
     * 지정된 페이지 인덱스에 대한 메타데이터를 삭제합니다.
     * @param pageIdx 삭제할 페이지 인덱스
     * @returns 삭제 작업이 완료된 후에는 아무 값도 반환하지 않습니다.
     */
    public async deleteFromMetadata(pageIdx: string): Promise<void> {
        if (this.metadata && this.metadata[pageIdx]) {
            let dir = join(
                this.envConfig.saveDir!,
                this.metadata[pageIdx].path,
            );
            try {
                await fs.rm(dir, { recursive: true });
                console.log('파일 삭제 성공:', dir);
            } catch (error) {
                console.error('파일 삭제 오류:', error);
            }
        }
    }
}
