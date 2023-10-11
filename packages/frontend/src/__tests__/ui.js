import { UI } from '../context/UI'

let ui

describe('UI', function () {
    beforeEach(() => {
        ui = new UI()
    })

    test('load() calls local storage get item twice', () => {
        const windowGetItemSpy = jest.spyOn(localStorage, 'getItem')

        ui.load()
        expect(windowGetItemSpy).toHaveBeenCalledTimes(2)
    })

    test('setHasbanner() calls set item once with truthy/falsy input', () => {
        const windowSetItemSpy = jest.spyOn(localStorage, 'setItem')

        ui.setHasBanner(true)
        expect(windowSetItemSpy).toHaveBeenCalledTimes(1)

        // now falsy input
        ui.setHasBanner(false)
        jest.clearAllMocks()
        expect(windowSetItemSpy).toHaveBeenCalledTimes(0)
    })

    test('setDownloadPrivateKey() calls set item with truthy/falsy input', () => {
        const windowSetItemSpy = jest.spyOn(localStorage, 'setItem')

        ui.setDownloadPrivateKey(true)
        expect(windowSetItemSpy).toHaveBeenCalledTimes(1)
        // now falsy input
        ui.setDownloadPrivateKey(false)
        jest.clearAllMocks()
        expect(windowSetItemSpy).toHaveBeenCalledTimes(0)
    })

    test('uiLogout() calls removeItem', () => {
        const windowRemoveItemSpy = jest.spyOn(localStorage, 'removeItem')

        ui.uiLogout()
        expect(windowRemoveItemSpy).toHaveBeenCalledTimes(2)
    })
})
