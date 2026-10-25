export function alterJwtSignature(token: string): string {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[2]) {
    throw new Error('Sign-in must return a signed JWT with three nonempty segments');
  }
  const signature = parts[2];
  parts[2] = `${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;
  return parts.join('.');
}
