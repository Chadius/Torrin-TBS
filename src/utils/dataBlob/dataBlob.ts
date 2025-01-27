export interface DataBlob {
    data: {
        [key: string]: any
    }
}

export const DataBlobService = {
    new: (): DataBlob => ({ data: {} }),
    add: <T>(dataBlob: DataBlob, key: string, value: T): void => {
        dataBlob.data[key] = value
    },
    get: <T>(dataBlob: DataBlob, key: string): T => {
        return dataBlob.data[key]
    },
}
