// This code resolves Jest errors when testing components that have SVG images.
// Specified in the Jest config file under "transform" options.
module.exports = {
    process() {
        return {
            code: 'module.exports = {};',
        }
    },
    getCacheKey() {
        return 'svgTransform'
    },
}
