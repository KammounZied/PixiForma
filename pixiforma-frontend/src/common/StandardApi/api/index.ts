

import { ApiResponse } from "../types";
import { CommonFunction, Config } from "@/common";
import { IRefreshApiResponse } from "@/interfaces";
import { IApi } from "../interfaces/IApi";
import { HttpStatus } from "../interfaces/EHttpStatus";
import { Method } from "../interfaces/EMethod";

export class Api implements IApi {
  private readonly apiURL: string;

  constructor(apiURL = Config.getInstance().API_URL) {
    this.apiURL = `${apiURL}`;
    this.isFormData = this.isFormData.bind(this);
    this.standardApi = this.standardApi.bind(this);
    this.post = this.post.bind(this);
    this.get = this.get.bind(this);
    this.delete = this.delete.bind(this);
    this.patch = this.patch.bind(this);
    this.put = this.put.bind(this);
  }

  private isFormData(body: any): boolean {
    return typeof FormData !== 'undefined' && body instanceof FormData;
  }

  private async standardApi(
    method: Method,
    endPoint: string,
    body: any,
    headers: any,
    refrechCallback?: () => Promise<IRefreshApiResponse>,
  ): Promise<ApiResponse> {
    const isBodyFormData = this.isFormData(body);
    const bodyToSend = isBodyFormData ? body : JSON.stringify(body);

    const response = await fetch(this.apiURL + endPoint, {
      method,
      headers: headers,
      body: bodyToSend,
    });

    if (refrechCallback) {
      return this.processResponse(response, (header: any) =>
        this.standardApi(method, endPoint, body, header, refrechCallback),
        refrechCallback,
        headers
      );
    } else {
      const data = await this._getData(response)
      return {
        status: response.status,
        data: data,
      }
    }
  }

  private async processResponse(
    response: Response,
    callback: (headers: any) => Promise<ApiResponse>,
    refreshCallback: () => Promise<IRefreshApiResponse>,
    headers: any
  ): Promise<ApiResponse> {
    if (response.status === HttpStatus.Unauthorized) {
      try {
        const refreshResponse = await refreshCallback();
        if (refreshResponse.status === HttpStatus.SuccessOK) {
          const isContentTypeFormData = headers["Content-Type"] === undefined ||
            headers["Content-Type"]?.includes('multipart/form-data');

          const newHeader = await CommonFunction.createHeaders(
            {
              withToken: true,
              contentType: isContentTypeFormData ? null : "application/json",
              customToken: refreshResponse?.data?.accessToken
            }
          )
          const res = await callback(newHeader)
          return res
        } else {
          return { status: refreshResponse.status, data: refreshResponse?.data };
        }
      } catch (error: unknown) {
        console.error(error)
        return { status: HttpStatus.Internal, data: "" }
      }
    } else {
      let responseParsed = null;
      try {
        responseParsed = await response.json();
      } catch (_) {
        console.error(_)
        responseParsed = await response.blob();
      }
      return { status: response.status, data: responseParsed };
    }
  }

  async get(
    endPoint: string,
    headers: any,
    refrechCallback?: () => Promise<IRefreshApiResponse>,
    signal?: AbortSignal
  ): Promise<ApiResponse> {
    const response = await fetch(this.apiURL + endPoint, {
      method: Method.Get,
      headers,
      signal,
      cache: 'no-store' as RequestCache,
    });
    if (refrechCallback) {
      return this.processResponse(response, (header) => this.get(endPoint, header, refrechCallback), refrechCallback, headers);
    } else {
      const data = await this._getData(response)
      return {
        status: response.status,
        data: data,
      }
    }
  }

  async getBlob(
    endPoint: string,
    headers: any,
    refrechCallback?: () => Promise<IRefreshApiResponse>,
    signal?: AbortSignal
  ) {
    const response = await fetch(this.apiURL + endPoint, {
      method: Method.Get,
      headers,
      signal
    });

    if (refrechCallback) {
      return this.processResponse(response, (header) => this.get(endPoint, header, refrechCallback), refrechCallback, headers);
    } else {
      if (!response.ok) {
        const data = await response.json()
        return {
          status: response.status,
          data: data,
        }
      }
      return await response.blob();
    }
  }

  async getNotJson(
    endPoint: string,
    headers: any,
    refrechCallback?: () => Promise<IRefreshApiResponse>,
  ): Promise<ApiResponse> {
    const response = await fetch(this.apiURL + endPoint, {
      method: Method.Get,
      headers,
    });
    if (refrechCallback) {
      return this.processResponse(response, (header) => this.get(endPoint, header, refrechCallback), refrechCallback, headers);
    } else {
      let data = ""
      const result = await response?.body?.getReader()?.read();
      const { value } = result || {};
      if (value instanceof Uint8Array) {
        data += new TextDecoder().decode(value);
      } else if (typeof value === "string") {
        data += value;
      }
      return {
        status: response.status,
        data: data,
      }
    }
  }

  async post(
    endPoint: string,
    body: any,
    headers: any,
    refrechCallback?: () => Promise<IRefreshApiResponse>,
    isReturnBlob = false,
    signal?: AbortSignal
  ): Promise<ApiResponse> {
    const isBodyFormData = this.isFormData(body);

    const response = await fetch(this.apiURL + endPoint, {
      method: Method.Post,
      headers,
      body: isBodyFormData ? body : JSON.stringify(body),
      signal
    });

    if (refrechCallback) {
      return this.processResponse(response, (header) => this.post(endPoint, body, header, refrechCallback), refrechCallback, headers);
    } else {
      const data = await this._getData(response, isReturnBlob)
      return {
        status: response.status,
        data: data,
        originalResponse: response,
      }
    }
  }

  async postNotJson(
    endPoint: string,
    body: any,
    headers: any,
    refrechCallback?: () => Promise<IRefreshApiResponse>,
  ): Promise<ApiResponse> {
    headers = headers ? headers : await CommonFunction.createHeaders({ withToken: true })
    const response = await fetch(this.apiURL + endPoint, {
      method: Method.Post,
      body,
      headers,
    });
    if (refrechCallback) {
      return this.processResponse(response, (header) => this.post(endPoint, body, header, refrechCallback), refrechCallback, headers)
    } else {
      let data = ""
      const result = await response?.body?.getReader()?.read();
      const { value } = result || {};
      if (value instanceof Uint8Array) {
        data += new TextDecoder().decode(value);
      } else if (typeof value === "string") {
        data += value;
      }
      return {
        status: response.status,
        data: data,
      }
    }
  }

  async delete(
    endPoint: string,
    body: any,
    headers: any,
    refrechCallback?: () => Promise<IRefreshApiResponse>,
  ): Promise<ApiResponse> {
    headers = headers ? headers : await CommonFunction.createHeaders({ withToken: true })
    const response = await fetch(this.apiURL + endPoint, {
      method: Method.Delete,
      headers,
      body: JSON.stringify(body)
    });
    if (refrechCallback) {
      return this.processResponse(response, (header) => this.delete(endPoint, body, header), refrechCallback, headers);
    } else {
      const data = await this._getData(response)
      return {
        status: response.status,
        data: data,
      }
    }
  }

  async put(
    endPoint: string,
    body: any,
    headers: any,
    refrechCallback?: () => Promise<IRefreshApiResponse>,
  ): Promise<ApiResponse> {
    return this.standardApi(Method.Put, endPoint, body, headers, refrechCallback);
  }

  async patch(
    endPoint: string,
    body: any,
    headers: any = {},
    refrechCallback?: () => Promise<IRefreshApiResponse>,
  ): Promise<ApiResponse> {
    return this.standardApi(Method.Patch, endPoint, body, headers, refrechCallback);
  }

  async _getData(response: Response, isReturnBlob?: boolean) {
    let responseParsed = null;
    if (isReturnBlob) {
      responseParsed = await response.blob();
    } else {
      try {
        responseParsed = await response.json();
      } catch (_) {
        console.error(_)
        responseParsed = await response.blob();
      }
    }
    return responseParsed
  }
}
