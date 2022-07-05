import { TableData } from 'anondb'
import { schema } from '@unirep/core'
import { nanoid } from 'nanoid'

const _schema = [
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
            ['postId', 'String'],
            ['transactionHash', 'String', { optional: true }],
            ['content', 'String', { optional: true }],
            ['hashedContent', 'String', { optional: true }],
            ['epoch', 'Int'],
            ['epochKey', 'String'],
            ['proofIndex', 'Int', { optional: true }],
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
            ['transactionHash', 'String', { optional: true }],
            ['title', 'String', { optional: true }],
            ['content', 'String', { optional: true }],
            ['hashedContent', 'String', { optional: true }],
            ['epoch', 'Int'],
            ['epochKey', 'String'],
            ['proofIndex', 'Int', { optional: true }],
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
        name: 'UserSignUp',
        rows: [
            ['transactionHash', 'String'],
            ['commitment', 'String'],
            ['epoch', 'Int'],
        ],
    },
    {
        name: 'EpkRecord',
        rows: [
            {
                name: 'createdAt',
                type: 'Int',
                default: () => +new Date(),
            },
            ['epk', 'String'],
            ['posRep', 'Int'],
            ['negRep', 'Int'],
            ['spent', 'Int'],
            ['epoch', 'Int'],
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
            ['transactionHash', 'String', { optional: true }],
            {
                name: 'confirmed',
                type: 'Bool',
                default: () => true,
            },
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
