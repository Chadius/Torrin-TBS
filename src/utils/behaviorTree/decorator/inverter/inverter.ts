import { BehaviorTreeTask } from "../../task"
import { Blackboard } from "../../../blackboard/blackboard"

export class InverterDecorator implements BehaviorTreeTask {
    blackboard: Blackboard
    children?: BehaviorTreeTask[]

    constructor(blackboard: Blackboard, child: BehaviorTreeTask) {
        this.blackboard = blackboard
        if (!child) {
            throw new Error(
                "[InverterDecorator.constructor] must have a child task"
            )
        }
        this.children = [child]
    }

    run(): boolean {
        return !this.children[0].run()
    }

    clone(): BehaviorTreeTask {
        return new InverterDecorator(this.blackboard, this.children[0].clone())
    }
}
