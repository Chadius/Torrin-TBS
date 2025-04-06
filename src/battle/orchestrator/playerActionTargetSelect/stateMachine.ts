import { StateMachine } from "../../../utils/stateMachine/stateMachine"
import {
    StateMachineData,
    StateMachineDataService,
} from "../../../utils/stateMachine/stateMachineData/stateMachineData"
import { StateMachineStateData } from "../../../utils/stateMachine/stateMachineData/stateMachineStateData"
import { StateMachineTransitionData } from "../../../utils/stateMachine/stateMachineData/stateMachineTransitionData"
import { TargetingResultsService } from "../../targeting/targetingService"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../../actionDecision/battleActionDecisionStep"
import { getResultOrThrowError } from "../../../utils/ResultOrError"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { HexCoordinate } from "../../../hexMap/hexCoordinate/hexCoordinate"
import {
    CampaignResources,
    CampaignResourcesService,
} from "../../../campaign/campaignResources"
import { MessageBoard } from "../../../message/messageBoard"
import { MessageBoardMessageType } from "../../../message/messageBoardMessage"

export enum PlayerActionTargetStateEnum {
    UNKNOWN = "UNKNOWN",
    INITIALIZED = "INITIALIZED",
    NOT_APPLICABLE = "NOT_APPLICABLE",
    COUNT_TARGETS = "COUNT_TARGETS",
    FINISHED = "FINISHED",
    CANCEL_ACTION_TARGET = "CANCEL_ACTION_TARGET",
}

export enum PlayerActionTargetTransitionEnum {
    UNKNOWN = "UNKNOWN",
    INITIALIZED = "INITIALIZED",
    UNSUPPORTED_COUNT_TARGETS = "UNSUPPORTED_COUNT_TARGETS",
    FINISHED = "FINISHED",
    NO_TARGETS_FOUND = "NO_TARGETS_FOUND",
}

export enum PlayerActionTargetActionEnum {
    UNKNOWN = "UNKNOWN",
    COUNT_TARGETS_ENTRY = "COUNT_TARGETS_ENTRY",
    NOT_APPLICABLE_ENTRY = "NOT_APPLICABLE_ENTRY",
    FINISHED_ENTRY = "FINISHED_ENTRY",
    CANCEL_ACTION_TARGET_ENTRY = "CANCEL_ACTION_TARGET_ENTRY",
}

export interface PlayerActionTargetContext {
    battleActionDecisionStep: BattleActionDecisionStep
    missionMap: MissionMap
    objectRepository: ObjectRepository
    campaignResources: CampaignResources
    messageBoard: MessageBoard

    validCoordinates: HexCoordinate[]
    validTargets: {
        [battleSquaddieId: string]: { mapCoordinate: HexCoordinate }
    }
    useLegacySelector: boolean
    cancelActionTarget: boolean
    finished: boolean
}

export const PlayerActionTargetContextService = {
    new: ({
        battleActionDecisionStep,
        missionMap,
        objectRepository,
        campaignResources,
        messageBoard,
    }: {
        battleActionDecisionStep: BattleActionDecisionStep
        missionMap: MissionMap
        objectRepository: ObjectRepository
        campaignResources: CampaignResources
        messageBoard: MessageBoard
    }): PlayerActionTargetContext => {
        return {
            battleActionDecisionStep,
            missionMap,
            objectRepository,
            campaignResources:
                campaignResources ?? CampaignResourcesService.default(),
            messageBoard,
            validTargets: {},
            validCoordinates: [],
            useLegacySelector: undefined,
            cancelActionTarget: undefined,
            finished: undefined,
        }
    },
}

export const PlayerActionTargetStateMachineInfoByState: {
    [s in PlayerActionTargetStateEnum]?: StateMachineStateData<
        PlayerActionTargetTransitionEnum,
        PlayerActionTargetActionEnum
    >
} = {
    [PlayerActionTargetStateEnum.INITIALIZED]: {
        actions: [],
        entryAction: undefined,
        exitAction: undefined,
        transitions: [PlayerActionTargetTransitionEnum.INITIALIZED],
    },
    [PlayerActionTargetStateEnum.COUNT_TARGETS]: {
        actions: [],
        entryAction: PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY,
        exitAction: undefined,
        transitions: [
            PlayerActionTargetTransitionEnum.UNSUPPORTED_COUNT_TARGETS,
            PlayerActionTargetTransitionEnum.NO_TARGETS_FOUND,
        ],
    },
    [PlayerActionTargetStateEnum.NOT_APPLICABLE]: {
        actions: [],
        entryAction: PlayerActionTargetActionEnum.NOT_APPLICABLE_ENTRY,
        exitAction: undefined,
        transitions: [PlayerActionTargetTransitionEnum.FINISHED],
    },
    [PlayerActionTargetStateEnum.CANCEL_ACTION_TARGET]: {
        actions: [],
        entryAction: PlayerActionTargetActionEnum.CANCEL_ACTION_TARGET_ENTRY,
        exitAction: undefined,
        transitions: [PlayerActionTargetTransitionEnum.FINISHED],
    },
    [PlayerActionTargetStateEnum.FINISHED]: {
        actions: [],
        entryAction: PlayerActionTargetActionEnum.FINISHED_ENTRY,
        exitAction: undefined,
        transitions: [],
    },
}

export const PlayerActionTargetStateMachineInfoByTransition: {
    [t in PlayerActionTargetTransitionEnum]?: StateMachineTransitionData<
        PlayerActionTargetStateEnum,
        PlayerActionTargetActionEnum
    >
} = {
    [PlayerActionTargetTransitionEnum.INITIALIZED]: {
        targetedState: PlayerActionTargetStateEnum.COUNT_TARGETS,
        action: undefined,
    },
    [PlayerActionTargetTransitionEnum.UNSUPPORTED_COUNT_TARGETS]: {
        targetedState: PlayerActionTargetStateEnum.NOT_APPLICABLE,
        action: undefined,
    },
    [PlayerActionTargetTransitionEnum.NO_TARGETS_FOUND]: {
        targetedState: PlayerActionTargetStateEnum.CANCEL_ACTION_TARGET,
        action: undefined,
    },
    [PlayerActionTargetTransitionEnum.FINISHED]: {
        targetedState: PlayerActionTargetStateEnum.FINISHED,
        action: undefined,
    },
}

export class PlayerActionTargetStateMachine extends StateMachine<
    PlayerActionTargetStateEnum,
    PlayerActionTargetTransitionEnum,
    PlayerActionTargetActionEnum,
    PlayerActionTargetContext
> {
    currentState: PlayerActionTargetStateEnum
    stateMachineData: StateMachineData<
        PlayerActionTargetStateEnum,
        PlayerActionTargetTransitionEnum,
        PlayerActionTargetActionEnum,
        PlayerActionTargetContext
    >

    constructor({
        id,
        context,
        stateMachineData,
    }: {
        id: string
        context: PlayerActionTargetContext
        stateMachineData: StateMachineData<
            PlayerActionTargetStateEnum,
            PlayerActionTargetTransitionEnum,
            PlayerActionTargetActionEnum,
            PlayerActionTargetContext
        >
    }) {
        super({ id, stateMachineData, worldData: context })
    }

    setTransitionTriggerFunctions() {
        StateMachineDataService.setTransitionTriggerFunctions(
            this.stateMachineData,
            {
                [PlayerActionTargetTransitionEnum.INITIALIZED]: (_) =>
                    this.currentState ==
                    PlayerActionTargetStateEnum.INITIALIZED,
                [PlayerActionTargetTransitionEnum.NO_TARGETS_FOUND]: (
                    context: PlayerActionTargetContext
                ) =>
                    context.validTargets != undefined &&
                    Object.keys(context.validTargets).length == 0,
                [PlayerActionTargetTransitionEnum.UNSUPPORTED_COUNT_TARGETS]: (
                    context: PlayerActionTargetContext
                ) =>
                    context.validTargets != undefined &&
                    Object.keys(context.validTargets).length > 0,
                [PlayerActionTargetTransitionEnum.FINISHED]: (
                    context: PlayerActionTargetContext
                ) => context.useLegacySelector || context.cancelActionTarget,
            }
        )
    }

    setActionLogic() {
        StateMachineDataService.setActionLogic(this.stateMachineData, {
            [PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY]:
                countTargetsEntry,
            [PlayerActionTargetActionEnum.NOT_APPLICABLE_ENTRY]: (
                context: PlayerActionTargetContext
            ) => {
                context.useLegacySelector = true
            },
            [PlayerActionTargetActionEnum.CANCEL_ACTION_TARGET_ENTRY]: (
                context: PlayerActionTargetContext
            ) => {
                context.cancelActionTarget = true
                context.messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION,
                    battleActionDecisionStep: context.battleActionDecisionStep,
                    missionMap: context.missionMap,
                    objectRepository: context.objectRepository,
                    campaignResources: context.campaignResources,
                })
            },
            [PlayerActionTargetActionEnum.FINISHED_ENTRY]: (
                context: PlayerActionTargetContext
            ) => {
                context.finished = true
            },
        })
    }
}

const countTargetsEntry = (context: PlayerActionTargetContext) => {
    const battleSquaddieId = BattleActionDecisionStepService.getActor(
        context.battleActionDecisionStep
    )?.battleSquaddieId

    if (battleSquaddieId == undefined) {
        throw new Error(
            "[PlayerActionTargetStateMachine.countTargetsEntry] no actor found"
        )
    }

    const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            context.objectRepository,
            battleSquaddieId
        )
    )

    const actionTemplateId = BattleActionDecisionStepService.getAction(
        context.battleActionDecisionStep
    )?.actionTemplateId
    if (actionTemplateId == undefined) {
        throw new Error(
            "[PlayerActionTargetStateMachine.countTargetsEntry] no action found"
        )
    }

    const actionTemplate = ObjectRepositoryService.getActionTemplateById(
        context.objectRepository,
        actionTemplateId
    )

    const targetingResults = TargetingResultsService.findValidTargets({
        map: context.missionMap,
        actionTemplate,
        actionEffectSquaddieTemplate: actionTemplate.actionEffectTemplates[0],
        actingSquaddieTemplate: squaddieTemplate,
        actingBattleSquaddie: battleSquaddie,
        squaddieRepository: context.objectRepository,
    })

    targetingResults.battleSquaddieIdsInRange.forEach((battleSquaddieId) => {
        const { mapCoordinate } = MissionMapService.getByBattleSquaddieId(
            context.missionMap,
            battleSquaddieId
        )

        context.validTargets[battleSquaddieId] = {
            mapCoordinate,
        }
    })

    context.validCoordinates = [...targetingResults.coordinatesInRange]
}
