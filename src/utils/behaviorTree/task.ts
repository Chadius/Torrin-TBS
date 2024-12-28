import { Blackboard } from "../blackboard/blackboard"

export interface BehaviorTreeTask {
    blackboard: Blackboard
    children: BehaviorTreeTask[]
    run: () => boolean
    clone: () => BehaviorTreeTask
}
