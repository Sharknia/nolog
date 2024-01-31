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
        const properties = await page.getProperties();
        page.properties = await page.extractDataFromProperties(properties);
        page.pageUrl = `${
            page.pageTitle
                ?.trim()
                .replace(/\s+/g, '-') // 먼저 공백을 하이픈으로 치환
                .replace(/[^가-힣\w\-_~]/g, '') ?? // 그 후 한글, 영어, 숫자, '-', '_', '.', '~'를 제외한 모든 문자 제거
            ''
        }`;
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
            //페이지 타이틀 저장
            if (key == 'title' || key == '제목') {
                this.pageTitle = property.title[0]?.plain_text;
                //url 변형 추가해야함
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
}
