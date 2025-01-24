import { DataBlob } from "../dataBlob/dataBlob"

export type JSONParameter = number | string | boolean | void

export interface BehaviorTreeTask {
    dataBlob: DataBlob
    children?: BehaviorTreeTask[]
    run: () => boolean
    clone: () => BehaviorTreeTask
    addAdditionalParameters?: (parameters: {
        [key: string]: JSONParameter
    }) => void
}
