import { TableData } from 'anondb'
import { nanoid } from 'nanoid'
import { schema } from '@unirep/core'

const _schema = [
    {
        name: 'Vote',
        rows: [
            {
                name: 'createdAt',
                type: 'Int',
                default: () => +new Date(),
            },
            ['transactionHash', 'String'],
            ['epoch', 'Int'],
            ['voter', 'String'],
            ['receiver', 'String'],
            ['posRep', 'Int'],
            ['negRep', 'Int'],
            ['graffiti', 'String', { optional: true }],
            ['overwriteGraffiti', 'Bool', { optional: true }],
            ['postId', 'String', { optional: true }],
            ['commentId', 'String', { optional: true }],
            ['status', 'Int'],
        ],
    },
    {
        name: 'Comment',
        rows: [
            {
                name: 'createdAt',
                type: 'Int',
                default: () => +new Date(),
            },
            {
                name: 'lastUpdatedAt',
                type: 'Int',
                default: () => +new Date(),
            },
            ['postId', 'String', { optional: true }],
            ['onChainId', 'String', { optional: true }],
            ['transactionHash', 'String', { optional: true }],
            ['content', 'String', { optional: true }],
            ['hashedContent', 'String'],
            ['epoch', 'Int'],
            ['epochKey', 'String'],
            ['graffiti', 'String', { optional: true }],
            ['proveMinRep', 'Bool', { optional: true }],
            ['minRep', 'Int', { optional: true }],
            {
                name: 'posRep',
                type: 'Int',
                default: () => 0,
            },
            {
                name: 'negRep',
                type: 'Int',
                default: () => 0,
            },
            {
                name: 'totalRep',
                type: 'Int',
                default: () => 0,
            },
            ['status', 'Int'],
        ],
    },
    {
        name: 'Post',
        rows: [
            {
                name: 'createdAt',
                type: 'Int',
                default: () => +new Date(),
            },
            {
                name: 'lastUpdatedAt',
                type: 'Int',
                default: () => +new Date(),
            },
            ['graffiti', 'String', { optional: true }],
            ['onChainId', 'String', { optional: true }],
            ['transactionHash', 'String', { optional: true }],
            ['title', 'String', { optional: true }],
            ['content', 'String', { optional: true }],
            ['topic', 'String', { optional: true }],
            ['hashedContent', 'String'],
            ['epoch', 'Int'],
            ['epochKey', 'String'],
            ['proveMinRep', 'Bool', { optional: true }],
            ['minRep', 'Int', { optional: true }],
            {
                name: 'posRep',
                type: 'Int',
                default: () => 0,
            },
            {
                name: 'negRep',
                type: 'Int',
                default: () => 0,
            },
            {
                name: 'totalRep',
                type: 'Int',
                default: () => 0,
            },
            ['status', 'Int'],
            {
                name: 'commentCount',
                type: 'Int',
                default: () => 0,
            },
        ],
    },
    {
        name: 'Record',
        rows: [
            {
                name: 'createdAt',
                type: 'Int',
                default: () => +new Date(),
            },
            ['to', 'String'],
            ['from', 'String'],
            ['upvote', 'Int'],
            ['downvote', 'Int'],
            ['epoch', 'Int'],
            ['action', 'String'],
            ['data', 'String', { optional: true }],
            ['transactionHash', 'String', { unique: true }],
            {
                name: 'confirmed',
                type: 'Int',
                default: () => 1,
            },
            {
                name: 'spentFromSubsidy',
                type: 'Bool',
                default: () => false,
            },
        ],
    },
    {
        name: 'OAuthState',
        rows: [
            {
                name: 'createdAt',
                type: 'Int',
                default: () => +new Date(),
            },
            ['type', 'String'],
            ['redirectDestination', 'String'],
            ['data', 'String', { optional: true }],
        ],
    },
    {
        name: 'SignupCode',
        rows: [
            ['signupId', 'String'],
            ['usedAt', 'Int', { optional: true }],
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
                primaryKey: (obj as any).primaryKey || '_id',
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
