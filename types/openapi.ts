export type OpenApiMethod =
  | 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace';

export type OpenApiEndpoint = readonly [method: OpenApiMethod, path: string];
export type OpenApiSecurityRequirement = Record<string, string[]>;

export interface OpenApiOperation {
  security?: OpenApiSecurityRequirement[];
}

// Only the fields used by the documentation tests.
export interface OpenApiDocument {
  openapi: string;
  info: { title: string };
  paths: Record<string, Partial<Record<OpenApiMethod, OpenApiOperation>>>;
  security?: OpenApiSecurityRequirement[];
  components?: {
    securitySchemes?: Record<string, { type: string; scheme?: string }>;
  };
}
