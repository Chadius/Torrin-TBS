import { BehaviorTreeTask } from "../../task"
import { DataBlob } from "../../../dataBlob/dataBlob"

export class InverterDecorator implements BehaviorTreeTask {
    dataBlob: DataBlob
    children?: BehaviorTreeTask[]

    constructor(dataBlob: DataBlob, child: BehaviorTreeTask) {
        this.dataBlob = dataBlob
        if (!child) {
            throw new Error(
                "[InverterDecorator.constructor] must have a child task"
            )
        }
        this.children = [child]
    }

    run(): boolean {
        if (this.children == undefined || this.children.length == 0) {
            throw new Error("[InverterDecorator.run] must have a child task")
        }
        return !this.children[0].run()
    }
}
