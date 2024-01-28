import { NotionAPI } from '../utils/notionapi';
import { Client } from '@notionhq/client';
import { PropertyValue } from './types';
import { GetPageResponse } from '@notionhq/client/build/src/api-endpoints';
import { Block } from './block';
import { promises as fs } from 'fs';

export class Page {
    private pageId: string;
    private notion: Client;

    public properties?: Record<string, PropertyValue>;
    public pageTitle?: string;
    public pageUrl?: string;
    public contentMarkdown?: string;

    private constructor(pageId: string, notion: Client) {
        this.pageId = pageId;
        this.notion = notion;
    }

    public static async create(pageId: string) {
        const notionApi: NotionAPI = await NotionAPI.create();
        const page: Page = new Page(pageId, notionApi.client);
        const properties = await page.getProperties();
        page.properties = await page.extractDataFromProperties(properties);
        console.log(`[page.ts] start - pageTitle : ${page.pageTitle}`);
        console.log(
            `[page.ts] start - properties : ${JSON.stringify(
                page.properties,
                null,
                2,
            )}`,
        );
        page.contentMarkdown = await page.fetchAndProcessBlocks();
        console.log(
            `[page.ts] fetchAndProcessBlocks - markdownContent : ${page.contentMarkdown}`,
        );
        await page.printMarkDown();
        return page;
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

            // 결합된 내용을 파일에 쓰기
            await fs.writeFile(filename, fullMarkdown);

            console.log(`[page.ts] Markdown 파일 저장됨: ${filename}`);
        } catch (error) {
            console.error(`[page.ts] 파일 저장 중 오류 발생: ${error}`);
        }
    }

    private formatMarkdownMetadata(): string {
        // properties를 마크다운 메타데이터로 변환
        const metadata = [
            '---',
            `title: "${this.properties?.title ?? ''}"`,
            `description: "${this.properties?.description ?? ''}"`,
            `date: ${this.properties?.date ?? ''}`,
            `update: ${this.properties?.update ?? ''}`,
            // tags가 배열인 경우에만 join 메소드를 호출
            `tags:\n  - ${
                Array.isArray(this.properties?.tags)
                    ? this.properties.tags.join('\n  - ')
                    : ''
            }`,
            `series: "${this.properties?.series ?? ''}"`,
            '---',
            '',
        ].join('\n');

        return metadata;
    }

    private async getProperties(): Promise<object> {
        const pageResponse: GetPageResponse = await this.notion.pages.retrieve({
            page_id: this.pageId,
        });
        console.log(`[page.ts] getProperties - pageResponse : ${pageResponse}`);
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
            const blockInstance = new Block(this.notion, block.id);
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
        }

        return result;
    }
}
