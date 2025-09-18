import { BehaviorTreeTask, JSONParameter } from "../../task"
import { DataBlob } from "../../../dataBlob/dataBlob"

export class LimitDecorator implements BehaviorTreeTask {
    dataBlob: DataBlob
    children?: BehaviorTreeTask[]

    limit: number
    numberOfTimesRun: number

    constructor(
        blackboard: DataBlob,
        child: BehaviorTreeTask,
        extraArguments: { [key: string]: JSONParameter }
    ) {
        this.dataBlob = blackboard
        if (!child) {
            throw new Error(
                "[LimitDecorator.constructor] must have a child task"
            )
        }
        this.children = [child]
        let coercedNumber = Number(extraArguments["limit"])
        if (
            Number.isNaN(coercedNumber) ||
            coercedNumber === undefined ||
            coercedNumber < 0
        ) {
            coercedNumber = 1
        }
        this.limit = coercedNumber
        this.numberOfTimesRun = 0
    }

    run(): boolean {
        if (this.numberOfTimesRun >= this.limit) return false
        this.numberOfTimesRun += 1
        if (this.children == undefined || this.children.length == 0)
            return false
        return this.children[0].run()
    }
}
