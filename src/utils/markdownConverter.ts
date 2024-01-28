import { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';

export class MarkdownConverter {
    private block: BlockObjectResponse;

    private constructor(block: BlockObjectResponse) {
        this.block = block;
    }

    public static async create(block: BlockObjectResponse): Promise<string> {
        const converter: MarkdownConverter = new MarkdownConverter(block);
        const result = await converter.makeMakrDown();
        return result;
    }

    private async makeMakrDown(): Promise<string> {
        let block = this.block;
        let markdown: string = '';
        switch (block.type) {
            // 텍스트의 기본 단위,텍스트를 입력할 때 기본적으로 생성되는 블록 유형
            case 'paragraph':
                markdown += this.convertParagraph(block.paragraph);
                break;
            // 다른 블록 유형에 대한 처리를 여기에 추가...
            default:
                console.warn(`Unsupported block type: ${block.type}`);
        }
        return markdown;
    }

    private convertParagraph(paragraph: any): Promise<string> {
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
        return markdown;
    }
}
