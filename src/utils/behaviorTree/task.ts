import { Blackboard } from "../blackboard/blackboard"

export interface BehaviorTreeTask {
    blackboard: Blackboard
    run: () => boolean
    clone: () => BehaviorTreeTask
}
