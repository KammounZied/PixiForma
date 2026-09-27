import { ApiResponse } from '../types';
import { IRefreshApiResponse } from '@/interfaces';

export interface IApi {
    get(endPoint: string, headers: Headers, refrechCallback: () => Promise<IRefreshApiResponse>): Promise<ApiResponse>;
    delete(endPoint: string, body: any, headers: Headers, refrechCallback: () => Promise<IRefreshApiResponse>): Promise<ApiResponse>;
    post(endPoint: string, body: any, headers: Headers, refrechCallback: () => Promise<IRefreshApiResponse>): Promise<ApiResponse>;
    put(endPoint: string, body: any, headers: Headers, refrechCallback: () => Promise<IRefreshApiResponse>): Promise<ApiResponse>;
    patch(endPoint: string, body: any, headers: Headers, refrechCallback: () => Promise<IRefreshApiResponse>): Promise<ApiResponse>;
}
