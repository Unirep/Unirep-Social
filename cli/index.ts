#!/usr/bin/env node

import argparse from 'argparse'

import {
    genUnirepIdentity,
    configureSubparser as configureSubparserForGenUnirepIdentity,
} from './genUnirepIdentity'

import {
    deploy,
    configureSubparser as configureSubparserForDeploy,
} from './deploy'

import {
    userSignUp,
    configureSubparser as configureSubparserForUserSignUp,
} from './userSignUp'

import {
    genEpochKeyAndProof,
    configureSubparser as configureSubparserForGenEpochKeyAndProof,
} from './genEpochKeyAndProof'

import {
    verifyEpochKeyProof,
    configureSubparser as configureSubparserForVerifyEpochKeyProof,
} from './verifyEpochKeyProof'

import {
    genReputationProof,
    configureSubparser as configureSubparserForGenReputationProof,
} from './genReputationProof'

import {
    verifyReputationProof,
    configureSubparser as configureSubparserForVerifyReputationProof,
} from './verifyReputationProof'

import {
    publishPost,
    configureSubparser as configureSubparserForPublishPost,
} from './publishPost'

import {
    leaveComment,
    configureSubparser as configureSubparserForLeaveComment,
} from './leaveComment'

import { vote, configureSubparser as configureSubparserForVote } from './vote'

import {
    epochTransition,
    configureSubparser as configureSubparserForEpochTransition,
} from './epochTransition'

import {
    userStateTransition,
    configureSubparser as configureSubparserForGenUserStateTransitionProof,
} from './userStateTransition'

import {
    genAirdropProof,
    configureSubparser as configureSubparserForGenAirdropProof,
} from './genAirdropProof'

import {
    verifyAirdropProof,
    configureSubparser as configureSubparserForVerifyAirdropProof,
} from './verifyAirdropProof'

import {
    giveAirdrop,
    configureSubparser as configureSubparserForGiveAirdrop,
} from './giveAirdrop'

const main = async () => {
    const parser = new argparse.ArgumentParser({
        description: 'Unirep Social',
    })

    const subparsers = parser.add_subparsers({
        title: 'Subcommands',
        dest: 'subcommand',
    })

    // Subcommand: genUnirepIdentity
    configureSubparserForGenUnirepIdentity(subparsers)

    // Subcommand: deploy
    configureSubparserForDeploy(subparsers)

    // // Subcommand: eventListners
    // configureSubparserForEventListeners(subparsers)

    // Subcommand: userSignup
    configureSubparserForUserSignUp(subparsers)

    // // Subcommand: attesterSignup
    // configureSubparserForAttesterSignup(subparsers)

    // Subcommand: genEpochKeyAndProof
    configureSubparserForGenEpochKeyAndProof(subparsers)

    // Subcommand: verifyEpochKeyProof
    configureSubparserForVerifyEpochKeyProof(subparsers)

    // Subcommand: genReputationProof
    configureSubparserForGenReputationProof(subparsers)

    // Subcommand: verifyReputationProof
    configureSubparserForVerifyReputationProof(subparsers)

    // Subcommand: publishPost
    configureSubparserForPublishPost(subparsers)

    // Subcommand: leaveComment
    configureSubparserForLeaveComment(subparsers)

    // Subcommand: vote
    configureSubparserForVote(subparsers)

    // Subcommand: epochTransition
    configureSubparserForEpochTransition(subparsers)

    // Subcommand: userStateTransition
    configureSubparserForGenUserStateTransitionProof(subparsers)

    // Subcommand: genAirdropProof
    configureSubparserForGenAirdropProof(subparsers)

    // Subcommand: verifyAirdropProof
    configureSubparserForVerifyAirdropProof(subparsers)

    // Subcommand: giveAirdrop
    configureSubparserForGiveAirdrop(subparsers)

    const args = parser.parse_args()

    // Execute the subcommand method
    if (args.subcommand === 'genUnirepIdentity') {
        await genUnirepIdentity(args)
    } else if (args.subcommand === 'deploy') {
        await deploy(args)
    } else if (args.subcommand === 'userSignUp') {
        await userSignUp(args)
    } else if (args.subcommand === 'genEpochKeyAndProof') {
        await genEpochKeyAndProof(args)
    } else if (args.subcommand === 'verifyEpochKeyProof') {
        await verifyEpochKeyProof(args)
    } else if (args.subcommand === 'genReputationProof') {
        await genReputationProof(args)
    } else if (args.subcommand === 'verifyReputationProof') {
        await verifyReputationProof(args)
    } else if (args.subcommand === 'publishPost') {
        await publishPost(args)
    } else if (args.subcommand === 'leaveComment') {
        await leaveComment(args)
    } else if (args.subcommand === 'vote') {
        await vote(args)
    } else if (args.subcommand === 'epochTransition') {
        await epochTransition(args)
    } else if (args.subcommand === 'userStateTransition') {
        await userStateTransition(args)
    } else if (args.subcommand === 'genAirdropProof') {
        await genAirdropProof(args)
    } else if (args.subcommand === 'verifyAirdropProof') {
        await verifyAirdropProof(args)
    } else if (args.subcommand === 'giveAirdrop') {
        await giveAirdrop(args)
    }
    process.exit(0)
}

if (require.main === module) {
    main()
}
