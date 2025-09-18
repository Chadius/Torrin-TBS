import { SearchConnection } from "../searchGraph/graph"
import { EnumLike } from "../../utils/enum"

export interface NodeRecordStorage<T> {
    getNodeRecordByNode: (node: T) => SearchNodeRecord<T>
    getNodeRecordByKey: (key: string) => SearchNodeRecord<T>
    addNodeRecord: (nodeRecord: SearchNodeRecord<T>) => void
}

export const SearchNodeRecordStatus = {
    CLOSED: "CLOSED",
    OPEN: "OPEN",
    UNVISITED: "UNVISITED",
} as const satisfies Record<string, string>
export type TSearchNodeRecordStatus = EnumLike<typeof SearchNodeRecordStatus>

export interface SearchNodeRecord<T> {
    node: T
    connection: SearchConnection<T> | undefined
    lengthSoFar: number | undefined
    costSoFar: number | undefined
    estimatedTotalCost: number
    status: TSearchNodeRecordStatus
}
