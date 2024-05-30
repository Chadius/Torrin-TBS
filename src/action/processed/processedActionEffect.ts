import { ProcessedActionSquaddieEffect } from "./processedActionSquaddieEffect"
import { ProcessedActionMovementEffect } from "./processedActionMovementEffect"
import { ProcessedActionEndTurnEffect } from "./processedActionEndTurnEffect"

export type ProcessedActionEffect =
    | ProcessedActionSquaddieEffect
    | ProcessedActionMovementEffect
    | ProcessedActionEndTurnEffect
