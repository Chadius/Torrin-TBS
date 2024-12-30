import { BehaviorTreeTask } from "../../task"
import { Blackboard } from "../../../blackboard/blackboard"

export class ExecuteAllComposite implements BehaviorTreeTask {
    blackboard: Blackboard
    children?: BehaviorTreeTask[]

    constructor(blackboard: Blackboard, children: BehaviorTreeTask[]) {
        this.blackboard = blackboard
        this.children = children
    }

    run(): boolean {
        if (!this.children) {
            return false
        }
        this.children.forEach((child: BehaviorTreeTask) => child.run())
        return true
    }

    clone(): BehaviorTreeTask {
        const clonedChildren = this.children.map((child) => child.clone())
        return new ExecuteAllComposite(this.blackboard, clonedChildren)
    }
}
