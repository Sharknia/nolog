import { EnvConfig } from '../envConfig';

describe('EnvConfig', () => {
    let envConfig: EnvConfig;
    beforeAll(() => {
        // 환경 변수 설정
        process.env.BLOG_URL = 'https://example.com/';
        process.env.SAVE_DIR = '/path/to/save';
        process.env.SAVE_SUB_DIR = 'subdir';

        // EnvConfig 인스턴스 생성
        envConfig = EnvConfig.create();
    });

    afterAll(() => {
        // 환경 변수 정리
        delete process.env.BLOG_URL;
        delete process.env.SAVE_DIR;
        delete process.env.SAVE_SUB_DIR;
    });

    it('should have the correct notionKey value', () => {
        expect(envConfig.notionKey).toEqual(process.env.NOTION_KEY || '');
    });

    it('should have the correct databaseid value', () => {
        expect(envConfig.databaseid).toEqual(
            process.env.NOTION_DATABASE_ID || '',
        );
    });

    it('should correctly handle trailing slashes', () => {
        expect(envConfig.blogUrl).toEqual('https://example.com'); // 끝 슬래시 제거 확인
        expect(envConfig.saveDir).toEqual('/path/to/save/'); // 끝에 슬래시 추가 확인
        expect(envConfig.saveSubDir).toEqual('subdir/'); // 끝에 슬래시 추가 확인
    });
});
