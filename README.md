# Unirep Social With MongoDB

For more information about Unirep Social, refer to the [documentation](https://vivi432.gitbook.io/unirep-social/)

## Install and build

```
yarn install
```

then run

```
yarn build
``` 
to build Unirep Social contracts

## Testing
```
yarn test
```
to run test scripts
```
yarn test-cli
```
to test all cli commands.
## Example flow using cli commands with mongoDB

- Follow the instructions to install mongoDB: [Install MongoDB Community Edition](https://docs.mongodb.com/manual/administration/install-community/)

#### 1. Start a mongoDB server
It handles data requests, manages data access, and performs background management operations.
The data will be stored in the `<data path>`.
```
mongod --dbpath <data path>
```

#### 2. Spin up the testing chain
```
npx hardhat node
```
- NOTE: a list of default accounts will be printed, choose one of them to be deployer's account and one to be attester's.
- Deployer's private key will be referred to as `deployerPrivateKey` and `attesterPrivateKey` respectively.

#### 3. Deploy Unirep contract
```
npx ts-node cli/index.ts deploy -d <deployerPrivateKey>
```
- NOTE: If Unirep contract has not been deployed, both Unirep and Unirep Social contract's address will be printed. For example, 
```
Unirep: 0x0165878A594ca255338adfa4d48449f69242Eb8F
Unirep Social: 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
```
- Then we use the Unirep Social contract's address to interact with.

#### 4. Start an event listener (Fixing)
The listener will be triggered for events on the Unirep contract, and it will store the emitted data in mongoDB.
```
// npx ts-node cli/index.ts eventListeners -x 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
```

#### 5. User generates identity
```
npx ts-node cli/index.ts genUnirepIdentity
```
- base64url encoded identity and identity commitment will be printed, For example,
```
Unirep.identity.WyJlOGQ2NGU5OThhM2VmNjAxZThjZTNkNDQwOWQyZjc3MjEwOGJkMGI1NTgwODAzYjY2MDk0YTllZWExMzYxZjA2IiwiODZiYjk5ZGQ4MzA2ZGVkZDgxYTE4MzBiNmVjYmRlZjk5ZmVjYTU3M2RiNjIxMjk5NGMyMmJlMWEwMWZmMTEiLCIzMGE3M2MxMjE4ODQwNjE0MWQwYmI4NWRjZDY5ZjdhMjEzMWM1NWRkNDQzYWNmMGVhZTEwNjI2NzBjNDhmYSJd278
Unirep.identityCommitment.MTI0ZWQ1YTc4NjYzMWVhODViY2YzZDI4NWFhOTA5MzFjMjUwOTEzMzljYzAzODU3YTVlMzY5ZWYxZmI2NTAzNw
```

#### 5. User signs up
- Sign up user's semaphore identity with identity commitment with the prefix `Unirep.identityCommitment`.
```
npx ts-node cli/index.ts userSignup \
    -x 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853 \
    -c Unirep.identityCommitment.MTI0ZWQ1YTc4NjYzMWVhODViY2YzZDI4NWFhOTA5MzFjMjUwOTEzMzljYzAzODU3YTVlMzY5ZWYxZmI2NTAzNw \
    -d <deployerPrivateKey>
```
- MongoDB stores
    - Settings in the Unirep contract (only triggered once)
    - current epoch of this event
    - Hashed leaf in the global state tree
    - transaction hash of this event

#### 6. Attester signs up (TO BE ADDED)
```
// npx ts-node cli/index.ts attesterSignup \
//    -x 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853 \
//    -d <attesterPrivateKey>
```

#### 7. User generates epoch key and epoch key proof
```
npx ts-node cli/index.ts genEpochKeyAndProof \
    -x 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853 \
    -id Unirep.identity.WyJlOGQ2NGU5OThhM2VmNjAxZThjZTNkNDQwOWQyZjc3MjEwOGJkMGI1NTgwODAzYjY2MDk0YTllZWExMzYxZjA2IiwiODZiYjk5ZGQ4MzA2ZGVkZDgxYTE4MzBiNmVjYmRlZjk5ZmVjYTU3M2RiNjIxMjk5NGMyMmJlMWEwMWZmMTEiLCIzMGE3M2MxMjE4ODQwNjE0MWQwYmI4NWRjZDY5ZjdhMjEzMWM1NWRkNDQzYWNmMGVhZTEwNjI2NzBjNDhmYSJd \
    -n 0
```
- NOTE: `-id` is user's identity and `-n`  is epoch key nonce which should be less than the system parameter `maxEpochKeyNonce`
- NOTE: epoch key and base64url encoded epoch key proof and its public signals will be printed and they should be handed to attester to be verified, for example:
```
Epoch key of epoch 1 and nonce 0: 3630514969
Unirep.epk.proof.WyIxNjk3ODM4NzEwNzEwMzQyMDgyMjg3MzYzOTg3NTQ3NDgzMzI0NTU1ODIxMjc2NDM4MDY2Mzg1NTQ4MDk1MDcwMDQzNjk0MTk4Mjc0NiIsIjIzMDUwNjU3MDAwNDY0OTYzMjg5MjM3MTcwNTA4NDIwMzA5NDU1OTUyOTkyMDQ2ODM0ODc2ODE1OTA5OTY0MjI4MTA2Nzc3NDM2MDkiLCIxNTQ0OTA0NjkwNTU2NzkzMDU4MDk0NTYxMDkyNjU1MTk3ODI4ODQ4NDMwMDE3NTE3NzA1Nzc3MTM0ODgwNzAyODY3OTEzNjM1NDA5OSIsIjE1NDA5MzE5ODY5MDkxMjY5MTQyNzgyNTg0NDkwODI2ODQ5NDMxNTg5MzM4ODg1NjQ0NjUzNjMwMDgzMDI3MDgxNjgyNzAyMzA4MjM5IiwiMTk1NDMwMzkyNjQ5ODA4ODA4MDY2NDM5MDgyNzMxNDE2NDk4NzMyMTYzODU2OTgyMTg0NTU0ODE2MzkwMDU2NDY4MjM3MzgxNDgwNTIiLCI0NTc4NjY3NzA4OTc1MDQwMDkwOTY0MDMzMDI1MTEwNTExMTg1MzQwODMzNDM2NDk3MjM0MzEzOTc2MDIwMDM5MDYwOTk2OTcwNzIyIiwiMTA5MDg2NDc2NjMzMzEwMDc0NTIyNTI2MjYzODUwMjQ0MTk0MDY5MzE0Mzk4NzI1MDg4OTUxMzA1OTQwNjQyNjc0MDA4NDYwNzE3MzAiLCIxMTU5MzQyODczMjQzOTk0MDM4NTgxOTM2MzMxMjg0MTEyMTc0NTg5OTgzMjA3NTUyNjA3ODg2MzM2NDUyODY5MDAyMTY1NjE5MjMyOSJd
Unirep.epk.publicSignals.WyIxOTg0NzMyNTIzMDk4ODM1OTU5MDczMzY4NjY4NDc1MTc3MzAwOTI4MjUwNzUwNzUxMjEzMzk3NzUwNzI1NjI4MTA4ODExODUzNjg4NCIsIjEiLCIzNjMwNTE0OTY5Il0
```
#### 8. Attester verify epoch key proof
```
npx ts-node cli/index.ts verifyEpochKeyProof \
    -x 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853 \
    -pf Unirep.epkProof.WyIxNjk3ODM4NzEwNzEwMzQyMDgyMjg3MzYzOTg3NTQ3NDgzMzI0NTU1ODIxMjc2NDM4MDY2Mzg1NTQ4MDk1MDcwMDQzNjk0MTk4Mjc0NiIsIjIzMDUwNjU3MDAwNDY0OTYzMjg5MjM3MTcwNTA4NDIwMzA5NDU1OTUyOTkyMDQ2ODM0ODc2ODE1OTA5OTY0MjI4MTA2Nzc3NDM2MDkiLCIxNTQ0OTA0NjkwNTU2NzkzMDU4MDk0NTYxMDkyNjU1MTk3ODI4ODQ4NDMwMDE3NTE3NzA1Nzc3MTM0ODgwNzAyODY3OTEzNjM1NDA5OSIsIjE1NDA5MzE5ODY5MDkxMjY5MTQyNzgyNTg0NDkwODI2ODQ5NDMxNTg5MzM4ODg1NjQ0NjUzNjMwMDgzMDI3MDgxNjgyNzAyMzA4MjM5IiwiMTk1NDMwMzkyNjQ5ODA4ODA4MDY2NDM5MDgyNzMxNDE2NDk4NzMyMTYzODU2OTgyMTg0NTU0ODE2MzkwMDU2NDY4MjM3MzgxNDgwNTIiLCI0NTc4NjY3NzA4OTc1MDQwMDkwOTY0MDMzMDI1MTEwNTExMTg1MzQwODMzNDM2NDk3MjM0MzEzOTc2MDIwMDM5MDYwOTk2OTcwNzIyIiwiMTA5MDg2NDc2NjMzMzEwMDc0NTIyNTI2MjYzODUwMjQ0MTk0MDY5MzE0Mzk4NzI1MDg4OTUxMzA1OTQwNjQyNjc0MDA4NDYwNzE3MzAiLCIxMTU5MzQyODczMjQzOTk0MDM4NTgxOTM2MzMxMjg0MTEyMTc0NTg5OTgzMjA3NTUyNjA3ODg2MzM2NDUyODY5MDAyMTY1NjE5MjMyOSJd \
    -s Unirep.epk.publicSignals.WyIxOTg0NzMyNTIzMDk4ODM1OTU5MDczMzY4NjY4NDc1MTc3MzAwOTI4MjUwNzUwNzUxMjEzMzk3NzUwNzI1NjI4MTA4ODExODUzNjg4NCIsIjEiLCIzNjMwNTE0OTY5Il0
```

#### 9. User publish a post with an epoch key and proof
User can indicate to generate his user state from database using a `-db` flag. 
```
npx ts-node cli/index.ts publishPost \
    -x 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853 \
    -tx postText \
    -id Unirep.identity.WyJlOGQ2NGU5OThhM2VmNjAxZThjZTNkNDQwOWQyZjc3MjEwOGJkMGI1NTgwODAzYjY2MDk0YTllZWExMzYxZjA2IiwiODZiYjk5ZGQ4MzA2ZGVkZDgxYTE4MzBiNmVjYmRlZjk5ZmVjYTU3M2RiNjIxMjk5NGMyMmJlMWEwMWZmMTEiLCIzMGE3M2MxMjE4ODQwNjE0MWQwYmI4NWRjZDY5ZjdhMjEzMWM1NWRkNDQzYWNmMGVhZTEwNjI2NzBjNDhmYSJd \
    -n 0 \
    -d <deployerPrivateKey> \
    -db
```
- NOTE: epoch key and base64url encoded reputation proof and its public signals will be printed and they should be handed to attester to be verified, for example:
```
Epoch key of epoch 1 and nonce 0: 3630514969
Unirep.reputation.proof.WyIxMTIzMTY1NDY5Mjk2MjIxNDg3MTkwNTY3NDk2NzQwNjM0MzY0MDIyNTIzNzA3MzM5NDc2MzU1ODU1NzU4Njk0NjkxOTgyODk0MjE5NCIsIjk5ODcwODcxMzc1MjEwOTI0ODk5ODAxMTI2MzQ1ODk5ODMyMjgwNTM2MDA1MTY4NjcyNDMzMzIwMDE5NzMwODYyNDUyODQ3Nzg1MzciLCIxODE0NTQ0NTI0ODQxNDM5MDk4Njk1NzcwNjY1OTMxNTIwNDMzMDcxNTY0MTE5MDIxNzA2NzE5ODYwNjAwMzk1NDc2Mjc3MzU5NTc4MSIsIjE3MzEzODc5OTU3NzAwNTg4OTM1MDg1MjY1NDc1ODY2NjgxNDkzMzE2NTM4MDgzNTk0NzMwNDY5MTgzNTk1NTc2NDQ3MzYyNjA1MzU2IiwiMTY2NTIyNjc0MDQ0MjMzNjQ4Nzc1OTk5MTA2Mzc4NjM3NTk5MjY1Nzk4MTQ1MzA1Njk3MjM5NDQ2MDUzMjc2NTk0MDA0ODU2NDQwMzkiLCI5OTAxNTc0MTUxMzY3NDAzNjExMzcxMTQ0Mzg3NzEwNDU3NTIzOTg1Mjg1NDAyNTI2NTMyMDg5NTY5MzU1NTMwMDU4NDUzMzk2MzYiLCIxNjM3ODQ0OTA5NzU5NzM2OTU3NjUzMzMzMDkxMTIxOTExNzc3ODczNDI5MDg4MDgzOTc0NTczNzk4MzAwODc0NTc0MzAzMjIzNzc1NCIsIjEzODgzMjgxMDUxNzM1Njg2MDA5NTkwNzY1MzI1ODM0MDQ3OTcwNzY4MjUwNzcxMDMyNzQ2NDQ5NDExMjM3MjE3NjQzMTYzMjU4NiJd
Unirep.reputation.publicSignals.WyIxMjU2Mzc0NzEzODU1Nzg2OTA2NTEyNzU0OTMzMzcyMjY0NDE4NDMzOTI4MjE4OTgwNjcyOTU4Nzk4NjgwMzQ3ODY3MzQ5MTQyNjkzIiwiMzc3NDAzNzM5MTkzNzY2ODc4MzIyNTI1NjMyNzg0ODMxMDE3NzA5NDkxMDI2NTQwMTU5OTY1NTQ4NTk1NTM4ODIyNTIwNjk0MDQ3OSIsIjg4ODkzNzkxODY4ODg1MTMzMjE0OTY5MjQ5MjM2ODgyMTQ2ODc4OTMzMTI1NTU1OTk2OTE3OTE5ODc3MzE3NzI2NDUzOTk5NzI4MjgiLCIzMTQxMTQzNDU0NTc3MjgwODM0NDg3MTQ2MDg3MjcxNDYyODY3NzY1NzEwMzIzNzQ4Njc0NTI5ODk0MTA4NzczNTk0OTk2MTQ0Mzc4IiwiMTI0NTI2MjgzOTMyNTIyNzk5NjA3NjY4MzMwNDMyNDE2MzY1MjQ3MTE1MDMyNjE0Mzk0NTExMjY2Mjk2OTAxNTM4NDk1NzYxMTY3MjAiLCIxMjAwNjcyODE5NzQ3NzcxMzQxODc0NDY1OTY4MTA5NzE1MzMzOTYxMDAzMjkxMjMxMDA5NTk3MDE2OTI1ODE1ODY3Nzk3NTY1NjYwOSIsIjg4ODIyMTA0MjYxMTg0NTk1NjA3ODExNTk2NjIyMjQ1ODA5MDg0NzI5MDcxNzY2Mjc1MDEwNzM3ODMxNTMwMDUzNDEyMjQzMzAyNDUiLCI3NzcyNTIxMjIwNDc2OTQzNzk0NDEzNjQzMDkwODgxNzQ5NDY2Mjk2NzQ5ODExNzE0NTM4MzA2NTk1NjI0MzYxODM3NTY2MzcyMjI0IiwiMTY4MDUyNjg0MjUxODg5MzkwODU2NTk4MDc0ODU1NTYwNjcwNzcwMjU3NTkxMzQxMjYwMjQ5NzI5MjExNDA0Njk2MDA1MzQ1NTczNTEiLCIxNTU4MjY2NDYyMzY0MzY0MDc4Nzg1NzU1MjE2MDE4Nzk4MDUzMTU4MTA0ODk3ODc4NTAyNzYyNjQ2OTYzODkwNjA3NTkyNjkzMzciLCIxIiwiMzYzMDUxNDk2OSIsIjE5ODQ3MzI1MjMwOTg4MzU5NTkwNzMzNjg2Njg0NzUxNzczMDA5MjgyNTA3NTA3NTEyMTMzOTc3NTA3MjU2MjgxMDg4MTE4NTM2ODg0IiwiMSIsIjEwIiwiMCIsIjAiLCIwIl0
```
- After the post event is emitted, the database is triggered to store the following data:
    - reputation nullifiers and its corresponding action (`pubslitPost`, `leaveComment` or `vote`)
    - content of the post
    - transaction hash of this event
    - a negative reputation that sends to the author's epoch key as to spend this reputation.

#### 10. Verify reputation proof of certain transaction
```
npx ts-node cli/index.ts verifyReputationProof \
    -x 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853 \
    -pf Unirep.reputation.proof.WyIxMTIzMTY1NDY5Mjk2MjIxNDg3MTkwNTY3NDk2NzQwNjM0MzY0MDIyNTIzNzA3MzM5NDc2MzU1ODU1NzU4Njk0NjkxOTgyODk0MjE5NCIsIjk5ODcwODcxMzc1MjEwOTI0ODk5ODAxMTI2MzQ1ODk5ODMyMjgwNTM2MDA1MTY4NjcyNDMzMzIwMDE5NzMwODYyNDUyODQ3Nzg1MzciLCIxODE0NTQ0NTI0ODQxNDM5MDk4Njk1NzcwNjY1OTMxNTIwNDMzMDcxNTY0MTE5MDIxNzA2NzE5ODYwNjAwMzk1NDc2Mjc3MzU5NTc4MSIsIjE3MzEzODc5OTU3NzAwNTg4OTM1MDg1MjY1NDc1ODY2NjgxNDkzMzE2NTM4MDgzNTk0NzMwNDY5MTgzNTk1NTc2NDQ3MzYyNjA1MzU2IiwiMTY2NTIyNjc0MDQ0MjMzNjQ4Nzc1OTk5MTA2Mzc4NjM3NTk5MjY1Nzk4MTQ1MzA1Njk3MjM5NDQ2MDUzMjc2NTk0MDA0ODU2NDQwMzkiLCI5OTAxNTc0MTUxMzY3NDAzNjExMzcxMTQ0Mzg3NzEwNDU3NTIzOTg1Mjg1NDAyNTI2NTMyMDg5NTY5MzU1NTMwMDU4NDUzMzk2MzYiLCIxNjM3ODQ0OTA5NzU5NzM2OTU3NjUzMzMzMDkxMTIxOTExNzc3ODczNDI5MDg4MDgzOTc0NTczNzk4MzAwODc0NTc0MzAzMjIzNzc1NCIsIjEzODgzMjgxMDUxNzM1Njg2MDA5NTkwNzY1MzI1ODM0MDQ3OTcwNzY4MjUwNzcxMDMyNzQ2NDQ5NDExMjM3MjE3NjQzMTYzMjU4NiJd \
    -s Unirep.reputation.publicSignals.WyIxMjU2Mzc0NzEzODU1Nzg2OTA2NTEyNzU0OTMzMzcyMjY0NDE4NDMzOTI4MjE4OTgwNjcyOTU4Nzk4NjgwMzQ3ODY3MzQ5MTQyNjkzIiwiMzc3NDAzNzM5MTkzNzY2ODc4MzIyNTI1NjMyNzg0ODMxMDE3NzA5NDkxMDI2NTQwMTU5OTY1NTQ4NTk1NTM4ODIyNTIwNjk0MDQ3OSIsIjg4ODkzNzkxODY4ODg1MTMzMjE0OTY5MjQ5MjM2ODgyMTQ2ODc4OTMzMTI1NTU1OTk2OTE3OTE5ODc3MzE3NzI2NDUzOTk5NzI4MjgiLCIzMTQxMTQzNDU0NTc3MjgwODM0NDg3MTQ2MDg3MjcxNDYyODY3NzY1NzEwMzIzNzQ4Njc0NTI5ODk0MTA4NzczNTk0OTk2MTQ0Mzc4IiwiMTI0NTI2MjgzOTMyNTIyNzk5NjA3NjY4MzMwNDMyNDE2MzY1MjQ3MTE1MDMyNjE0Mzk0NTExMjY2Mjk2OTAxNTM4NDk1NzYxMTY3MjAiLCIxMjAwNjcyODE5NzQ3NzcxMzQxODc0NDY1OTY4MTA5NzE1MzMzOTYxMDAzMjkxMjMxMDA5NTk3MDE2OTI1ODE1ODY3Nzk3NTY1NjYwOSIsIjg4ODIyMTA0MjYxMTg0NTk1NjA3ODExNTk2NjIyMjQ1ODA5MDg0NzI5MDcxNzY2Mjc1MDEwNzM3ODMxNTMwMDUzNDEyMjQzMzAyNDUiLCI3NzcyNTIxMjIwNDc2OTQzNzk0NDEzNjQzMDkwODgxNzQ5NDY2Mjk2NzQ5ODExNzE0NTM4MzA2NTk1NjI0MzYxODM3NTY2MzcyMjI0IiwiMTY4MDUyNjg0MjUxODg5MzkwODU2NTk4MDc0ODU1NTYwNjcwNzcwMjU3NTkxMzQxMjYwMjQ5NzI5MjExNDA0Njk2MDA1MzQ1NTczNTEiLCIxNTU4MjY2NDYyMzY0MzY0MDc4Nzg1NzU1MjE2MDE4Nzk4MDUzMTU4MTA0ODk3ODc4NTAyNzYyNjQ2OTYzODkwNjA3NTkyNjkzMzciLCIxIiwiMzYzMDUxNDk2OSIsIjE5ODQ3MzI1MjMwOTg4MzU5NTkwNzMzNjg2Njg0NzUxNzczMDA5MjgyNTA3NTA3NTEyMTMzOTc3NTA3MjU2MjgxMDg4MTE4NTM2ODg0IiwiMSIsIjEwIiwiMCIsIjAiLCIwIl0
```
- The verification result will be printed, for example:
```
Verify reputation proof of epoch key 3630514969 with 10 reputation spent in transaction and minimum reputation 0 succeed
```
#### 11. Second user upvotes to epoch key
**11.1. Sign up the second user to perform upvote**
```
npx ts-node cli/index.ts genUnirepIdentity
npx ts-node cli/index.ts userSignup \
    -x 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853 \
    -c Unirep.identityCommitment.YTk0NjJjMWE5ZWY3NjM3MWVkOTFjNDA0YTYxYWJlMjVjMjJiMjVmMTM1MzU3NjFjNjE5OGE2YTA4MGUxMDBm \
    -d <deployerPrivateKey>
```
**11.2. Upvote the first user**
User can indicate to generate his user state from database using a `-db` flag. 
```
npx ts-node cli/index.ts vote \
    -x 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853 \
    -epk 3630514969 \
    -uv 3 \
    -id Unirep.identity.WyIxNzk1MTYyYWM2ZDVkZGQ4NWEyMzA0MDdkMjNiOTk3NDU0YmYwNzY2Zjg5ZThkNTQxNWE3ZTIyNTIyN2IxODRiIiwiZDgyNjA0ODY5Njk4NTU3MGMwYzNmNDlhM2RiZDg4MWJjOWJhYjc4Yzg2ZmM0N2UyOTMwNWVjMDEyMDNkZSIsImRkNmZiNDRkMTY3YjFmOTZiYzViZDUyYjdjNGRjOTNiYjhmNDA0Y2Q5YzBjMjA5ODU0ZWMyZWJlOGE0OTMyIl0 \
    -n 0 \
    -d <deployerPrivateKey> \
    -db
```
- NOTE: the second user's epoch key and base64url encoded reputation proof and its public signals will be printed and they should be handed to attester to be verified, for example:
```
Epoch key of epoch 1 and nonce 0: 3277067051
Unirep.reputation.proof.WyIxNjI0OTU4NjA5MjczNjIxNjgzMzkwMjgyMTAwNzgzMjA1ODAzNDgzMjA0ODU0NjI0ODI1NzAyNjMxNTkxMDUwODYzODIxMzgyMjQwNyIsIjc1MTE5NDI1NjkzODI2OTM3MTMxMTY1MzE3OTU1NTA3NjU4NDM1OTMzODM5NTg3MjA3OTU0MjkyODQ1NzI5MjgyMzcwMzI4MzExMzciLCIxNzY1MjI1NjY5NDAyNTg0NDg1NTkwNDc1MTk2Mjg1NzYwMTg2MzY3Mzk5Mjg1NjExMzg0MDI1MjM4OTY0OTE1MzEzNzE3NjE3NjEzNCIsIjk1OTUzOTUwNTc4ODM0NDMzMTkxNzQyNjQ3Mjc1MDMzNTQ2NDUxODI3ODk2MzY0MzY0MzI2NzI2NDU4MzA0MzAwOTY5NjEzNTUyMzgiLCIxMzIxNDkzMTI3MTYxNTQwODQzNzY0MDY1MzgzNDI3MzM3NTM4MjA2ODI0MzQ0MzU4OTMyMTE4MzI5MTIwMDA3OTIzOTQ0Njk2MDYzNCIsIjIwNzc0NzU5NzkxOTg2NjA0MTcwNjY2NDk3ODYxNjY0NzQ0NjI3ODMxMjg5OTAzMDYxMjAyMTU1MTAwNzM2MjkyOTk3NjgzNjIyMDc3IiwiNTkyNTA3NDI4NTQ1NzUwNTU2MTg5MDkxNDQ3Njk4NjgzNjQ5MzAyNzQxMDIyMjc0NDM4OTA2OTQ3MTk0MDg3NTI4MTExNDQzNDIzNyIsIjQxNDY0NjUzNjIwMjM3OTUyNTM2MzY5MzE0NTUyNzk2MzE5MTk2MjI4ODMxMTAxNTA0NzM3Nzc1MTQ1NzgyMDM3MTk3MTQzMjY1NTUiXQ
Unirep.reputation.publicSignals.WyIxMTQ3NjM5NzI3NTA0MzA0NTYwODk3MjQ3MTU2NjM1ODkzOTYwNzAyNjkxOTk1ODkyODUxODY2OTQ5NTE3NzA1MzIzNzg2NzkyMDU3IiwiMTQwMzYzNzYyNTI1NDU4NDMzNzk5NzY5MjUzMDQwOTgwOTE3ODI2NTYwMTQzNzQ3MzQ3ODkyNTkyODMwMDk4NDQ4OTIwNDcyMTM1MDEiLCI4ODEzNTk5OTcxNDkzNTA2MjcwNDE0MjY0MjY2MDkyNTU0MjQwNDA4MDI5OTExNjI2NjAzMDA3NjcwMzY3MzU3MjI4Njg4NjU0NTQ3IiwiMCIsIjAiLCIwIiwiMCIsIjAiLCIwIiwiMCIsIjEiLCIzMjc3MDY3MDUxIiwiMTk4NDczMjUyMzA5ODgzNTk1OTA3MzM2ODY2ODQ3NTE3NzMwMDkyODI1MDc1MDc1MTIxMzM5Nzc1MDcyNTYyODEwODgxMTg1MzY4ODQiLCIxIiwiMyIsIjAiLCIwIiwiMCJd
```
- NOTE: The proof can also be verified with `verifyReputationProof` function
- After the vote event is emitted, the database is triggered to store the following data:
    - reputation nullifiers and its corresponding action (`pubslitPost`, `leaveComment` or `vote`)
    - transaction hash of this event
    - a positive reputation that sends to the receiver's epoch key. (negative reputation if it is a downvote)
    - a negative reputation that sends to the author's epoch key as to spend this reputation.

#### 12. Epoch transition
```
npx ts-node cli/index.ts epochTransition \
    -x 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853 \
    -d <deployerPrivateKey> \
    -t
```

#### 13. User state transition
User can indicate to generate his user state from database using a `-db` flag. 
```
npx ts-node cli/index.ts userStateTransition \
    -x 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853 \
    -id Unirep.identity.WyJlOGQ2NGU5OThhM2VmNjAxZThjZTNkNDQwOWQyZjc3MjEwOGJkMGI1NTgwODAzYjY2MDk0YTllZWExMzYxZjA2IiwiODZiYjk5ZGQ4MzA2ZGVkZDgxYTE4MzBiNmVjYmRlZjk5ZmVjYTU3M2RiNjIxMjk5NGMyMmJlMWEwMWZmMTEiLCIzMGE3M2MxMjE4ODQwNjE0MWQwYmI4NWRjZDY5ZjdhMjEzMWM1NWRkNDQzYWNmMGVhZTEwNjI2NzBjNDhmYSJd \
    -d <deployerPrivateKey> \
    -db
```
- After the user state transition event is emitted, the database is triggered to store the following data:
    - A new global state tree leaf that is generated by circuit
    - current epoch of this event
    - transaction hash of this event

#### 14. User generate reputation proof from certain attester (Fixing)
User can indicate to generate his user state from database using a `-db` flag.
```
npx ts-node cli/index.ts genReputationProofFromAttester \
    -x 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853 \
    -id Unirep.identity.WyJlOGQ2NGU5OThhM2VmNjAxZThjZTNkNDQwOWQyZjc3MjEwOGJkMGI1NTgwODAzYjY2MDk0YTllZWExMzYxZjA2IiwiODZiYjk5ZGQ4MzA2ZGVkZDgxYTE4MzBiNmVjYmRlZjk5ZmVjYTU3M2RiNjIxMjk5NGMyMmJlMWEwMWZmMTEiLCIzMGE3M2MxMjE4ODQwNjE0MWQwYmI4NWRjZDY5ZjdhMjEzMWM1NWRkNDQzYWNmMGVhZTEwNjI2NzBjNDhmYSJd \
    -a 2 \
    -mp 2 \
    -mn 1 \
    -gp 0 \
    -db
```
- NOTE: proof will be printed and it should be handed to the receiver of this proof, for example,
```
Proof of reputation from attester 2:
Unirep.reputationProofFromAttester.WyI3NDU0MzE2NzU3MDY1MDU3NzYwMjkxMDM4ODY2MDI3MzgzOTU1OTY3MzcxNzk5Mzg4Njc0NDc1ODY3NDE5MTQ2Njk5OTUzMjQxNjYiLCI5OTEzMzU1Nzk3NTAwOTMzMzI2MjE5ODUwOTI1NjU2MTQwOTEwNjc3ODUxODc4NTA5MDE1NDI4NzUzNDc1ODAwNTg2MjczNDMyNTg3IiwiMTQ1OTU2MDMyOTIyODU0NDYwNzM1NTEzMjI2NzAyMTc4NDIzOTU4Njg3Mzc0MDQ1NTg0MTY0Nzg3Mzg4ODMwMTU5MDA5NjA4ODIzOSIsIjczNTExMjAwMDYxOTYxNTI4NjQyMTI4NjYxNzEzMDMzMzQ4MDcxMjQzMzM4MjcxNDUyNTI1MjQzNjk4MzgxMTYxMTY1ODc3NTM4NjYiLCIxMTI0NTM1ODEwODY0MzE1MjY4MTI5NjA5MzUyNDY2MzQ3MTQ1MzAwMzAwMzIxOTk3NjQ3NzQ1MzMxNjk4NDc2NjUzMTUyMTM0MDMzMiIsIjU1NDA1NDA4OTc3NjMwMjIxODcwMDM4NTIyMzQ4ODMxMTEyMzY4MzAwNTA1MDU3OTc1NTA1OTcxOTQzODUzOTk2NjQ1MTU1OTY2MzEiLCIxMTk0MjUwMzcxNzI4NjE0MTMzNDk1NjMzNzg0MTEzNzAwNDQwNTkwNzY3ODI4NTQ0Nzc5MjgxNjcxODMxOTU3NzA1MjUyMDUyNzUiLCIzNjk1MTI2NzM5ODk2MTQwNzY2ODgwMjUxNTA2MTkxNTYwNDU5OTU4Njg0MTExODY1Nzg2MzAxODc3MDEwODM2NzQ2NjA4NTYyNTU1Il0
```

#### 15. Verify the reputation proof (Fixing)
```
npx ts-node cli/index.ts verifyReputationProofFromAttester \
    -x 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853 \
    -a 2 \
    -mp 2 \
    -mn 1 \
    -gp 0 \
    -pf Unirep.reputationProofFromAttester.WyI3NDU0MzE2NzU3MDY1MDU3NzYwMjkxMDM4ODY2MDI3MzgzOTU1OTY3MzcxNzk5Mzg4Njc0NDc1ODY3NDE5MTQ2Njk5OTUzMjQxNjYiLCI5OTEzMzU1Nzk3NTAwOTMzMzI2MjE5ODUwOTI1NjU2MTQwOTEwNjc3ODUxODc4NTA5MDE1NDI4NzUzNDc1ODAwNTg2MjczNDMyNTg3IiwiMTQ1OTU2MDMyOTIyODU0NDYwNzM1NTEzMjI2NzAyMTc4NDIzOTU4Njg3Mzc0MDQ1NTg0MTY0Nzg3Mzg4ODMwMTU5MDA5NjA4ODIzOSIsIjczNTExMjAwMDYxOTYxNTI4NjQyMTI4NjYxNzEzMDMzMzQ4MDcxMjQzMzM4MjcxNDUyNTI1MjQzNjk4MzgxMTYxMTY1ODc3NTM4NjYiLCIxMTI0NTM1ODEwODY0MzE1MjY4MTI5NjA5MzUyNDY2MzQ3MTQ1MzAwMzAwMzIxOTk3NjQ3NzQ1MzMxNjk4NDc2NjUzMTUyMTM0MDMzMiIsIjU1NDA1NDA4OTc3NjMwMjIxODcwMDM4NTIyMzQ4ODMxMTEyMzY4MzAwNTA1MDU3OTc1NTA1OTcxOTQzODUzOTk2NjQ1MTU1OTY2MzEiLCIxMTk0MjUwMzcxNzI4NjE0MTMzNDk1NjMzNzg0MTEzNzAwNDQwNTkwNzY3ODI4NTQ0Nzc5MjgxNjcxODMxOTU3NzA1MjUyMDUyNzUiLCIzNjk1MTI2NzM5ODk2MTQwNzY2ODgwMjUxNTA2MTkxNTYwNDU5OTU4Njg0MTExODY1Nzg2MzAxODc3MDEwODM2NzQ2NjA4NTYyNTU1Il0
```