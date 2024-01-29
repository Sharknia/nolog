import { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Page } from '../models/page';
import { EnvConfig } from '../utils/envConfig';
axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

export class MarkdownConverter {
    // axios 인스턴스에 재시도 로직 추가

    private block: BlockObjectResponse;
    private imageCounter: number = 0; // 이미지 카운터 추가
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
                markdown += await this.convertHeading(block.heading_1, 1);
                break;
            case 'heading_2':
                markdown += await this.convertHeading(block.heading_2, 2);
                break;
            case 'heading_3':
                markdown += await this.convertHeading(block.heading_3, 3);
                break;
            case 'bookmark':
                markdown += await this.convertBookmark(block.bookmark);
                break;
            case 'link_to_page':
                markdown += await this.convertLinkToPage(block.link_to_page);
                break;
            case 'image':
                markdown += await this.convertImage(block.image);
                break;
            case 'callout':
                markdown += await this.convertCallout(block.callout);
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
                markdown += await this.convertNumberedList(
                    block.numbered_list_item,
                );
                break;
            case 'bulleted_list_item':
                markdown += await this.convertBulletedList(
                    block.bulleted_list_item,
                );
                break;
            case 'to_do':
                markdown += await this.convertToDo(block.to_do);
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
                markdown += await this.formatTextElement(textElement);
            }
        }
        return markdown + '\n\n';
    }

    private async convertImage(imageBlock: any): Promise<string> {
        try {
            const imageUrl = imageBlock.file.url;
            const imageCaption =
                imageBlock.caption.length > 0
                    ? await this.formatRichText(imageBlock.caption)
                    : '';

            const imageName = `image${++this.imageCounter}.png`;
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

    private async convertHeading(heading: any, level: number): Promise<string> {
        let markdown = '';
        const prefix = '#'.repeat(level + 1) + ' ';
        for (const textElement of heading.rich_text) {
            markdown += await this.formatTextElement(textElement);
        }
        return prefix + markdown + '\n\n';
    }

    private async convertBookmark(bookmark: any): Promise<string> {
        const url = bookmark.url;
        const caption =
            bookmark.caption.length > 0
                ? await this.formatRichText(bookmark.caption)
                : url;

        return `[${caption}](${url})\n\n`;
    }

    private async convertLinkToPage(linkToPage: any): Promise<string> {
        return this.createMarkdownLinkForPage(linkToPage.page_id) + '\n\n';
    }

    private async formatRichText(richTexts: any[]): Promise<string> {
        const formattedTexts = await Promise.all(
            richTexts.map(async (text) => {
                return await this.formatTextElement(text);
            }),
        );
        return formattedTexts.join('');
    }

    private async convertToDo(toDoBlock: any): Promise<string> {
        const formattedTexts = await Promise.all(
            toDoBlock.rich_text.map(async (textElement: any) => {
                return await this.formatTextElement(textElement);
            }),
        );
        const quoteText = formattedTexts.join('');
        let pre = toDoBlock.checked ? '- [x]' : '- [ ]';
        return `${pre} ${quoteText}\n\n`;
    }

    private async convertQuote(quoteBlock: any): Promise<string> {
        const formattedTexts = await Promise.all(
            quoteBlock.rich_text.map(async (textElement: any) => {
                return await this.formatTextElement(textElement);
            }),
        );
        const quoteText = formattedTexts.join('');
        return `> ${quoteText}\n\n`;
    }

    private async convertCallout(calloutBlock: any): Promise<string> {
        const formattedTexts = await Promise.all(
            calloutBlock.rich_text.map(async (textElement: any) => {
                return await this.formatTextElement(textElement);
            }),
        );
        const textContent = formattedTexts.join('');
        const icon = calloutBlock.icon ? calloutBlock.icon.emoji : '';
        const color = calloutBlock.color
            ? calloutBlock.color
            : 'gray_background';

        return `
        <div class="callout ${color}">
            ${icon} <span>${textContent}</span>
        </div>\n`;
    }

    private async formatListItemContent(listItemBlock: any): Promise<string> {
        const content = await Promise.all(
            listItemBlock.rich_text.map(async (textElement: any) => {
                return await this.formatTextElement(textElement);
            }),
        );
        return content.join('');
    }

    private async convertNumberedList(listItemBlock: any): Promise<string> {
        const listItemContent = await this.formatListItemContent(listItemBlock);
        const indent = ' '.repeat(this.indentLevel * 2);
        return `${indent}1. ${listItemContent}\n\n`;
    }

    private async convertBulletedList(listItemBlock: any): Promise<string> {
        const listItemContent = await this.formatListItemContent(listItemBlock);
        const indent = ' '.repeat(this.indentLevel * 2);
        return `${indent}- ${listItemContent}\n\n`;
    }

    private async formatTextElement(textElement: any): Promise<string> {
        // 텍스트의 앞뒤 공백을 분리하여 저장
        const leadingSpace = textElement.plain_text.match(/^\s*/)[0];
        const trailingSpace = textElement.plain_text.match(/\s*$/)[0];

        // 앞뒤 공백을 제거한 텍스트 내용
        let textContent = textElement.plain_text.trim();

        // 스타일링 처리
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
            // href가 Notion의 내부 링크 형식인지 확인
            const rawId = textElement.href.startsWith('/')
                ? textElement.href.substring(1)
                : textElement.href;
            if (this.isValidUUID(rawId)) {
                // UUID 형식으로 변환
                const pageId = this.formatAsUUID(rawId);
                // 마크다운 링크 생성
                textContent = await this.createMarkdownLinkForPage(pageId);
            } else {
                // 유효하지 않은 UUID 형식이거나 일반 링크
                textContent = `[${textContent}](${textElement.href})`;
            }
        }

        // 스타일링 된 텍스트에 원래의 공백을 다시 추가
        return leadingSpace + textContent + trailingSpace;
    }

    private async createMarkdownLinkForPage(pageId: string): Promise<string> {
        try {
            const envConfig = EnvConfig.create(); // EnvConfig 인스턴스 생성
            const blogUrl = envConfig.blogUrl; // blogUrl 가져오기
            const pageData = await Page.getSimpleData(pageId);

            const pageTitle = pageData.pageTitle;
            const pageUrl = pageData.pageUrl;

            return `[${pageTitle}](${blogUrl}/${pageUrl})`;
        } catch (error) {
            console.error('Error creating markdown link for page:', error);
            return '';
        }
    }

    private formatAsUUID(id: string) {
        // UUID 형식으로 변환하는 로직
        return `${id.substring(0, 8)}-${id.substring(8, 12)}-${id.substring(
            12,
            16,
        )}-${id.substring(16, 20)}-${id.substring(20)}`;
    }

    private isValidUUID(id: string): boolean {
        return /^[0-9a-f]{32}$/i.test(id);
    }
}
