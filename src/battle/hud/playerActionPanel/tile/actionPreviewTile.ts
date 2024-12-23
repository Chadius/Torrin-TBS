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
import { ActionResultTextService } from "../../../animation/actionResultTextService"
import { RectAreaService } from "../../../../ui/rectArea"
import { WINDOW_SPACING } from "../../../../ui/constants"
import { SquaddieTemplate } from "../../../../campaign/squaddieTemplate"

export interface ActionPreviewTile {
    horizontalPosition: ActionTilePosition
    squaddieAffiliation: SquaddieAffiliation
    infoTextBox?: TextBox
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
        const infoTextBox = createInfoTextBox(squaddieTemplate, gameEngineState)

        return {
            horizontalPosition: ActionTilePosition.ACTION_PREVIEW,
            squaddieAffiliation: squaddieTemplate.squaddieId.affiliation,
            infoTextBox,
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

const createInfoTextBox = (
    squaddieTemplate: SquaddieTemplate,
    gameEngineState: GameEngineState
) => {
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

    const actionTemplate = ObjectRepositoryService.getActionTemplateById(
        gameEngineState.repository,
        BattleActionDecisionStepService.getAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        ).actionTemplateId
    )

    let messageToShow: string = "using action description"
    if (actionTemplate) {
        const intentMessages = ActionResultTextService.outputIntentForTextOnly({
            currentActionEffectTemplate:
                actionTemplate.actionEffectTemplates[0],
            actionTemplate,
            actingBattleSquaddieId: BattleActionDecisionStepService.getActor(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            ).battleSquaddieId,
            squaddieRepository: gameEngineState.repository,
            actingSquaddieModifiers: [],
            rollModifiers,
        })
        messageToShow = intentMessages.join("\n")
    }

    const boundingBox =
        ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
            ActionTilePosition.ACTION_PREVIEW
        )
    return TextBoxService.new({
        ...layoutConstants.info,
        textSize: layoutConstants.info.fontSize,
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
