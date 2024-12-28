import { BehaviorTreeTask } from "../../task"
import { Blackboard } from "../../../blackboard/blackboard"

export class SelectorComposite implements BehaviorTreeTask {
    blackboard: Blackboard
    children: BehaviorTreeTask[]

    constructor(blackboard: Blackboard, children: BehaviorTreeTask[]) {
        this.blackboard = blackboard
        this.children = children
    }

    run(): boolean {
        if (!this.children) {
            return false
        }
        return this.children.some((child: BehaviorTreeTask) => child.run())
    }

    clone(): BehaviorTreeTask {
        const clonedChildren = this.children.map((child) => child.clone())
        return new SelectorComposite(this.blackboard, clonedChildren)
    }
}
