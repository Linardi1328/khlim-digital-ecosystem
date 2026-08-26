export interface ApiClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  getAccessToken?: () => Promise<string | null> | string | null;
}

export interface ApiRequestOptions extends RequestInit {
  authenticated?: boolean;
}

export class ApiError extends Error {
  readonly status: number;
  readonly responseBody: unknown;

  constructor(message: string, status: number, responseBody: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

export interface ApiClient {
  request<T>(path: string, options?: ApiRequestOptions): Promise<T>;
  get<T>(path: string, options?: ApiRequestOptions): Promise<T>;
  post<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T>;
  patch<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T>;
  delete<T>(path: string, options?: ApiRequestOptions): Promise<T>;
}

function normalizeBaseUrl(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, "");

  if (!normalized) {
    throw new Error("API base URL is required");
  }

  return normalized;
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text.length > 0 ? text : undefined;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetchImpl = options.fetchImpl ?? fetch;

  async function request<T>(
    path: string,
    requestOptions: ApiRequestOptions = {},
  ): Promise<T> {
    if (!path.startsWith("/")) {
      throw new Error(`API path must start with '/': ${path}`);
    }

    const headers = new Headers(requestOptions.headers);
    const authenticated = requestOptions.authenticated ?? true;

    if (authenticated && options.getAccessToken) {
      const accessToken = await options.getAccessToken();

      if (accessToken) {
        headers.set("authorization", `Bearer ${accessToken}`);
      }
    }

    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...requestOptions,
      headers,
    });

    const responseBody = await readResponseBody(response);

    if (!response.ok) {
      throw new ApiError(
        `KHLIM API request failed with status ${response.status}`,
        response.status,
        responseBody,
      );
    }

    return responseBody as T;
  }

  function withJsonBody(
    body: unknown,
    requestOptions: ApiRequestOptions,
  ): ApiRequestOptions {
    const headers = new Headers(requestOptions.headers);
    headers.set("content-type", "application/json");

    return {
      ...requestOptions,
      headers,
      body: JSON.stringify(body),
    };
  }

  async function get<T>(
    path: string,
    requestOptions?: ApiRequestOptions,
  ): Promise<T> {
    return request<T>(path, { ...requestOptions, method: "GET" });
  }

  async function post<T>(
    path: string,
    body?: unknown,
    requestOptions: ApiRequestOptions = {},
  ): Promise<T> {
    return request<T>(path, {
      ...withJsonBody(body, requestOptions),
      method: "POST",
    });
  }

  async function patch<T>(
    path: string,
    body?: unknown,
    requestOptions: ApiRequestOptions = {},
  ): Promise<T> {
    return request<T>(path, {
      ...withJsonBody(body, requestOptions),
      method: "PATCH",
    });
  }

  async function deleteRequest<T>(
    path: string,
    requestOptions?: ApiRequestOptions,
  ): Promise<T> {
    return request<T>(path, { ...requestOptions, method: "DELETE" });
  }

  return {
    request,
    get,
    post,
    patch,
    delete: deleteRequest,
  };
}
