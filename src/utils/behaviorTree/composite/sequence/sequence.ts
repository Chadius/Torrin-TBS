import { BehaviorTreeTask } from "../../task"
import { DataBlob } from "../../../dataBlob/dataBlob"

export class SequenceComposite implements BehaviorTreeTask {
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
        return this.children.every((child: BehaviorTreeTask) => child.run())
    }
}
