import { useState, useEffect } from 'react'

// use lazy initial state //
const useLocalStorage = (key: any, initialValue: any) => {
    const [value, setValue] = useState<any | null>(() => {
        try {
            const localValue = window.localStorage.getItem(key)
            return localValue ? JSON.parse(localValue) : initialValue
        } catch (e) {
            console.log(e)
            return initialValue
        }
    })

    useEffect(() => {
        window.localStorage.setItem(key, JSON.stringify(value))
    }, [key, value])

    return [value, setValue]
}

export default useLocalStorage
