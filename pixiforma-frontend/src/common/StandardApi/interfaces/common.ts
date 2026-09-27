
import { Session } from "next-auth";

type ContentType = "application/json" | "multipart/form-data" | "text/plain" | null;

interface ApiHeaders {
    'Content-Type'?: string;
    'Accept'?: string;
    'Authorization'?: string;
}

interface AuthSession extends Session {
    accessToken?: string;
}

interface ApiConfig {
    withToken?: boolean;
    contentType?: ContentType;
    customToken?: string;
}

interface SuccessResponse<T> {
    status: number;
    data: T;
}

interface ErrorResponse {
    error: unknown;
    message: string;
}

interface SortCriteria {
    [field: string]: 'asc' | 'desc';
}



export interface IGetAllBrandsParams extends Partial<{
    [key: string]: string | number | SortCriteria | string[];
}> {
    page: number;
    perPage: number;
    search?: string;
    lang: string;
}

export interface IGetAllVariationsParams extends Partial<{
    [key: string]: string | SortCriteria | string[];
}> {
    lang: string;
    search?: string;
    page: string;
    perPage: string;
    sorts?: SortCriteria;
}

interface IGetByIdParams extends Partial<{
    [key: string]: string | SortCriteria | string[];
}> {
    lang?: string;
    id: string
}



interface IMultipleIds extends Partial<{
    [key: string]: string | SortCriteria | string[];
}> {
    ids: string[];
}

interface IsArchivedParams extends Partial<{
    [key: string]: string | SortCriteria | string[];
}> {
    lang: string;
    id: string
    isArchived: string
}

interface IIdParams extends Partial<{
    [key: string]: string | SortCriteria | string[];
}> {
    id: string;
}

interface IIdSubIdParams extends Partial<{
    [key: string]: string | SortCriteria | string[];
}> {
    id: string;
    storeRef: string;
    productRef: string;
}

interface IIdSubIdCodeParams extends Partial<{
    [key: string]: string | SortCriteria | string[];
}> {
    id: string;
    subId: string;
    code: string;
}

interface IGetByIdsParams extends Partial<{
    [key: string]: string | string[];
}> {
    ids: string | string[];
}





export type {

    SuccessResponse,
    ErrorResponse,
    ApiConfig,
    ApiHeaders,
    AuthSession,
    IGetByIdParams,
    IIdParams,
    IIdSubIdParams,
    IIdSubIdCodeParams,
    IsArchivedParams,
    IMultipleIds,
    IGetByIdsParams,
}
