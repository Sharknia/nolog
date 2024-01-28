import { Client } from '@notionhq/client';
import {
    BlockObjectResponse,
    PartialBlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { GetBlockResponse } from '@notionhq/client/build/src/api-endpoints';
import { MarkdownConverter } from '../utils/markdownConverter';

export class Block {
    private notion: Client;
    private blockId: string;
    private blockData?: GetBlockResponse;

    constructor(notion: Client, blockId: string) {
        this.notion = notion;
        this.blockId = blockId;
    }

    public async getMarkdown(): Promise<string> {
        this.blockData = await this.fetchBlockData();
        return await this.processBlock(this.blockData);
    }

    private async fetchBlockData(): Promise<GetBlockResponse> {
        return await this.notion.blocks.retrieve({ block_id: this.blockId });
    }

    private async processBlock(block: GetBlockResponse): Promise<string> {
        let markdown = '';
        // BlockObjectResponse 인 경우
        if ('type' in block) {
            markdown += await MarkdownConverter.create(block);
            // 하위 블록 처리 (재귀적)
            if (block.has_children) {
                markdown += await this.processChildBlocks(block.id);
            }
        } else {
            // PartialBlockObjectResponse인 경우.. 이건 뭘까?
        }
        return markdown;
    }

    private async processChildBlocks(blockId: string): Promise<string> {
        const children = await this.notion.blocks.children.list({
            block_id: blockId,
        });
        let markdown = '';
        for (const child of children.results) {
            markdown += await this.processBlock(child as BlockObjectResponse);
        }
        return markdown;
    }

    private convertParagraph(paragraph: any): string {
        let markdown = '';

        for (const textElement of paragraph.rich_text) {
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
                // 마크다운은 기본적으로 밑줄을 지원하지 않으므로, HTML 태그 사용
                textContent = `<u>${textContent}</u>`;
            }
            // 색상 처리 (HTML 스타일을 사용)
            if (textElement.annotations.color !== 'default') {
                textContent = `<span style="color: ${textElement.annotations.color};">${textContent}</span>`;
            }
            if (textElement.href) {
                textContent = `[${textContent}](${textElement.href})`;
            }
            markdown += textContent;
        }
        console.log(
            `convertParagraph - paragraph : ${JSON.stringify(
                paragraph,
                null,
                2,
            )}`,
        );
        markdown = markdown + '\n\n';
        console.log(`convertParagraph - markdown : ${markdown}`);
        return markdown; // 문단 끝에 줄바꿈 추가
    }

    // 기타 블록 유형에 대한 변환 함수를 여기에 추가...
}
