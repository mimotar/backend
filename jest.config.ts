module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/tests/**/*.ts'],
    setupFilesAfterEnv: ['<rootDir>/src/utils/jestSetup.ts'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    // coverageDirectory: './coverage',
    // collectCoverageFrom: [
    //   'src/**/*.ts',
    //   '!src/**/*.d.ts',
    //   '!src/**/*.test.ts',
    //   '!src/test-utils/**',
    //   '!src/types/**',
    // ]
  };