import { Blackboard } from "../blackboard/blackboard"

export type JSONParameter = number | string | boolean | void

export interface BehaviorTreeTask {
    blackboard: Blackboard
    children?: BehaviorTreeTask[]
    run: () => boolean
    clone: () => BehaviorTreeTask
    addAdditionalParameters?: (parameters: {
        [key: string]: JSONParameter
    }) => void
}
