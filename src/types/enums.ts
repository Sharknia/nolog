// 페이지 상태값 열거형 정의
export enum PageStatus {
    Deleted = 'Deleted', // 삭제됨
    Writing = 'Writing', // 작성중
    Ready = 'Ready', // 포스팅 준비됨
    Updated = 'Updated', // 업데이트됨
    ToBeDeleted = 'ToBeDeleted', // 삭제될 예정
}
