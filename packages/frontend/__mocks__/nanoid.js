module.exports = {
    nanoid: () =>
        Array(100)
            .fill()
            .map(() => Math.random())
            .join(''),
}
