import { faker } from '@faker-js/faker';
import type { RegistrationRequest } from '../types/registration';

function generateName(generate: () => string): string {
  let name: string;
  do {
    name = generate();
  } while (name.length < 4);
  return name.slice(0, 255);
}

export function generateRegistrationData(
  overrides: Partial<RegistrationRequest> = {},
): RegistrationRequest {
  const firstName = generateName(() => faker.person.firstName());
  const id = faker.string.uuid();

  return {
    username: `${firstName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 20)}_${id}`,
    email: `registration-${id}@example.invalid`,
    password: `Aa9!${faker.string.alphanumeric(20)}`,
    firstName,
    lastName: generateName(() => faker.person.lastName()),
    ...overrides,
  };
}
