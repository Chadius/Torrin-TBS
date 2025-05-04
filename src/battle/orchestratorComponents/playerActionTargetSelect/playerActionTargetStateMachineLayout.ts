import { PlayerActionTargetLayout } from "./playerActionTarget/playerActionTargetLayout"
import { PlayerActionConfirmLayout } from "./playerActionConfirm/playerActionConfirmLayout"

export interface PlayerActionTargetStateMachineLayout {
    confirm: PlayerActionConfirmLayout
    selectTarget: PlayerActionTargetLayout
}
