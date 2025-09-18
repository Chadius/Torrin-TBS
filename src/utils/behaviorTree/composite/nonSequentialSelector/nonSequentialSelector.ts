import { BehaviorTreeTask } from "../../task"
import { DataBlob } from "../../../dataBlob/dataBlob"

export class NonSequentialSelectorComposite implements BehaviorTreeTask {
    dataBlob: DataBlob
    children?: BehaviorTreeTask[]

    constructor(blackboard: DataBlob, children: BehaviorTreeTask[]) {
        this.dataBlob = blackboard
        this.children = children
    }

    run(): boolean {
        if (this.children == undefined) {
            return false
        }

        const randomIndexOrder: number[] = Array.from(
            new Array(this.children.length),
            (x, i) => i
        ).sort(() => Math.random() - 0.5)
        return randomIndexOrder.some((i) => {
            if (this.children == undefined) return false
            return this.children[i].run()
        })
    }
}
