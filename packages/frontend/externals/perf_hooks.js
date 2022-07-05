module.exports = perf_hooks

function perf_hooks() {
    console.log('call perf_hooks')
    return { performance: Performance }
}
