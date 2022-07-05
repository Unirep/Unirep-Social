import { ActionType } from './context/Queue'

export const isVotedText = "You've already voted."
export const isAuthorText = 'You cannot vote on your own post or comment.'
export const notLoginText = 'Sign in to participate.'
export const loadingText = 'Some action is pending, please wait...'
export const expiredText = 'You cannot vote on posts with expired epoch key.'
export const offChainText = 'This post is not able to be voted yet.'

export interface User {
    identity: string
    epoch_keys: string[]
    all_epoch_keys: string[]
    reputation: number
    current_epoch: number
    isConfirmed: boolean
    spent: number
    userState: any
}

export interface Vote {
    _id: string
    transactionHash: string
    epoch: number
    voter: string
    receiver: string
    posRep: number
    negRep: number
    graffiti: string
    overwriteGraffiti: boolean
    postId: string
    commentId: string
    status: number // 0: pending, 1: on-chain, 2: disabled
}

export interface Comment {
    type: DataType
    id: string // === txHash
    post_id: string
    content: string
    upvote: number
    downvote: number
    epoch_key: string
    username: string
    post_time: number
    reputation: number
    current_epoch: number
    proofIndex: number
}

export interface Post {
    type: DataType
    id: string // txHash
    title: string
    content: string
    upvote: number
    downvote: number
    epoch_key: string
    username: string
    post_time: number
    reputation: number
    commentCount: number
    current_epoch: number
    proofIndex: number
}

export enum ButtonType {
    Comments = 'comments',
    Boost = 'boost',
    Squash = 'squash',
    Share = 'share',
    Post = 'post',
    Activity = 'activity',
    Save = 'save',
}

export enum InfoType {
    epk4Post = 'Select a persona to post this',
    epk4Comment = 'Select a persona to comment this',
    rep = 'Show off or be modest. This might influence how other people perceive your content.',
    countdown = 'You will be able to boost or squash the posts that are created during this cycle until it ends. When a  cycle is over, content from that cycle becomes read-only.',
    persona = 'Each cycle, the system gives you new personas. It would take a million years to associate your identity with any content you post here. You have all the freedom to be who you are, but let’s be nice to each other :)',
}

export interface Record {
    action: ActionType
    from: string
    to: string
    upvote: number
    downvote: number
    epoch: number
    time: number
    data_id: string
    content: string
}

export type FeedChoices = {
    query0: QueryType // popularity or time
    query1: QueryType // pos or neg
    query2: QueryType // main type
    query3: QueryType // period
}

export enum PageStatus {
    None,
    SignUp,
    SignIn,
}

export enum DataType {
    Post,
    Comment,
}

export enum Page {
    Home = '/',
    Post = '/post',
    User = '/user',
    New = '/new',
    Setting = '/setting',
}

export enum ChoiceType {
    Feed,
    Epk,
}

export enum UserPageType {
    Posts = 'Posts',
    History = 'History',
    Settings = 'Settings',
}

export enum QueryType {
    New = 'new',
    Boost = 'boost',
    Comments = 'comments',
    Squash = 'squash',
    Rep = 'rep',
}

export enum AlertType {
    commentNotEnoughPoints = 'Boo, you do not have enough Rep to comment.',
    commentNotLogin = 'Please sign in to comment.',
    commentLoading = 'Loading...',
    postNotLogin = 'You must join or login to create post',
    postNotEnoughPoints = 'Post is disabled because you are running out of points...',
}

export interface Params {
    id: string
}

export interface Draft {
    title: string
    content: string
}

export const getDaysByString = (value: string) => {
    if (value === 'today') return 1
    else if (value === 'this week') return 7
    else if (value === 'this month') return 30
    else if (value === 'this year') return 365
    else return 365000
}

export const titlePrefix = '<t>'
export const titlePostfix = '</t>'

export const diffDays = (date: number, otherDate: number) =>
    Math.ceil(Math.abs(date - otherDate) / (1000 * 60 * 60 * 24))
