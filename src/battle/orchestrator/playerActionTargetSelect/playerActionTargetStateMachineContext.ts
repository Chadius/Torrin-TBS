import { BattleActionDecisionStep } from "../../actionDecision/battleActionDecisionStep"
import { MissionMap } from "../../../missionMap/missionMap"
import { ObjectRepository } from "../../objectRepository"
import { MessageBoard } from "../../../message/messageBoard"
import { ButtonStatusChangeEventByButtonId } from "../../../ui/button/logic/base"
import { BattleActionRecorder } from "../../history/battleAction/battleActionRecorder"
import { NumberGeneratorStrategy } from "../../numberGenerator/strategy"
import { SummaryHUDState } from "../../hud/summary/summaryHUD"
import {
    CampaignResources,
    CampaignResourcesService,
} from "../../../campaign/campaignResources"
import { PlayerConsideredActions } from "../../battleState/playerConsideredActions"
import { PlayerDecisionHUD } from "../../hud/playerActionPanel/playerDecisionHUD"
import { PlayerInputState } from "../../../ui/playerInput/playerInputState"
import { MissionStatistics } from "../../missionStatistics/missionStatistics"
import {
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
} from "../battleOrchestratorComponent"
import { HexCoordinate } from "../../../hexMap/hexCoordinate/hexCoordinate"
import { ComponentDataBlob } from "../../../utils/dataBlob/componentDataBlob"
import { DataBlobService } from "../../../utils/dataBlob/dataBlob"
import { PlayerActionTargetStateMachineLayout } from "./playerActionTargetStateMachineLayout"
import { PlayerActionTargetStateMachineUIObjects } from "./playerActionTargetStateMachineUIObjects"

export interface PlayerActionTargetStateMachineContext {
    battleActionDecisionStep: BattleActionDecisionStep
    missionMap: MissionMap
    objectRepository: ObjectRepository
    messageBoard: MessageBoard
    playerActionConfirmContext: {
        buttonStatusChangeEventDataBlob: ButtonStatusChangeEventByButtonId
    }

    messageParameters: {
        battleActionRecorder: BattleActionRecorder
        numberGenerator: NumberGeneratorStrategy
        summaryHUDState: SummaryHUDState

        playerCancelsTargetSelectionMessageParameters: {
            campaignResources: CampaignResources
        }

        playerCancelsPlayerActionConsiderationsParameters: {
            playerConsideredActions: PlayerConsideredActions
            playerDecisionHUD: PlayerDecisionHUD
        }

        playerConfirmsActionMessageParameters: {
            playerInputState: PlayerInputState
            missionStatistics: MissionStatistics
        }
    }
    playerInput: (
        | OrchestratorComponentKeyEvent
        | OrchestratorComponentMouseEvent
    )[]

    playerIntent: {
        targetSelection: {
            automaticallySelected: boolean
            battleSquaddieIds: string[]
        }
        targetConfirmed: boolean
        actionCancelled: boolean
    }

    targetResults: {
        validCoordinates: HexCoordinate[]
        validTargets: {
            [battleSquaddieId: string]: { mapCoordinate: HexCoordinate }
        }
    }

    externalFlags: {
        useLegacySelector: boolean
        cancelActionTarget: boolean
        cancelActionSelection: boolean
        finished: boolean
    }
}

export const PlayerActionTargetContextService = {
    new: ({
        battleActionDecisionStep,
        missionMap,
        objectRepository,
        campaignResources,
        messageBoard,
        summaryHUDState,
        battleActionRecorder,
        numberGenerator,
        missionStatistics,
        playerInputState,
        playerConsideredActions,
        playerDecisionHUD,
    }: {
        missionStatistics: MissionStatistics
        battleActionDecisionStep: BattleActionDecisionStep
        missionMap: MissionMap
        objectRepository: ObjectRepository
        campaignResources: CampaignResources
        messageBoard: MessageBoard
        summaryHUDState: SummaryHUDState
        battleActionRecorder: BattleActionRecorder
        numberGenerator: NumberGeneratorStrategy
        playerInputState: PlayerInputState
        playerConsideredActions: PlayerConsideredActions
        playerDecisionHUD: PlayerDecisionHUD
    }): PlayerActionTargetStateMachineContext => {
        const playerCancelsTargetSelectionMessageParameters = {
            campaignResources:
                campaignResources ?? CampaignResourcesService.default(),
        }

        const playerCancelsPlayerActionConsiderationsParameters = {
            playerConsideredActions,
            playerDecisionHUD,
        }

        const playerConfirmsActionMessageParameters = {
            missionStatistics,
            playerInputState,
        }

        const context: PlayerActionTargetStateMachineContext = {
            battleActionDecisionStep,
            missionMap,
            objectRepository,
            messageBoard,
            playerActionConfirmContext: {
                buttonStatusChangeEventDataBlob: DataBlobService.new(),
            },
            messageParameters: {
                numberGenerator,
                battleActionRecorder,
                summaryHUDState,
                playerCancelsTargetSelectionMessageParameters,
                playerCancelsPlayerActionConsiderationsParameters,
                playerConfirmsActionMessageParameters,
            },
            targetResults: {
                validCoordinates: [],
                validTargets: {},
            },
            playerInput: [],
            externalFlags: {
                cancelActionSelection: undefined,
                cancelActionTarget: undefined,
                useLegacySelector: undefined,
                finished: undefined,
            },
            playerIntent: {
                targetSelection: {
                    battleSquaddieIds: [],
                    automaticallySelected: false,
                },
                targetConfirmed: false,
                actionCancelled: false,
            },
        }

        return context
    },
}
