import { BehaviorTreeTask } from "../task"
import { Blackboard, BlackboardService } from "../../blackboard/blackboard"

export class IncrementBlackboard implements BehaviorTreeTask {
    blackboard: Blackboard

    constructor(blackboard: Blackboard) {
        this.blackboard = blackboard
    }

    clone(): BehaviorTreeTask {
        return undefined
    }

    run(): boolean {
        let currentValue: number =
            BlackboardService.get<number>(this.blackboard, "increment") ?? 0
        currentValue += 1
        BlackboardService.add<number>(
            this.blackboard,
            "increment",
            currentValue
        )
        return true
    }
}
