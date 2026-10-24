import { test as authTest } from './auth.fixture';
import { useRegisteredUser, type AuthenticatedUser } from '../support/registered-user';

// This account may be deleted by the test; the observer outlives its teardown.
export const test = authTest.extend<{ lifecycleUser: AuthenticatedUser }>({
  lifecycleUser: async ({ authClient, usersClient, authenticatedUser }, use) =>
    useRegisteredUser({ authClient, usersClient }, use, { observerToken: authenticatedUser.token }),
});

export type { AuthenticatedUser as LifecycleUser } from '../support/registered-user';
export { expect } from './auth.fixture';
