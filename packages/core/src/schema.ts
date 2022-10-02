import { TableData } from 'anondb'
import { schema } from '@unirep/core'
import { nanoid } from 'nanoid'

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
            ['postId', 'String', { optional: true }],
            ['onChainId', 'String', { optional: true }],
            ['transactionHash', 'String', { optional: true }],
            ['content', 'String', { optional: true }],
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
            ['onChainId', 'String', { optional: true }],
            ['transactionHash', 'String', { optional: true }],
            ['title', 'String', { optional: true }],
            ['content', 'String', { optional: true }],
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
            ['postId', 'String', { optional: true }],
            ['commentId', 'String', { optional: true }],
            ['transactionHash', 'String', { unique: true }],
            {
                name: 'confirmed',
                type: 'Int',
                default: () => 1,
            },
        ],
    },
]

const finalSchema = _schema
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
export { finalSchema as schema }
