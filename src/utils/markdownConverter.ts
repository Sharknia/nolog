import { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { Page } from '../models/page';
import { EnvConfig } from '../utils/envConfig';

export class MarkdownConverter {
    private block: BlockObjectResponse;
    private EnvConfig?: EnvConfig;

    private constructor(block: BlockObjectResponse) {
        this.block = block;
    }

    public static async create(block: BlockObjectResponse): Promise<string> {
        const converter: MarkdownConverter = new MarkdownConverter(block);
        const result = await converter.makeMarkDown();
        converter.EnvConfig = EnvConfig.create();
        return result;
    }

    private async makeMarkDown(): Promise<string> {
        let block = this.block;
        let markdown: string = '';

        console.log(
            `[markdownConverter.ts] makeMarkDown : ${
                block.type
            } : ${JSON.stringify(block, null, 2)}`,
        );

        switch (block.type) {
            // 텍스트의 기본 단위,텍스트를 입력할 때 기본적으로 생성되는 블록 유형
            case 'paragraph':
                markdown += this.convertParagraph(block.paragraph);
                break;
            case 'heading_1':
                markdown += this.convertHeading(block.heading_1, 1);
                break;
            case 'heading_2':
                markdown += this.convertHeading(block.heading_2, 2);
                break;
            case 'heading_3':
                markdown += this.convertHeading(block.heading_3, 3);
                break;
            case 'bookmark':
                markdown += this.convertBookmark(block.bookmark);
                break;
            case 'link_to_page':
                markdown += await this.convertLinkToPage(block.link_to_page);
                break;
            // 다른 블록 유형에 대한 처리를 여기에 추가...
            default:
                console.warn(
                    `[markdownConverter.ts] makeMarkDown : Unsupported block type - ${block.type}`,
                );
        }
        return markdown;
    }

    private convertParagraph(paragraph: any): string {
        let markdown = '';
        for (const textElement of paragraph.rich_text) {
            markdown += this.formatTextElement(textElement);
        }
        return markdown + '\n\n';
    }

    private convertHeading(heading: any, level: number): string {
        let markdown = '';
        const prefix = '#'.repeat(level + 1) + ' ';
        for (const textElement of heading.rich_text) {
            markdown += this.formatTextElement(textElement);
        }
        return prefix + markdown + '\n\n';
    }

    private convertBookmark(bookmark: any): string {
        const url = bookmark.url;
        const caption =
            bookmark.caption.length > 0
                ? this.formatRichText(bookmark.caption)
                : url;

        return `[${caption}](${url})\n\n`;
    }

    private async convertLinkToPage(linkToPage: any): Promise<string> {
        try {
            const envConfig = EnvConfig.create(); // EnvConfig 인스턴스 생성
            const blogUrl = envConfig.blogUrl; // blogUrl 가져오기
            const pageId = linkToPage.page_id;
            const pageData = await Page.getSimpleData(pageId);

            const pageTitle = pageData.pageTitle;
            const pageUrl = pageData.pageUrl;

            return `[${pageTitle}](${blogUrl}/${pageUrl})\n\n`;
        } catch (error) {
            console.error('Error converting link_to_page:', error);
            return '';
        }
    }
    private formatRichText(richTexts: any[]): string {
        return richTexts
            .map((text) => {
                return this.formatTextElement(text); // formatTextElement는 이전에 정의한 텍스트 포맷팅 함수
            })
            .join('');
    }

    private formatTextElement(textElement: any): string {
        let textContent = textElement.plain_text;

        // 텍스트 스타일링 처리
        if (textElement.annotations.bold) {
            textContent = `**${textContent}**`;
        }
        if (textElement.annotations.italic) {
            textContent = `*${textContent}*`;
        }
        if (textElement.annotations.strikethrough) {
            textContent = `~~${textContent}~~`;
        }
        if (textElement.annotations.code) {
            textContent = `\`${textContent}\``;
        }
        if (textElement.annotations.underline) {
            textContent = `<u>${textContent}</u>`;
        }
        if (textElement.annotations.color !== 'default') {
            textContent = `<span style="color: ${textElement.annotations.color};">${textContent}</span>`;
        }
        if (textElement.href) {
            textContent = `[${textContent}](${textElement.href})`;
        }

        return textContent;
    }
}
