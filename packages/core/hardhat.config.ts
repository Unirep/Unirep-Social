import '@typechain/hardhat'
import '@nomiclabs/hardhat-ethers'
import '@nomicfoundation/hardhat-chai-matchers'

export default {
    defaultNetwork: 'local',
    networks: {
        hardhat: {
            blockGasLimit: 12000000,
            mining: {
                auto: true,
                interval: 1000,
            },
        },
        optimism: {
            url: 'https://goerli.optimism.io',
            accounts: [
                // 0xeb465b6C56758a1CCff6Fa56aAee190646A597A0
                '0x18ef552014cb0717769838c7536bc1d3b1c800fe351aa2c38ac093fa4d4eb7d6',
            ],
        },
        local: {
            url: 'http://127.0.0.1:8545',
        },
    },
    solidity: {
        compilers: [
            {
                version: '0.8.19',
            },
        ],
        settings: {
            optimizer: { enabled: true, runs: 2 ** 32 - 1 },
        },
    },
    typechain: {
        outDir: './typechain',
    },
}
