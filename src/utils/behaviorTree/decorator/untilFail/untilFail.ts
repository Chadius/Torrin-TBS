import { BehaviorTreeTask } from "../../task"
import { Blackboard } from "../../../blackboard/blackboard"

export class UntilFailDecorator implements BehaviorTreeTask {
    blackboard: Blackboard
    children?: BehaviorTreeTask[]

    constructor(blackboard: Blackboard, child: BehaviorTreeTask) {
        this.blackboard = blackboard
        if (!child) {
            throw new Error(
                "[UntilFailDecorator.constructor] must have a child task"
            )
        }
        this.children = [child]
    }

    run(): boolean {
        let childReturnedTrue = this.children[0].run()
        while (childReturnedTrue) {
            childReturnedTrue = this.children[0].run()
        }
        return true
    }

    clone(): BehaviorTreeTask {
        return new UntilFailDecorator(this.blackboard, this.children[0].clone())
    }
}
