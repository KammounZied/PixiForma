import { HttpStatus } from "../interfaces/EHttpStatus";

export type HeaderObject = {
    Authorization: string;
    'Content-Type': string;
    accept: string;
    [key: string]: string;
};
export interface RefreshJson extends Partial<Response> {
    accessToken: string;
    refreshtoken: string;
}
export interface ApiResponse {
    status: HttpStatus;
    data: any;
    originalResponse?: Response;
}
