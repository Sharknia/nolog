import { promises as fs } from 'fs';
import { MetadataManager } from '../metadataManager';

jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn().mockResolvedValue('mocked file content'),
        writeFile: jest.fn().mockResolvedValue(undefined),
        rm: jest.fn().mockResolvedValue(undefined),
    },
}));

describe('MetadataManager', () => {
    let metadataManager: MetadataManager;

    beforeEach(async () => {
        metadataManager = await MetadataManager.create();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should load metadata from file', async () => {
        const mockData = JSON.stringify({ page1: { path: '/path/to/page1' } });
        (fs.readFile as jest.Mock).mockResolvedValueOnce(mockData);

        await metadataManager.loadMetadata();

        expect(fs.readFile).toHaveBeenCalledWith(expect.any(String), 'utf8');
        expect(metadataManager.getMetadata()).toEqual({
            page1: { path: '/path/to/page1' },
        });
    });

    it('should handle empty metadata file', async () => {
        (fs.readFile as jest.Mock).mockResolvedValueOnce('');

        await metadataManager.loadMetadata();

        expect(fs.readFile).toHaveBeenCalledWith(expect.any(String), 'utf8');
        expect(metadataManager.getMetadata()).toEqual({});
    });

    it('should handle error while reading metadata file', async () => {
        const mockError = new Error('Read file error');
        (fs.readFile as jest.Mock).mockRejectedValueOnce(mockError);

        await metadataManager.loadMetadata();

        expect(fs.readFile).toHaveBeenCalledWith(expect.any(String), 'utf8');
        expect(metadataManager.getMetadata()).toEqual({});
        expect(console.error).toHaveBeenCalledWith(
            '[metadataManager.ts] 메타데이터 파일 읽기 오류:',
            mockError,
        );
    });

    it('should update page metadata', () => {
        const pageIdx = 'page1';
        const pageData = { path: '/path/to/page1' };

        metadataManager.updatePageMetadata(pageIdx, pageData);

        expect(metadataManager.getMetadata()).toEqual({
            page1: { path: '/path/to/page1' },
        });
        expect(console.log).toHaveBeenCalledWith(
            `[metadataManager.ts] 메타 데이터 업데이트 [${pageIdx}]`,
        );
    });

    it('should delete page metadata', () => {
        const pageIdx = 'page1';
        metadataManager.updatePageMetadata(pageIdx, { path: '/path/to/page1' });

        metadataManager.deletePageMetadata(pageIdx);

        expect(metadataManager.getMetadata()).toEqual({});
    });

    it('should save metadata to file', async () => {
        const mockMetadata = { page1: { path: '/path/to/page1' } };
        metadataManager.updatePageMetadata('page1', { path: '/path/to/page1' });

        await metadataManager.saveMetadata();

        expect(fs.writeFile).toHaveBeenCalledWith(
            expect.any(String),
            JSON.stringify(mockMetadata, null, 2),
        );
        expect(console.log).toHaveBeenCalledWith(
            '[metadataManager.ts] 메타데이터 파일 저장 성공',
        );
    });

    it('should handle error while saving metadata file', async () => {
        const mockError = new Error('Write file error');
        metadataManager.updatePageMetadata('page1', { path: '/path/to/page1' });
        (fs.writeFile as jest.Mock).mockRejectedValueOnce(mockError);

        await metadataManager.saveMetadata();

        expect(fs.writeFile).toHaveBeenCalledWith(
            expect.any(String),
            JSON.stringify(metadataManager.getMetadata(), null, 2),
        );
        expect(console.error).toHaveBeenCalledWith(
            '[metadataManager.ts] 메타데이터 파일 저장 오류:',
            mockError,
        );
    });

    it('should delete metadata and associated file', async () => {
        const pageIdx = 'page1';
        const mockPath = '/path/to/page1';
        metadataManager.updatePageMetadata(pageIdx, { path: mockPath });
        (fs.readFile as jest.Mock).mockResolvedValueOnce(
            JSON.stringify({ page1: { path: '/path/to/page1' } }),
        );

        await metadataManager.deleteFromMetadata(pageIdx);

        expect(fs.rm).toHaveBeenCalledWith(expect.any(String), {
            recursive: true,
        });
        expect(console.log).toHaveBeenCalledWith(
            '[metadataManager.ts] 파일 삭제 성공:',
            mockPath,
        );
    });

    it('should handle error while deleting file', async () => {
        const pageIdx = 'page1';
        const mockPath = '/path/to/page1';
        metadataManager.updatePageMetadata(pageIdx, { path: mockPath });
        const mockError = new Error('Delete file error');
        (fs.rm as jest.Mock).mockRejectedValueOnce(mockError);

        await metadataManager.deleteFromMetadata(pageIdx);

        expect(fs.rm).toHaveBeenCalledWith(expect.any(String), {
            recursive: true,
        });
        expect(console.error).toHaveBeenCalledWith(
            '[metadataManager.ts] 파일 삭제 오류:',
            mockError,
        );
    });
});
