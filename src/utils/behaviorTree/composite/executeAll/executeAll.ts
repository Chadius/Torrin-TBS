import { BehaviorTreeTask } from "../../task"
import { DataBlob } from "../../../dataBlob/dataBlob"

export class ExecuteAllComposite implements BehaviorTreeTask {
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
        this.children.forEach((child: BehaviorTreeTask) => child.run())
        return true
    }
}
