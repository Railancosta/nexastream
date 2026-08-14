/**
 * API client for the NexaStream REST API v1.
 * Handles auth tokens (access + refresh) and upload chunking.
 */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserInfo {
  id: string;
  email: string;
  username: string;
  role: string;
}

export class ApiClient {
  private readonly baseUrl: string;
  private tokens: AuthTokens | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setTokens(tokens: AuthTokens): void {
    this.tokens = tokens;
  }

  getTokens(): AuthTokens | null {
    return this.tokens;
  }

  private authHeaders(): Record<string, string> {
    if (!this.tokens) return {};
    return { Authorization: `Bearer ${this.tokens.accessToken}` };
  }

  async register(email: string, username: string, password: string): Promise<{ user: UserInfo; tokens: AuthTokens }> {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "request failed" }));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    const tokens = { accessToken: data.accessToken, refreshToken: data.refreshToken };
    this.setTokens(tokens);
    return { user: data.user, tokens };
  }

  async login(email: string, password: string): Promise<{ user: UserInfo; tokens: AuthTokens }> {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "request failed" }));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    const tokens = { accessToken: data.accessToken, refreshToken: data.refreshToken };
    this.setTokens(tokens);
    return { user: data.user, tokens };
  }

  async logout(): Promise<void> {
    await fetch(`${this.baseUrl}/api/v1/auth/logout`, { method: "POST", headers: this.authHeaders() });
    this.tokens = null;
  }

  async health(): Promise<{ status: string; version: string }> {
    const res = await fetch(`${this.baseUrl}/api/v1/health`);
    return res.json();
  }

  async initUpload(filename: string, mimeType: string, declaredSize: number): Promise<{ uploadId: string }> {
    const res = await fetch(`${this.baseUrl}/api/v1/uploads`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.authHeaders() },
      body: JSON.stringify({ filename, mimeType, declaredSize }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "request failed" }));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async uploadChunk(uploadId: string, index: number, bytes: Uint8Array): Promise<{ accepted: boolean }> {
    const res = await fetch(`${this.baseUrl}/api/v1/uploads/${uploadId}/chunks/${index}`, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream", ...this.authHeaders() },
      body: bytes,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "request failed" }));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async completeUpload(uploadId: string): Promise<{ sha256: string; size: number }> {
    const res = await fetch(`${this.baseUrl}/api/v1/uploads/${uploadId}/complete`, {
      method: "POST",
      headers: this.authHeaders(),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "request failed" }));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async getUploadStatus(uploadId: string): Promise<{ status: string; acceptedIndices: number[] }> {
    const res = await fetch(`${this.baseUrl}/api/v1/uploads/${uploadId}`, {
      headers: this.authHeaders(),
    });
    return res.json();
  }
}
