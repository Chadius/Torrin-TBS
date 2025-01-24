import { BehaviorTreeTask } from "../task"
import { DataBlob, DataBlobService } from "../../dataBlob/dataBlob"

export class IncrementBlackboard implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(blackboard: DataBlob) {
        this.dataBlob = blackboard
    }

    clone(): BehaviorTreeTask {
        return undefined
    }

    run(): boolean {
        let currentValue: number =
            DataBlobService.get<number>(this.dataBlob, "increment") ?? 0
        currentValue += 1
        DataBlobService.add<number>(this.dataBlob, "increment", currentValue)
        return true
    }
}
