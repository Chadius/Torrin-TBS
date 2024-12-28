import { BehaviorTreeTask } from "../task"
import { Blackboard } from "../../blackboard/blackboard"

export class AlwaysFalseCondition implements BehaviorTreeTask {
    blackboard: Blackboard

    constructor(blackboard: Blackboard) {
        this.blackboard = blackboard
    }

    run(): boolean {
        return false
    }

    clone(): BehaviorTreeTask {
        return new AlwaysFalseCondition(this.blackboard)
    }
}
