import { BehaviorTreeTask } from "../task"
import { DataBlob } from "../../dataBlob/dataBlob"

export class AlwaysFalseCondition implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(blackboard: DataBlob) {
        this.dataBlob = blackboard
    }

    run(): boolean {
        return false
    }
}
