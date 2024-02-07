import { promises as fs } from 'fs';
import { join } from 'path';
import { EnvConfig } from './envConfig';

const METADATA_FILE_PATH = './pageMetadata.json';

interface PageMetadata {
    path: string;
}

interface PageMetadata {
    path: string;
}

interface Metadata {
    Owner: {
        GIT_USER_NAME: string;
    };
    [pageIdx: string]: PageMetadata | { GIT_USER_NAME: string };
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
    public static async create(): Promise<MetadataManager> {
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
            if (data.trim() === '') {
                await this.initMetadata();
            } else {
                const loadedMetadata = JSON.parse(data);
                // Owner가 존재하는지 및 GIT_USER_NAME이 현재 설정과 일치하는지 검사
                if (
                    !loadedMetadata.Owner ||
                    loadedMetadata.Owner.GIT_USER_NAME !==
                        this.envConfig.gitUserName
                ) {
                    console.log(
                        '[metadataManager.ts] 메타데이터의 GIT_USER_NAME이 현재 설정과 다릅니다. 메타데이터를 초기화합니다.',
                    );
                    await this.initMetadata();
                } else {
                    this.metadata = loadedMetadata;
                    console.log(
                        '[metadataManager.ts] 메타데이터 파일 읽기 성공',
                    );
                }
            }
        } catch (error) {
            console.error(
                '[metadataManager.ts] 메타데이터 파일 읽기 실패:',
                error,
            );
            await this.initMetadata();
        }
    }

    private async initMetadata(): Promise<void> {
        try {
            const initialData: Metadata = {
                Owner: {
                    GIT_USER_NAME: this.envConfig.gitUserName!,
                },
                // 초기 페이지 메타데이터는 필요에 따라 추가
            };
            await fs.writeFile(METADATA_FILE_PATH, JSON.stringify(initialData));
            this.metadata = initialData;
            console.log('[metadataManager.ts] 메타데이터 파일 초기화 성공');
        } catch (error) {
            console.error(
                '[metadataManager.ts] 메타데이터 파일 초기화 오류:',
                error,
            );
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
            this.initMetadata();
        }
        this.metadata![pageIdx] = pageData;
        console.log(`[metadataManager.ts] 메타 데이터 업데이트 [${pageIdx}]`);
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
                console.log('[metadataManager.ts] 메타데이터 파일 저장 성공');
            } catch (error) {
                console.error(
                    '[metadataManager.ts] 메타데이터 파일 저장 오류:',
                    error,
                );
            }
        }
    }

    /**
     * 지정된 페이지 인덱스에 대한 메타데이터를 삭제합니다.
     * @param pageIdx 삭제할 페이지 인덱스
     * @returns 삭제 작업이 완료된 후에는 아무 값도 반환하지 않습니다.
     */
    public async deleteFromMetadata(pageIdx: string): Promise<void> {
        // 메타데이터가 존재하며, 해당 pageIdx가 'Owner'가 아닌지 확인
        if (this.metadata && pageIdx !== 'Owner' && this.metadata[pageIdx]) {
            // 해당 pageIdx의 메타데이터가 PageMetadata 타입인지 확인
            const pageData = this.metadata[pageIdx];
            if (typeof pageData === 'object' && 'path' in pageData) {
                let dir = join(this.envConfig.saveDir!, pageData.path);
                try {
                    await fs.rm(dir, { recursive: true });
                    console.log('[metadataManager.ts] 파일 삭제 성공:', dir);
                    // 메타데이터에서도 해당 항목 삭제
                    delete this.metadata[pageIdx];
                    // 변경사항을 메타데이터 파일에 반영
                    await fs.writeFile(
                        METADATA_FILE_PATH,
                        JSON.stringify(this.metadata),
                    );
                } catch (error) {
                    console.error(
                        '[metadataManager.ts] 파일 삭제 오류:',
                        error,
                    );
                }
            }
        }
    }
}
