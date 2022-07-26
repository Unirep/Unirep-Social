module.exports = {
    roots: ['<rootDir>'],
    modulePaths: ['<rootDir>/src'],
    moduleDirectories: ['node_modules'],
    transformIgnorePatterns: ['/node_modules/'],
    transform: {
        '^.+\\.(ts|tsx|js|jsx)?$': 'babel-jest',
        '^.+\\.(jpg|jpeg|png|gif|svg|ico|url)$':
            '<rootDir>/src/__tests__/__utils__/imageTransform.js',
    },
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.js?$',

    testPathIgnorePatterns: ['/__utils__/'],
    moduleFileExtensions: ['tsx', 'js', 'ts'],
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(png|jpg|webp|ttf|woff|woff2|svg|mp4)$':
            '<rootDir>/src/__mocks__/fileMock.js',
    },
    clearMocks: true,
    setupFilesAfterEnv: [
        '@testing-library/jest-dom/extend-expect',
        './src/__tests__/__utils__/setup.js',
    ],
    testEnvironment: 'jsdom',
    collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/tests'],
}
