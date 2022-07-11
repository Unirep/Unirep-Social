const ignores = ['/node_modules/', './node_modules/nanoid/index.js', "node_modules/(?!(randomFillSync)/)"];

module.exports = {
    preset: 'ts-jest', 
    roots: ['<rootDir>'],
    modulePaths: [
        "<rootDir>/src"
    ],
    moduleDirectories: [
        "node_modules",
    ],
    transformIgnorePatterns: [...ignores],
    transform: {
        '^.+\\.(ts|tsx)?$': 'ts-jest',
        '^.+\\.(js|jsx)$': 'babel-jest',
        '^.+\\.(gif|svg|ico)$': '<rootDir>/svgTransform.js',
    },
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.js?$',
    moduleFileExtensions: ['tsx', 'js', 'ts'],
    moduleNameMapper: {
        "\\.(css|less|scss|sass)$": "identity-obj-proxy",
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
    clearMocks: true,
    // collectCoverage: true, // todo
    // coverageDirectory: "coverage",  // todo
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['@testing-library/jest-dom/extend-expect', './src/tests/setup.js'],
    resolver: 'jest-webpack-resolver',
    // extensionsToTreatAsEsm: ['.tsx', '.ts', '.jsx'],
    // globals: {
    //     'ts-jest': {
    //     useESM: true,
    //     },
    // },
}

// run `yarn node --experimental-vm-modules $(yarn bin jest)` to run all tests