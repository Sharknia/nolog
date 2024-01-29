import { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { Page } from '../models/page';
import { EnvConfig } from '../utils/envConfig';
import axios from 'axios';
import { promises as fs } from 'fs';
import { join } from 'path';
import axiosRetry from 'axios-retry';
axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

export class MarkdownConverter {
    // axios 인스턴스에 재시도 로직 추가

    private block: BlockObjectResponse;
    private static imageCounter: number = 0; // 이미지 카운터 추가
    private pageUrl?: string;
    private indentLevel: number = 0;

    private constructor(block: BlockObjectResponse) {
        this.block = block;
    }

    public static async create(
        block: BlockObjectResponse,
        pageUrl?: string,
        indentLevel: number = 0,
    ): Promise<string> {
        const converter: MarkdownConverter = new MarkdownConverter(block);
        converter.pageUrl = pageUrl;
        converter.indentLevel = indentLevel;
        console.log(`indentLevel : ${indentLevel}`);
        const result = await converter.makeMarkDown();
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
                markdown += await this.convertParagraph(block.paragraph);
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
            case 'image':
                markdown += await this.convertImage(block.image);
                break;
            case 'callout':
                markdown += this.convertCallout(block.callout);
                break;
            case 'divider':
                markdown += this.convertDivider();
                break;
            case 'quote':
                markdown += this.convertQuote(block.quote);
                break;
            case 'code':
                markdown += this.convertCode(block.code);
                break;
            case 'numbered_list_item':
                markdown += this.convertNumberedList(block.numbered_list_item);
                break;
            case 'bulleted_list_item':
                markdown += this.convertBulletedList(block.bulleted_list_item);
                break;
            case 'to_do':
                markdown += this.convertToDo(block.to_do);
                break;
            // 다른 블록 유형에 대한 처리를 여기에 추가...
            default:
                console.warn(
                    `[markdownConverter.ts] makeMarkDown : Unsupported block type - ${block.type}`,
                );
        }
        return markdown;
    }

    private async convertParagraph(paragraph: any): Promise<string> {
        let markdown = '';
        for (const textElement of paragraph.rich_text) {
            if (
                textElement.type === 'mention' &&
                textElement.mention.type === 'page'
            ) {
                // mention 타입이고, page를 참조하는 경우
                markdown += await this.convertMentionToPageLink(
                    textElement.mention.page.id,
                );
            } else {
                // 기타 텍스트 요소
                markdown += this.formatTextElement(textElement);
            }
        }
        return markdown + '\n\n';
    }

    private async convertImage(imageBlock: any): Promise<string> {
        try {
            const imageUrl = imageBlock.file.url;
            const imageCaption =
                imageBlock.caption.length > 0
                    ? this.formatRichText(imageBlock.caption)
                    : '';

            const imageName = `image${++MarkdownConverter.imageCounter}.png`;
            const imageDir = join('contents', 'post', this.pageUrl || '');
            const imagePath = join(imageDir, imageName);

            // 폴더 생성
            await fs.mkdir(imageDir, { recursive: true });
            // 이미지 다운로드 및 로컬에 저장
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 10000, // 10초 타임아웃 설정
            });
            await fs.writeFile(imagePath, response.data);

            let markdownImage = `![${imageCaption}](${imageName})\n`;
            if (imageCaption) {
                markdownImage += `<p style="text-align:center;"><small>${imageCaption}</small></p>\n`;
            }

            return markdownImage;
        } catch (error) {
            console.error('Error converting image:', error);
            return '';
        }
    }

    private convertCode(codeBlock: any): string {
        const codeText = codeBlock.rich_text
            .map((textElement: any) => textElement.plain_text)
            .join('');

        const language = codeBlock.language || '';

        return `\`\`\`${language}\n${codeText}\n\`\`\`\n\n`;
    }

    private convertDivider(): string {
        return `<hr style="border: none; height: 1px; background-color: #e0e0e0; margin: 16px 0;" />\n`;
    }

    private async convertMentionToPageLink(pageId: string): Promise<string> {
        return this.createMarkdownLinkForPage(pageId);
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
        return this.createMarkdownLinkForPage(linkToPage.page_id);
    }

    private formatRichText(richTexts: any[]): string {
        return richTexts
            .map((text) => {
                return this.formatTextElement(text); // formatTextElement는 이전에 정의한 텍스트 포맷팅 함수
            })
            .join('');
    }

    private convertToDo(toDoBlock: any): string {
        const quoteText = toDoBlock.rich_text
            .map((textElement: any) => this.formatTextElement(textElement))
            .join('');
        let pre = '- [ ]';
        if (toDoBlock.checked == true) {
            pre = '- [x]';
        }
        return `${pre} ${quoteText}\n\n`;
    }

    private convertQuote(quoteBlock: any): string {
        const quoteText = quoteBlock.rich_text
            .map((textElement: any) => this.formatTextElement(textElement))
            .join('');

        return `> ${quoteText}\n\n`;
    }

    private convertCallout(calloutBlock: any): string {
        const textContent = calloutBlock.rich_text
            .map((textElement: any) => this.formatTextElement(textElement))
            .join('');
        const icon = calloutBlock.icon ? calloutBlock.icon.emoji : '';
        const color = calloutBlock.color
            ? calloutBlock.color
            : 'gray_background';

        return `
    <div class="callout ${color}">
        ${icon} <span>${textContent}</span>
    </div>\n`;
    }

    private formatListItemContent(listItemBlock: any): string {
        return listItemBlock.rich_text
            .map((textElement: any) => this.formatTextElement(textElement))
            .join('');
    }

    private convertNumberedList(listItemBlock: any): string {
        const listItemContent = this.formatListItemContent(listItemBlock);
        const indent = ' '.repeat(this.indentLevel * 2);
        return `${indent}1. ${listItemContent}\n\n`;
    }

    private convertBulletedList(listItemBlock: any): string {
        const listItemContent = this.formatListItemContent(listItemBlock);
        const indent = ' '.repeat(this.indentLevel * 2);
        return `${indent}- ${listItemContent}\n\n`;
    }

    private formatTextElement(textElement: any): string {
        let textContent = textElement.plain_text.trim(); // 앞뒤 공백 제거

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

    private async createMarkdownLinkForPage(pageId: string): Promise<string> {
        try {
            const envConfig = EnvConfig.create(); // EnvConfig 인스턴스 생성
            const blogUrl = envConfig.blogUrl; // blogUrl 가져오기
            const pageData = await Page.getSimpleData(pageId);

            const pageTitle = pageData.pageTitle;
            const pageUrl = pageData.pageUrl;

            return `[${pageTitle}](${blogUrl}/${pageUrl})\n\n`;
        } catch (error) {
            console.error('Error creating markdown link for page:', error);
            return '';
        }
    }
}
