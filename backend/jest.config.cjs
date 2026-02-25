/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^\\.\\./utils/database$': '<rootDir>/src/utils/database',
    '^\\.\\./utils/jwt$': '<rootDir>/src/utils/jwt',
    '^\\.\\./services/notificationService$': '<rootDir>/src/services/notificationService',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
