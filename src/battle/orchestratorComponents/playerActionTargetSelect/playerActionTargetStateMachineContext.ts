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
} from "../../orchestrator/battleOrchestratorComponent"
import { HexCoordinate } from "../../../hexMap/hexCoordinate/hexCoordinate"
import { DataBlobService } from "../../../utils/dataBlob/dataBlob"
import { PlayerCommandState } from "../../hud/playerCommand/playerCommandHUD"
import { BattleCamera } from "../../battleCamera"
import { SearchResultsCache } from "../../../hexMap/pathfinder/searchResults/searchResultsCache"
import { ChallengeModifierSetting } from "../../challengeModifier/challengeModifierSetting"
import { EnumLike } from "../../../utils/enum"

export const PlayerActionTargetStateInvalidTargetReason = {
    UNKNOWN: "UNKNOWN",
    NOT_A_FOE: "NOT_A_FOE",
    NOT_AN_ALLY: "NOT_AN_ALLY",
} as const satisfies Record<string, string>

export type TPlayerActionTargetStateInvalidTargetReason = EnumLike<
    typeof PlayerActionTargetStateInvalidTargetReason
>

export interface PlayerActionTargetStateMachineContext {
    camera: BattleCamera
    playerCommandState?: PlayerCommandState
    battleActionDecisionStep: BattleActionDecisionStep
    missionMap: MissionMap
    objectRepository?: ObjectRepository
    messageBoard: MessageBoard
    battleActionRecorder: BattleActionRecorder
    explanationLabelText: string
    buttonStatusChangeEventDataBlob: ButtonStatusChangeEventByButtonId

    messageParameters: {
        numberGenerator: NumberGeneratorStrategy
        summaryHUDState?: SummaryHUDState
        playerInputState: PlayerInputState
        campaignResources: CampaignResources
        squaddieAllMovementCache: SearchResultsCache
        challengeModifierSetting: ChallengeModifierSetting

        playerCancelsPlayerActionConsiderationsParameters: {
            playerConsideredActions: PlayerConsideredActions | undefined
            playerDecisionHUD: PlayerDecisionHUD
        }

        playerConfirmsActionMessageParameters: {
            missionStatistics: MissionStatistics
        }
    }
    playerInput: (
        | OrchestratorComponentKeyEvent
        | OrchestratorComponentMouseEvent
    )[]

    playerIntent: {
        targetCancelled: boolean
        targetSelection: {
            automaticallySelected: boolean
            battleSquaddieIds: string[]
        }
        targetConfirmed: boolean
        actionCancelled: boolean
    }

    targetResults: {
        invalidTargets: {
            [battleSquaddieId: string]: {
                currentMapCoordinate: HexCoordinate | undefined
                reason: TPlayerActionTargetStateInvalidTargetReason
            }
        }
        validCoordinates: HexCoordinate[]
        validTargets: {
            [battleSquaddieId: string]: {
                currentMapCoordinate: HexCoordinate | undefined
            }
        }
    }

    externalFlags: {
        cancelActionSelection: boolean | undefined
        actionConfirmed: boolean | undefined
    }
}

export const PlayerActionTargetContextService = {
    new: ({
        battleActionDecisionStep,
        missionMap,
        camera,
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
        playerCommandState,
        squaddieAllMovementCache,
        challengeModifierSetting,
    }: {
        missionStatistics: MissionStatistics
        battleActionDecisionStep: BattleActionDecisionStep
        missionMap: MissionMap
        objectRepository?: ObjectRepository
        campaignResources: CampaignResources
        messageBoard: MessageBoard
        summaryHUDState?: SummaryHUDState
        battleActionRecorder: BattleActionRecorder
        numberGenerator: NumberGeneratorStrategy
        playerInputState: PlayerInputState
        playerConsideredActions?: PlayerConsideredActions
        playerDecisionHUD: PlayerDecisionHUD
        playerCommandState?: PlayerCommandState
        camera: BattleCamera
        squaddieAllMovementCache: SearchResultsCache
        challengeModifierSetting: ChallengeModifierSetting
    }): PlayerActionTargetStateMachineContext => {
        const playerCancelsPlayerActionConsiderationsParameters = {
            playerConsideredActions,
            playerDecisionHUD,
        }

        const playerConfirmsActionMessageParameters = {
            missionStatistics,
        }

        return {
            battleActionDecisionStep,
            missionMap,
            camera,
            objectRepository,
            messageBoard,
            battleActionRecorder,
            explanationLabelText: "Select a target",
            buttonStatusChangeEventDataBlob: DataBlobService.new(),
            messageParameters: {
                playerInputState,
                numberGenerator,
                summaryHUDState,
                campaignResources:
                    campaignResources ?? CampaignResourcesService.default(),
                playerCancelsPlayerActionConsiderationsParameters,
                playerConfirmsActionMessageParameters,
                squaddieAllMovementCache,
                challengeModifierSetting,
            },
            targetResults: {
                validCoordinates: [],
                validTargets: {},
                invalidTargets: {},
            },
            playerInput: [],
            externalFlags: {
                cancelActionSelection: undefined,
                actionConfirmed: undefined,
            },
            playerIntent: {
                targetCancelled: false,
                targetSelection: {
                    battleSquaddieIds: [],
                    automaticallySelected: false,
                },
                targetConfirmed: false,
                actionCancelled: false,
            },
            playerCommandState,
        }
    },
}
