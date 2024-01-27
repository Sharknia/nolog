import { NotionAPI } from "../utils/notionapi";
import { Client } from "@notionhq/client";
import { PropertyValue } from './types';
import { GetPageResponse } from "@notionhq/client/build/src/api-endpoints";


export class Page {
    private pageId: string;
    private notion: Client;

    public properties?: Record<string, PropertyValue>;
    public pageTitle?: string;
    public pageUrl?: string;

    private constructor(pageId: string, notion: Client) {
        this.pageId = pageId;
        this.notion = notion;
    }

    public static async create(pageId: string) {
        const notionApi: NotionAPI = await NotionAPI.create();
        const page: Page = new Page(pageId, notionApi.client);
        const properties = await page.getProperties();
        page.properties = page.extractDataFromProperties(properties);
        return page;
    }

    public async PrintMarkDown() {

    }

    private async getProperties(): Promise<object> {
        const pageResponse: GetPageResponse = await this.notion.pages.retrieve({ page_id: this.pageId });
        console.log(pageResponse);
        if ('properties' in pageResponse) {
            return pageResponse.properties;
        } else {
            console.log("This is a PartialPageObjectResponse without properties.");
            return Object
        }
    }

    private extractDataFromProperties = (properties: any): Record<string, PropertyValue> => {
        const result: Record<string, PropertyValue> = {};
        for (const key of Object.keys(properties)) {
            const property = properties[key];
            //페이지 타이틀 저장
            if (key == "title" || key == "제목") {
                this.pageTitle = property.title[0]?.plain_text;
                //url 변형 추가해야함
            }
            switch (property.type) {
                case "multi_select":
                    result[key] = property.multi_select.map((item: any) => item.name);
                    break;
                case "rich_text":
                    result[key] = property.rich_text[0]?.plain_text;
                    break;
                case "last_edited_time":
                    const dateObj = new Date(property.last_edited_time);
                    result[key] = dateObj.toISOString().split('T')[0]; // format: "yyyy-MM-dd"
                    break;
                case "date":
                    result[key] = property.date.start;
                    break;
                case "select":
                    result[key] = property.select.name;
                    break;
                case "title":
                    result[key] = property.title[0]?.plain_text;
                    break;
            }
        }

        return result;
    };
}