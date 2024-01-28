import { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';

export class MarkdownConverter {
    private block: BlockObjectResponse;

    private constructor(block: BlockObjectResponse) {
        this.block = block;
    }

    public static async create(block: BlockObjectResponse): Promise<string> {
        const converter: MarkdownConverter = new MarkdownConverter(block);
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
