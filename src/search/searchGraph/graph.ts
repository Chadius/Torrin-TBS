import { SearchNodeRecord } from "../nodeRecord/nodeRecord"

export interface SearchConnection<T> {
    cost: number
    fromNode: T
    toNode: T
}

export interface SearchGraph<T> {
    getConnections: (fromNode: SearchNodeRecord<T>) => SearchConnection<T>[]
    getAllNodes: () => {
        data: T
        key: string
    }[]
    getKeyForNode: (node: T) => string
}
