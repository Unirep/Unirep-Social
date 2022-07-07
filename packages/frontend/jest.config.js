module.exports = {
    preset: 'ts-jest',
    roots: ['<rootDir>'],
    modulePaths: ['<rootDir>/src'],
    moduleDirectories: ['node_modules'],
    transformIgnorePatterns: ['<rootDir>/node_modules/'],
    transform: {
        '^.+\\.(ts|tsx|js|jsx)?$': 'ts-jest',
        '^.+\\.(gif|svg|ico)$': '<rootDir>/svgTransform.js',
    },
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.js?$',
    moduleFileExtensions: ['tsx', 'js', 'json', 'node', 'ts'],
    clearMocks: true,
    // collectCoverage: true, // todo
    // coverageDirectory: "coverage",  // todo
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['@testing-library/jest-dom/extend-expect'],
}
