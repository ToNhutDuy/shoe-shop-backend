export class PaginationDto<T> {
    data: T[];
    pagination: {
        current: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}
