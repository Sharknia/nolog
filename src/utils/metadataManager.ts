import { promises as fs } from 'fs';

const METADATA_FILE_PATH = './pageMetadata.json';

interface PageMetadata {
    url: string;
}

interface Metadata {
    [pageId: string]: PageMetadata;
}

export class MetadataManager {
    private static instance: MetadataManager;
    private metadata: Metadata | null;

    private constructor() {
        this.metadata = null;
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
     * @param pageId 페이지 식별자
     * @param pageData 페이지 메타데이터
     */
    public updatePageMetadata(pageId: string, pageData: PageMetadata): void {
        if (!this.metadata) {
            this.metadata = {};
        }
        this.metadata[pageId] = pageData;
    }

    /**
     * 페이지 메타데이터를 삭제합니다.
     * @param pageId 삭제할 페이지의 ID
     */
    public deletePageMetadata(pageId: string): void {
        if (this.metadata && this.metadata[pageId]) {
            delete this.metadata[pageId];
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
            } catch (error) {
                console.error('메타데이터 파일 저장 오류:', error);
            }
        }
    }
}
