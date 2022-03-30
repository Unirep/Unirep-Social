'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.MAX_REPUTATION_BUDGET =
    exports.defaultCommentReputation =
    exports.defaultPostReputation =
    exports.defaultAirdroppedReputation =
        void 0
const config_1 = require('@unirep/config')
Object.defineProperty(exports, 'MAX_REPUTATION_BUDGET', {
    enumerable: true,
    get: function () {
        return config_1.MAX_REPUTATION_BUDGET
    },
})
const defaultAirdroppedReputation = 30
exports.defaultAirdroppedReputation = defaultAirdroppedReputation
const defaultPostReputation = 5
exports.defaultPostReputation = defaultPostReputation
const defaultCommentReputation = 3
exports.defaultCommentReputation = defaultCommentReputation
