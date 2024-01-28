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
    private pageUrl?: string;
    private indentLevel: number; // 추가된 indentLevel

    constructor(
        notion: Client,
        blockId: string,
        pageUrl?: string,
        indentLevel: number = 0,
    ) {
        this.notion = notion;
        this.blockId = blockId;
        this.pageUrl = pageUrl;
        this.indentLevel = indentLevel;
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
            markdown += await MarkdownConverter.create(
                block,
                this.pageUrl,
                this.indentLevel,
            );
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
            const childBlock = new Block(
                this.notion,
                child.id,
                this.pageUrl,
                this.indentLevel + 1,
            );
            markdown += await childBlock.getMarkdown();
        }
        return markdown;
    }
}
