import { BehaviorTreeTask } from "../task"
import { DataBlob } from "../../dataBlob/dataBlob"

export class AlwaysTrueCondition implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(blackboard: DataBlob) {
        this.dataBlob = blackboard
    }

    run(): boolean {
        return true
    }

    clone(): BehaviorTreeTask {
        return new AlwaysTrueCondition(this.dataBlob)
    }
}
