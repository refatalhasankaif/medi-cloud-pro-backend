export interface TErrorSource {
    path: string;
    message: string;
}

export interface TErrorResponce {
    statusCode?: number;
    success: boolean;
    message: string;
    errorSource?: TErrorSource[];
    stack?: string;
    error?: unknown;
}