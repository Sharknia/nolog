import { PageStatus } from '../enums';

describe('PageStatus', () => {
    it('should have the correct values', () => {
        expect(PageStatus.Deleted).toEqual('Deleted');
        expect(PageStatus.Writing).toEqual('Writing');
        expect(PageStatus.Ready).toEqual('Ready');
        expect(PageStatus.Updated).toEqual('Updated');
        expect(PageStatus.ToBeDeleted).toEqual('ToBeDeleted');
    });
});
