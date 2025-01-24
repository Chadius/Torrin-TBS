export interface DataBlob {
    data: {
        [key: string]: any
    }
}

export const DataBlobService = {
    new: (): DataBlob => ({ data: {} }),
    add: <T>(blackboard: DataBlob, key: string, value: T): void => {
        blackboard.data[key] = value
    },
    get: <T>(blackboard: DataBlob, key: string): T => {
        return blackboard.data[key]
    },
}
