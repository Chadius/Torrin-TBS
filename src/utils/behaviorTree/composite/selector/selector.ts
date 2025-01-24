import { BehaviorTreeTask } from "../../task"
import { DataBlob } from "../../../dataBlob/dataBlob"

export class SelectorComposite implements BehaviorTreeTask {
    dataBlob: DataBlob
    children?: BehaviorTreeTask[]

    constructor(blackboard: DataBlob, children: BehaviorTreeTask[]) {
        this.dataBlob = blackboard
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
        return new SelectorComposite(this.dataBlob, clonedChildren)
    }
}
