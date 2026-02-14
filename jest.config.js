/** @type {import('jest').Config} */
const config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/lib'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },
    testMatch: ['**/__tests__/**/*.test.ts'],
    collectCoverageFrom: [
        'lib/engine/**/*.ts',
        '!lib/engine/**/__tests__/**',
    ],
};

module.exports = config;
