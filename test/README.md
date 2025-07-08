# DAO Application Testing

## Testing Strategy

### Unit Tests
Unit tests are located in the `src` directory alongside the source files they test, with the naming convention `*.spec.ts`.

### E2E Tests
End-to-end tests are located in the `test` directory with the naming convention `*.e2e-spec.ts`.

## Coverage Exclusions

The following files are excluded from coverage calculations:

- **main.ts**: The application bootstrap file is excluded from unit test coverage requirements because:
  1. It primarily contains integration code that initializes the application
  2. It has side effects (starting servers, etc.) that make it difficult to unit test
  3. It is implicitly tested through E2E tests
  4. Testing it would require extensive mocking of external dependencies

This decision was made to focus testing efforts on the business logic and components of the application rather than the bootstrap process.

## Running Tests

To run tests for the DAO application:

```bash
# Run unit tests
npm test -- apps/dao

# Run unit tests with coverage
npm test -- apps/dao --coverage

# Run unit tests with coverage excluding main.ts
npm test -- apps/dao --coverage --collectCoverageFrom='apps/dao/src/**/*.ts' --collectCoverageFrom='!apps/dao/src/main.ts' --coverageDirectory='coverage/apps/dao'

# Run E2E tests
npm run test:e2e -- apps/dao
``` 