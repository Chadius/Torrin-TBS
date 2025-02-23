import { BehaviorTreeTask } from "../../../utils/behaviorTree/task"
import { RectArea } from "../../rectArea"

export interface ButtonStyle extends BehaviorTreeTask {
    getArea: () => RectArea
}
