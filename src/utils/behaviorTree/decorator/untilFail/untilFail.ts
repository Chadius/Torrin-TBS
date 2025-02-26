import { BehaviorTreeTask } from "../../task"
import { DataBlob } from "../../../dataBlob/dataBlob"

export class UntilFailDecorator implements BehaviorTreeTask {
    dataBlob: DataBlob
    children?: BehaviorTreeTask[]

    constructor(blackboard: DataBlob, child: BehaviorTreeTask) {
        this.dataBlob = blackboard
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
}
