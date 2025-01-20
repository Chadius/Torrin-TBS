import { DegreeOfSuccess } from "../../../../../calculator/actionCalculator/degreeOfSuccess"
import { TextBox } from "../../../../../../ui/textBox/textBox"
import { ActionEffectChange } from "../../../../../history/calculatedResult"
import { ActionTemplate } from "../../../../../../action/template/actionTemplate"
import {
    BattleActionSquaddieChange,
    BattleActionSquaddieChangeService,
} from "../../../../../history/battleAction/battleActionSquaddieChange"
import { ActionEffectTemplateService } from "../../../../../../action/template/actionEffectTemplate"
import {
    ActionPreviewTileLayout,
    ShowDegreeOfSuccessEvenIfNoEffect,
} from "../actionPreviewTile"
import {
    Blackboard,
    BlackboardService,
} from "../../../../../../utils/blackboard/blackboard"
import { RectArea, RectAreaService } from "../../../../../../ui/rectArea"
import { WINDOW_SPACING } from "../../../../../../ui/constants"

export const ActionPreviewTileDegreesOfSuccessService = {
    findNextDegreeOfSuccessToDraw: (
        potentialDegreesOfSuccessToDraw: ActionPreviewTileLayout["degreesOfSuccess"]["rowOrder"],
        alreadyDrawnTextBoxes: {
            degreeOfSuccess: DegreeOfSuccess
            textBox: TextBox
        }[],
        targetForecast: ActionEffectChange,
        actionTemplate: ActionTemplate
    ) =>
        findNextDegreeOfSuccessToDraw(
            potentialDegreesOfSuccessToDraw,
            alreadyDrawnTextBoxes,
            targetForecast,
            actionTemplate
        ),
    calculateTopOfNextDegreesOfSuccessRow: ({
        blackboard,
        degreeOfSuccessUIObjects,
        boundingBox,
    }: {
        blackboard: Blackboard
        degreeOfSuccessUIObjects: {
            degreeOfSuccess: DegreeOfSuccess
            textBox: TextBox
        }[]
        boundingBox: RectArea
    }) =>
        calculateTopOfNextDegreesOfSuccessRow({
            blackboard,
            degreeOfSuccessUIObjects,
            boundingBox,
        }),
}

const findNextDegreeOfSuccessToDraw = (
    potentialDegreesOfSuccessToDraw: ActionPreviewTileLayout["degreesOfSuccess"]["rowOrder"],
    alreadyDrawnTextBoxes: {
        degreeOfSuccess: DegreeOfSuccess
        textBox: TextBox
    }[],
    targetForecast: ActionEffectChange,
    actionTemplate: ActionTemplate
) => {
    let forecastedChange: BattleActionSquaddieChange = undefined
    const hasCriticalFailure: boolean = targetForecast.squaddieChanges.some(
        (change) =>
            change.actorDegreeOfSuccess === DegreeOfSuccess.CRITICAL_FAILURE &&
            change.chanceOfDegreeOfSuccess > 0
    )

    const degreeOfSuccessToDraw = potentialDegreesOfSuccessToDraw.find(
        (degreeOfSuccessInfo) => {
            forecastedChange = targetForecast.squaddieChanges.find(
                (change) =>
                    change.actorDegreeOfSuccess ===
                    degreeOfSuccessInfo.degreeOfSuccess
            )

            if (!forecastedChange) {
                return false
            }

            if (
                alreadyDrawnTextBoxes.some(
                    (info) =>
                        info.degreeOfSuccess ===
                        degreeOfSuccessInfo.degreeOfSuccess
                )
            )
                return false

            const targetHasOnlyOneDegreeOfSuccess: boolean =
                targetForecast.squaddieChanges.filter(
                    (change) =>
                        change.battleSquaddieId ===
                        forecastedChange.battleSquaddieId
                ).length === 1

            switch (true) {
                case targetHasOnlyOneDegreeOfSuccess ||
                    degreeOfSuccessInfo.showEvenIfNoEffect ===
                        ShowDegreeOfSuccessEvenIfNoEffect.YES:
                    return true
                case ActionEffectTemplateService.doesItTargetFoes(
                    actionTemplate.actionEffectTemplates[0]
                ) &&
                    !hasCriticalFailure &&
                    degreeOfSuccessInfo.degreeOfSuccess ===
                        DegreeOfSuccess.FAILURE:
                    return true
                case ActionEffectTemplateService.doesItTargetFoes(
                    actionTemplate.actionEffectTemplates[0]
                ) &&
                    !BattleActionSquaddieChangeService.isSquaddieHindered(
                        forecastedChange
                    ):
                    return false
                case (ActionEffectTemplateService.doesItTargetFriends(
                    actionTemplate.actionEffectTemplates[0]
                ) ||
                    ActionEffectTemplateService.doesItTargetSelf(
                        actionTemplate.actionEffectTemplates[0]
                    )) &&
                    !BattleActionSquaddieChangeService.isSquaddieHelped(
                        forecastedChange
                    ):
                    return false
            }
            return true
        }
    )

    return {
        forecastedChange,
        degreeOfSuccessToDraw,
    }
}

const calculateTopOfNextDegreesOfSuccessRow = ({
    blackboard,
    degreeOfSuccessUIObjects,
    boundingBox,
}: {
    blackboard: Blackboard
    degreeOfSuccessUIObjects: {
        degreeOfSuccess: DegreeOfSuccess
        textBox: TextBox
    }[]
    boundingBox: RectArea
}) =>
    degreeOfSuccessUIObjects.length > 0
        ? RectAreaService.bottom(
              degreeOfSuccessUIObjects[degreeOfSuccessUIObjects.length - 1]
                  .textBox.area
          ) +
          WINDOW_SPACING.SPACING1 / 2
        : BlackboardService.get<ActionPreviewTileLayout>(blackboard, "layout")
              .topRowOffset + RectAreaService.top(boundingBox)
