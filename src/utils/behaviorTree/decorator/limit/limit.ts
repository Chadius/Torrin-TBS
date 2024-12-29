import { BehaviorTreeTask, JSONParameter } from "../../task"
import { Blackboard } from "../../../blackboard/blackboard"

export class LimitDecorator implements BehaviorTreeTask {
    blackboard: Blackboard
    children?: BehaviorTreeTask[]

    limit: number
    numberOfTimesRun: number

    constructor(
        blackboard: Blackboard,
        child: BehaviorTreeTask,
        extraArguments: { [key: string]: JSONParameter }
    ) {
        this.blackboard = blackboard
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
        return this.children[0].run()
    }

    clone(): BehaviorTreeTask {
        return new LimitDecorator(this.blackboard, this.children[0].clone(), {
            limit: this.limit,
        })
    }
}
