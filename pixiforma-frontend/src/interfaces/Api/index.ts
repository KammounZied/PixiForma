interface IRefreshApiResponse {
    status: number
    data: {
        accessToken: string
        refreshToken: string
    }
}

export type {
    IRefreshApiResponse
}
