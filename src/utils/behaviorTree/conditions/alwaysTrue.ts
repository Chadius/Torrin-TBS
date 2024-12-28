import { BehaviorTreeTask } from "../task"
import { Blackboard } from "../../blackboard/blackboard"

export class AlwaysTrueCondition implements BehaviorTreeTask {
    blackboard: Blackboard

    constructor(blackboard: Blackboard) {
        this.blackboard = blackboard
    }

    run(): boolean {
        return true
    }

    clone(): BehaviorTreeTask {
        return new AlwaysTrueCondition(this.blackboard)
    }
}
