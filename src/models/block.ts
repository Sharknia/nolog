import { GetBlockResponse } from '@notionhq/client/build/src/api-endpoints';
import { NotionClientWithRetry } from '../apis/notionClientWithRetry';
import { MarkdownConverter } from '../utils/markdownConverter';

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
            if (block.type == 'toggle') {
                markdown += await this.processToggleBlock(block);
            } else if (block.type === 'table') {
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

    private async processToggleBlock(
        toggleBlock: GetBlockResponse,
    ): Promise<string> {
        let markdown = '';
        if ('type' in toggleBlock && toggleBlock.type == 'toggle') {
            // 토글 제목 변환
            const toggleTitle = await Promise.all(
                toggleBlock.toggle.rich_text.map(async (textElement) => {
                    if (textElement.plain_text) {
                        return await MarkdownConverter.formatTableCellElement(
                            textElement,
                        );
                    }
                    return '';
                }),
            );

            // 토글 내용 변환
            if (toggleBlock.has_children) {
                markdown += await this.processChildBlocks(toggleBlock.id, 0);
            }
            markdown = `<details>\n<summary>${toggleTitle.join(
                '',
            )}</summary>\n\n${markdown}\n</details>`;
        }
        return markdown + '\n\n';
    }

    private async processChildBlocks(
        blockId: string,
        plusIndent: number = 1,
    ): Promise<string> {
        const children = await this.notion.blocks.children.list({
            block_id: blockId,
        });
        let markdown = '';
        for (const child of children.results) {
            const childBlock = new Block(
                this.notion,
                child.id,
                this.pageUrl,
                this.indentLevel + plusIndent,
            );
            markdown += await childBlock.getMarkdown();
        }
        return markdown;
    }
}
