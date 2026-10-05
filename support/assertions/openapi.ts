import { expect } from '@playwright/test';
import type {
  OpenApiDocument,
  OpenApiEndpoint,
  OpenApiOperation,
  OpenApiSecurityRequirement,
} from '../../types/openapi';

function getRequiredOperation(
  document: OpenApiDocument,
  [method, path]: OpenApiEndpoint,
): OpenApiOperation {
  const operation = document.paths?.[path]?.[method];
  expect(operation, `${method.toUpperCase()} ${path}: operation missing`).toBeDefined();
  return operation!;
}

function effectiveSecurity(
  document: OpenApiDocument,
  operation: OpenApiOperation,
): OpenApiSecurityRequirement[] {
  return operation.security ?? document.security ?? [];
}

export function expectBearerRequired(document: OpenApiDocument, endpoint: OpenApiEndpoint): void {
  const operation = getRequiredOperation(document, endpoint);
  const security = effectiveSecurity(document, operation);
  const label = `${endpoint[0].toUpperCase()} ${endpoint[1]}`;

  expect(security.length, `${label}: security required`).toBeGreaterThan(0);
  expect(
    security.every(requirement => Object.hasOwn(requirement, 'bearerAuth')),
    `${label}: every alternative must require bearerAuth`,
  ).toBe(true);
}

export function expectAnonymousAccess(document: OpenApiDocument, endpoint: OpenApiEndpoint): void {
  const operation = getRequiredOperation(document, endpoint);
  const security = effectiveSecurity(document, operation);
  const label = `${endpoint[0].toUpperCase()} ${endpoint[1]}`;

  expect(
    security.length === 0 || security.some(requirement => Object.keys(requirement).length === 0),
    `${label}: anonymous access must be allowed`,
  ).toBe(true);
}
