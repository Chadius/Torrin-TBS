import { GraphicsBuffer } from "../../../../utils/graphics/graphicsRenderer"
import { GameEngineState } from "../../../../gameEngine/gameEngine"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../objectRepository"
import {
    ActionTilePosition,
    ActionTilePositionService,
} from "./actionTilePosition"
import { SquaddieAffiliation } from "../../../../squaddie/squaddieAffiliation"
import { TextBox, TextBoxService } from "../../../../ui/textBox"
import { getResultOrThrowError } from "../../../../utils/ResultOrError"
import { BattleActionDecisionStepService } from "../../../actionDecision/battleActionDecisionStep"
import { RollModifierType } from "../../../calculator/actionCalculator/rollResult"
import { CalculatorAttack } from "../../../calculator/actionCalculator/attack"
import { RectAreaService } from "../../../../ui/rectArea"
import { WINDOW_SPACING } from "../../../../ui/constants"
import { SquaddieTemplate } from "../../../../campaign/squaddieTemplate"
import { ActionCalculator } from "../../../calculator/actionCalculator/calculator"
import { CalculatedResult } from "../../../history/calculatedResult"
import { DegreeOfSuccess } from "../../../calculator/actionCalculator/degreeOfSuccess"

export interface ActionPreviewTile {
    horizontalPosition: ActionTilePosition
    squaddieAffiliation: SquaddieAffiliation
    infoTextBox?: TextBox
    forecast: CalculatedResult
}

const layoutConstants = {
    info: {
        fontSize: 16,
        fontColor: [0, 0, 192 - 128],
    },
}

export const ActionPreviewTileService = {
    new: ({
        gameEngineState,
        objectRepository,
    }: {
        gameEngineState: GameEngineState
        objectRepository: ObjectRepository
    }): ActionPreviewTile => {
        const battleSquaddieId = BattleActionDecisionStepService.getActor(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        ).battleSquaddieId

        const { squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                battleSquaddieId
            )
        )

        const forecast = ActionCalculator.forecastResults({
            gameEngineState,
        })

        const infoTextBox = createInfoTextBox({
            squaddieTemplate: squaddieTemplate,
            gameEngineState: gameEngineState,
            forecast: forecast,
        })

        return {
            horizontalPosition: ActionTilePosition.ACTION_PREVIEW,
            squaddieAffiliation: squaddieTemplate.squaddieId.affiliation,
            infoTextBox,
            forecast,
        }
    },
    draw: ({
        tile,
        graphicsContext,
    }: {
        tile: ActionPreviewTile
        graphicsContext: GraphicsBuffer
    }) => {
        ActionTilePositionService.drawBackground({
            squaddieAffiliation: tile.squaddieAffiliation,
            graphicsContext,
            horizontalPosition: tile.horizontalPosition,
        })

        TextBoxService.draw(tile.infoTextBox, graphicsContext)
    },
}

const createInfoTextBox = ({
    squaddieTemplate,
    gameEngineState,
    forecast,
}: {
    squaddieTemplate: SquaddieTemplate
    gameEngineState: GameEngineState
    forecast: CalculatedResult
}) => {
    let messageToShow: string = ""

    let rollModifiers: { [r in RollModifierType]?: number } = {
        [RollModifierType.TIER]: squaddieTemplate.attributes.tier,
    }
    let multipleAttackPenalty =
        CalculatorAttack.calculateMultipleAttackPenaltyForActionsThisTurn(
            gameEngineState
        )
    if (multipleAttackPenalty !== 0) {
        rollModifiers[RollModifierType.MULTIPLE_ATTACK_PENALTY] =
            multipleAttackPenalty
    }

    const targetForecast = forecast.changesPerEffect[0]

    const criticalSuccess = targetForecast.squaddieChanges.find(
        (change) =>
            change.actorDegreeOfSuccess === DegreeOfSuccess.CRITICAL_SUCCESS
    )
    if (criticalSuccess) {
        messageToShow += `${((criticalSuccess.chanceOfDegreeOfSuccess * 100) / 36).toFixed()}% crit`
    }

    const success = targetForecast.squaddieChanges.find(
        (change) => change.actorDegreeOfSuccess === DegreeOfSuccess.SUCCESS
    )
    if (success) {
        messageToShow += `\n${((success.chanceOfDegreeOfSuccess * 100) / 36).toFixed()}% hit`
    }

    const boundingBox =
        ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
            ActionTilePosition.ACTION_PREVIEW
        )
    return TextBoxService.new({
        ...layoutConstants.info,
        fontSize: layoutConstants.info.fontSize,
        area: RectAreaService.new({
            left: RectAreaService.left(boundingBox),
            top: RectAreaService.top(boundingBox),
            width: RectAreaService.width(boundingBox),
            height: RectAreaService.height(boundingBox),
            margin: WINDOW_SPACING.SPACING1,
        }),
        text: messageToShow,
    })
}
