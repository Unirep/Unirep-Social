import { TableData } from 'anondb'
import { schema } from '@unirep-social/core'
import { nanoid } from 'nanoid'

const _schema = [
    {
        name: 'OAuthState',
        rows: [
            {
                name: 'createdAt',
                type: 'Int',
                default: () => +new Date(),
            },
        ],
    },
    {
        name: 'AccountNonce',
        primaryKey: 'address',
        rows: [
            ['address', 'String'],
            ['nonce', 'Int'],
        ],
    },
    {
        name: 'AccountTransaction',
        primaryKey: 'signedData',
        rows: [
            ['signedData', 'String'],
            ['address', 'String'],
            ['nonce', 'Int'],
        ],
    },
    {
        name: 'InvitationCode',
        rows: [
            {
                name: 'createdAt',
                type: 'Int',
                default: () => +new Date(),
            },
            ['code', 'String'],
        ],
    },
    {
        name: 'Report',
        rows: [
            {
                name: 'createdAt',
                type: 'Int',
                default: () => +new Date(),
            },
            ['issue', 'String'],
            ['email', 'String', { optional: true }],
        ],
    },
]

export default _schema
    .map(
        (obj) =>
            ({
                ...obj,
                primaryKey: obj.primaryKey || '_id',
                rows: [
                    ...obj.rows,
                    {
                        name: '_id',
                        type: 'String',
                        default: () => nanoid(),
                    },
                ],
            } as TableData)
    )
    .concat(schema) as TableData[]
