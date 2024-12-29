import { BehaviorTreeTask } from "../../task"
import { Blackboard } from "../../../blackboard/blackboard"

export class NonSequentialSelectorComposite implements BehaviorTreeTask {
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

        const randomIndexOrder: number[] = Array.from(
            new Array(this.children.length),
            (x, i) => i
        ).sort(() => Math.random() - 0.5)
        return randomIndexOrder.some((i) => this.children[i].run())
    }

    clone(): BehaviorTreeTask {
        const clonedChildren = this.children.map((child) => child.clone())
        return new NonSequentialSelectorComposite(
            this.blackboard,
            clonedChildren
        )
    }
}
