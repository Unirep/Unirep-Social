'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.maxReputationBudget =
    exports.defaultCommentReputation =
    exports.defaultPostReputation =
    exports.defaultAirdroppedReputation =
        void 0
const unirep_1 = require('@unirep/unirep')
Object.defineProperty(exports, 'maxReputationBudget', {
    enumerable: true,
    get: function () {
        return unirep_1.maxReputationBudget
    },
})
const defaultAirdroppedReputation = 30
exports.defaultAirdroppedReputation = defaultAirdroppedReputation
const defaultPostReputation = 5
exports.defaultPostReputation = defaultPostReputation
const defaultCommentReputation = 3
exports.defaultCommentReputation = defaultCommentReputation
