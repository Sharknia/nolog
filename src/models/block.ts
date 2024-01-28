import { Client } from '@notionhq/client';
import {
    BlockObjectResponse,
    PartialBlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { GetBlockResponse } from '@notionhq/client/build/src/api-endpoints';

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
            switch (block.type) {
                case 'paragraph':
                    markdown += this.convertParagraph(block.paragraph);
                    break;
                case 'heading_1':
                    markdown += `# ${block.heading_1.rich_text
                        .map((t) => t.plain_text)
                        .join('')}\n\n`;
                    break;
                // 다른 블록 유형에 대한 처리를 여기에 추가...
                default:
                    console.warn(`Unsupported block type: ${block.type}`);
            }
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
        console.log('paragraph:' + paragraph);
        return paragraph.rich_text;
        // return paragraph.text.map((t) => t.plain_text).join('') + '\n\n';
    }

    // 기타 블록 유형에 대한 변환 함수를 여기에 추가...
}
