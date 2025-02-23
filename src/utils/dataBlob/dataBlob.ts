export interface DataBlob {
    data: {
        [key: string]: any
    }
}

export const DataBlobService = {
    new: (): DataBlob => ({ data: {} }),
    add: <T>(dataBlob: DataBlob, key: string, value: T): void =>
        add<T>(dataBlob, key, value),
    get: <T>(dataBlob: DataBlob, key: string): T => get<T>(dataBlob, key),
    getOrCreateDefault: <T>(
        dataBlob: DataBlob,
        key: string,
        defaultValue: T
    ) => {
        const originalValue = get<T>(dataBlob, key)
        if (originalValue != undefined) return originalValue
        add<T>(dataBlob, key, defaultValue)
        return get<T>(dataBlob, key)
    },
}

const get = <T>(dataBlob: DataBlob, key: string): T => {
    return dataBlob.data[key]
}

const add = <T>(dataBlob: DataBlob, key: string, value: T): void => {
    dataBlob.data[key] = value
}
