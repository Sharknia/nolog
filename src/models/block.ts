import { GetBlockResponse } from '@notionhq/client/build/src/api-endpoints';
import { MarkdownConverter } from '../utils/markdownConverter';
import { NotionClientWithRetry } from '../utils/notionClientWithRetry';

export class Block {
    private notion: NotionClientWithRetry;
    private blockId: string;
    private blockData?: GetBlockResponse;
    private pageUrl?: string;
    private indentLevel: number; // 추가된 indentLevel

    constructor(
        notion: NotionClientWithRetry,
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
        return await this.notion.blocksRetrieve({ block_id: this.blockId });
    }

    private async processBlock(block: GetBlockResponse): Promise<string> {
        let markdown = '';
        if ('type' in block) {
            if (block.type === 'table') {
                // 테이블 처리 로직
                markdown += await this.processTableBlock(block);
            } else if (block.type !== 'table_row') {
                markdown += await MarkdownConverter.create(
                    block,
                    this.pageUrl,
                    this.indentLevel,
                );
                if (block.has_children) {
                    markdown += await this.processChildBlocks(block.id);
                }
            }
        }
        return markdown;
    }

    private async processTableBlock(
        tableBlock: GetBlockResponse,
    ): Promise<string> {
        let markdown = '';

        // 여기에서 테이블 행들을 루프하여 처리합니다.
        const rows = await this.notion.blocks.children.list({
            block_id: tableBlock.id,
        });
        let first_row = true;
        for (const row of rows.results) {
            if ('type' in row) {
                if (row.type === 'table_row') {
                    markdown += await MarkdownConverter.convertTableRow(
                        row.table_row,
                    );
                    if (first_row) {
                        // 구분선 생성
                        markdown +=
                            '| ' +
                            row.table_row.cells.map(() => '---').join(' | ') +
                            ' |\n';
                        first_row = false;
                    }
                }
            }
        }

        return markdown + '\n';
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
