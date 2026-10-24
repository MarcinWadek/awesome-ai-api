import { test as clientTest } from './clients.fixture';
import { useRegisteredUser, type AuthenticatedUser } from '../support/registered-user';

export const test = clientTest.extend<{
  authenticatedUser: AuthenticatedUser;
  authenticatedPeer: AuthenticatedUser;
}>({
  authenticatedUser: async ({ authClient, usersClient }, use) =>
    useRegisteredUser({ authClient, usersClient }, use),
  authenticatedPeer: async ({ authClient, usersClient }, use) =>
    useRegisteredUser({ authClient, usersClient }, use),
});

export type { AuthenticatedUser } from '../support/registered-user';
export { expect } from './clients.fixture';
