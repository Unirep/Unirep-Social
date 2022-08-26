import '@typechain/hardhat'
import { HardhatUserConfig } from 'hardhat/config'
import '@nomiclabs/hardhat-ethers'
import '@nomicfoundation/hardhat-chai-matchers'

export default {
    defaultNetwork: 'hardhat',
    networks: {
        hardhat: {
            blockGasLimit: 12000000,
        },
        optimism: {
            url: 'https://goerli.optimism.io',
            accounts: [
                // 0xeb465b6C56758a1CCff6Fa56aAee190646A597A0
                '0x18ef552014cb0717769838c7536bc1d3b1c800fe351aa2c38ac093fa4d4eb7d6',
            ],
        },
        local: {
            url: 'http://localhost:8545',
        },
    },
    solidity: {
        compilers: [
            {
                version: '0.8.6',
            },
            {
                version: '0.6.11',
            },
        ],
        settings: {
            optimizer: { enabled: true, runs: 200 },
        },
    },
    typechain: {
        outDir: './typechain',
    },
}
