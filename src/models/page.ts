import { GetPageResponse } from '@notionhq/client/build/src/api-endpoints';
import { promises as fs } from 'fs';
import { join } from 'path';
import { EnvConfig } from '../utils/envConfig';
import { MarkdownConverter } from '../utils/markdownConverter';
import { NotionClientWithRetry } from '../utils/notionClientWithRetry';
import { NotionAPI } from '../utils/notionapi';
import { Block } from './block';
import { PropertyValue } from './types';

export class Page {
    private pageId: string;
    private notion: NotionClientWithRetry;

    public properties?: Record<string, PropertyValue>;
    public pageTitle?: string;
    public pageUrl?: string;
    public contentMarkdown?: string;

    private envConfig: EnvConfig;
    private constructor(pageId: string, notion: NotionClientWithRetry) {
        this.pageId = pageId;
        this.notion = notion;
        this.envConfig = EnvConfig.create();
    }

    private async init(page: Page) {
        // 페이지의 프로퍼티를 가져옵니다.
        const properties = await page.getProperties();
        // 페이지의 프로퍼티에서 데이터를 추출합니다.
        page.properties = await page.extractDataFromProperties(properties);

        let subDirPath = '';
        // saveSubDir 환경 변수가 null이 아닌 경우
        if (
            this.envConfig.saveSubDir != null &&
            this.envConfig.saveSubDir != ''
        ) {
            // saveSubDir을 '/'로 분리합니다.
            const subDirs = this.envConfig.saveSubDir.split('/');
            for (const subDir of subDirs) {
                if (subDir != null && subDir != '') {
                    // subDir이 페이지 프로퍼티에 있는 경우
                    if (subDir in page.properties) {
                        // 프로퍼티 값이 문자열인 경우에만 추가합니다.
                        if (typeof page.properties[subDir] === 'string') {
                            // subDirPath에 프로퍼티 값을 추가합니다.
                            subDirPath += `${page.properties[subDir]}/`;
                        } else if (Array.isArray(page.properties[subDir])) {
                            // 프로퍼티 값이 배열인 경우 오류를 발생시킵니다.
                            throw new Error(
                                `Property '${subDir}' is an array and cannot be included in the URL.`,
                            );
                        } else {
                            // 프로퍼티 값이 문자열이 아닌 경우 오류를 발생시킵니다.
                            throw new Error(
                                `Property '${subDir}' is not a string.`,
                            );
                        }
                    } else {
                        // subDir이 페이지 프로퍼티에 없는 경우 오류를 발생시킵니다.
                        throw new Error(
                            `Property '${subDir}' does not exist in the page properties.`,
                        );
                    }
                }
            }
        }

        // 페이지 URL을 생성합니다.
        page.pageUrl = `${subDirPath}${
            page.pageTitle
                ?.trim()
                .replace(/[^가-힣\w\s\-_~]/g, '') //한글, 영어, 숫자, 공백, '-', '_', '.', '~'를 제외한 모든 문자 제거
                .replace(/\s+/g, '-') ?? // 공백을 하이픈으로 치환
            ''
        }`;
        console.log(`[page.pageUrl] ${page.pageUrl}`);
    }

    public static async create(pageId: string) {
        const notionApi: NotionAPI = await NotionAPI.create();
        const page: Page = new Page(pageId, notionApi.client);
        MarkdownConverter.imageCounter = 0;
        await page.init(page);
        console.log(`[page.ts] start - pageTitle : ${page.pageTitle}`);
        // console.log(
        //     `[page.ts] start - properties : ${JSON.stringify(
        //         page.properties,
        //         null,
        //         2,
        //     )}`,
        // );

        page.contentMarkdown = await page.fetchAndProcessBlocks();
        // console.log(
        //     `[page.ts] fetchAndProcessBlocks - markdownContent : ${page.contentMarkdown}`,
        // );
        await page.printMarkDown();
        return page;
    }

    public static async getSimpleData(pageId: string) {
        const notionApi: NotionAPI = await NotionAPI.create();
        const page: Page = new Page(pageId, notionApi.client);
        await page.init(page);
        return {
            pageTitle: page.pageTitle ?? '',
            pageUrl: page.pageUrl ?? '',
        };
    }

    public async printMarkDown() {
        //contentMarkdown과 properties의 내용을 마크다운 파일로 저장한다.
        try {
            // 파일 이름 설정 (페이지 제목으로)
            const filename = `${this.pageTitle}.md`;

            // 마크다운 메타데이터 생성
            const markdownMetadata = this.formatMarkdownMetadata();

            // 마크다운 메타데이터와 contentMarkdown을 결합
            const fullMarkdown = `${markdownMetadata}${this.contentMarkdown}`;
            let dir = join(this.envConfig.saveDir!, this.pageUrl!);
            // 디렉토리 생성 (이미 존재하는 경우 오류를 무시함)
            await fs.mkdir(dir, { recursive: true });
            const filePath = join(dir, 'index.md');
            // 결합된 내용을 파일에 쓰기 (이미 존재하는 경우 덮어쓰기)
            await fs.writeFile(filePath, fullMarkdown);
            console.log(`[page.ts] Markdown 파일 저장됨: ${filePath}`);
            await this.updatePageStatus();
        } catch (error) {
            console.error(`[page.ts] 파일 저장 중 오류 발생: ${error}`);
        }
    }

    private formatMarkdownMetadata(): string {
        const metadata = ['---'];

        // 모든 properties 키에 대해 반복
        for (const key in this.properties) {
            const value = this.properties[key];

            // 값이 존재하고, 태그 배열인 경우 특별 처리
            if (value) {
                if (key === 'tags' && Array.isArray(value)) {
                    metadata.push(`tags:\n  - ${value.join('\n  - ')}`);
                } else {
                    // 기타 모든 속성에 대한 처리
                    metadata.push(`${key}: ${JSON.stringify(value)}`);
                }
            }
        }

        metadata.push('---', '');

        return metadata.join('\n');
    }

    private async getProperties(): Promise<object> {
        const pageResponse: GetPageResponse = await this.notion.pagesRetrieve({
            page_id: this.pageId,
        });
        // console.log(`[page.ts] getProperties - pageResponse : ${pageResponse}`);
        if ('properties' in pageResponse) {
            return pageResponse.properties;
        } else {
            console.error(
                'This is a PartialPageObjectResponse without properties.',
            );
            return Object;
        }
    }

    private async fetchAndProcessBlocks(): Promise<string> {
        // Fetch blocks for the current page
        const blocks = await this.notion.blocks.children.list({
            block_id: this.pageId,
        });

        // Process each block and convert to Markdown
        let markdownContent = '';
        for (const block of blocks.results) {
            const blockInstance = new Block(
                this.notion,
                block.id,
                this.pageUrl,
            );
            markdownContent += await blockInstance.getMarkdown();
        }
        return markdownContent;
    }

    private async extractDataFromProperties(
        properties: any,
    ): Promise<Record<string, PropertyValue>> {
        /// 속성값들을 가져온다.
        const result: Record<string, PropertyValue> = {};
        for (const key of Object.keys(properties)) {
            const property = properties[key];
            if (key.toLowerCase() == 'title' || key == '제목') {
                this.pageTitle = property.title
                    .map(
                        (textBlock: { plain_text: string }) =>
                            textBlock.plain_text,
                    )
                    .join('');
            }
            try {
                switch (property.type) {
                    case 'multi_select':
                        result[key] = property.multi_select.map(
                            (item: any) => item.name,
                        );
                        break;
                    case 'rich_text':
                        result[key] = property.rich_text[0]?.plain_text;
                        break;
                    case 'last_edited_time':
                        const dateObj = new Date(property.last_edited_time);
                        result[key] = dateObj.toISOString().split('T')[0]; // format: "yyyy-MM-dd"
                        break;
                    case 'date':
                        result[key] = property.date.start;
                        break;
                    case 'select':
                        result[key] = property.select.name;
                        break;
                    case 'title':
                        result[key] = property.title[0]?.plain_text;
                        break;
                }
            } catch {}
        }

        return result;
    }

    private async updatePageStatus() {
        try {
            // Notion API를 사용하여 페이지의 상태를 업데이트합니다.
            await this.notion.pages.update({
                page_id: this.pageId,
                properties: {
                    상태: {
                        type: 'select',
                        select: { name: 'Updated' },
                    },
                },
            });
            console.log(`[page.ts] Page status updated: ${this.pageId}`);
        } catch (error) {
            console.error(`[page.ts] Failed to update page status: ${error}`);
        }
    }
}
