import '@typechain/hardhat'
import { HardhatUserConfig } from 'hardhat/config'
import '@nomiclabs/hardhat-ethers'
import '@nomicfoundation/hardhat-chai-matchers'

const config: HardhatUserConfig = {
    defaultNetwork: 'hardhat',
    networks: {
        hardhat: {
            blockGasLimit: 12000000,
        },
        optimism: {
            //url: 'https://kovan.optimism.io',
            url: 'https://opt-goerli.g.alchemy.com/v2/C_Y7sd1-CSmvHUmu5Dx0w750Uzc-TG8Q',
            accounts: [
                // 0xeb465b6C56758a1CCff6Fa56aAee190646A597A0
                //'0x18ef552014cb0717769838c7536bc1d3b1c800fe351aa2c38ac093fa4d4eb7d6',
                '0xaff5d356ad526837291c2283a7ef25a895a3a35ba42e80a8852b6fab5ea8968e',
            ],
        },
        local: {
            url: 'http://localhost:8545',
        },
    },
    solidity: {
        version: '0.8.6',
        settings: {
            optimizer: { enabled: true, runs: 200 },
        },
    },
    typechain: {
        outDir: './typechain',
    },
}

export default config
