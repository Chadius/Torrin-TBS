import {
    BattleCompletionStatus,
    MissionObjectivesAndCutscenes,
    MissionObjectivesAndCutscenesHelper,
    TBattleCompletionStatus,
} from "../orchestrator/missionObjectivesAndCutscenes"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import {
    SquaddieAffiliation,
    TSquaddieAffiliation,
} from "../../squaddie/squaddieAffiliation"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { TeamStrategy } from "../teamStrategy/teamStrategy"
import {
    BattlePhaseState,
    BattlePhaseStateService,
} from "../orchestratorComponents/battlePhaseController"
import { BattleCamera } from "../battleCamera"
import { MissionCompletionStatus } from "../missionResult/missionCompletionStatus"
import {
    MissionStatistics,
    MissionStatisticsService,
} from "../missionStatistics/missionStatistics"
import { MissionCutsceneCollection } from "../orchestrator/missionCutsceneCollection"
import { BattleEvent } from "../event/battleEvent"
import { MissionObjective } from "../missionResult/missionObjective"
import { NullMissionMap } from "../../utils/test/battleOrchestratorState"
import {
    BattlePhase,
    BattlePhaseService,
} from "../orchestratorComponents/battlePhaseTracker"
import { isValidValue } from "../../utils/objectValidityCheck"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../actionDecision/battleActionDecisionStep"
import { MessageBoardListener } from "../../message/messageBoardListener"
import {
    MessageBoardBattleActionFinishesAnimation,
    MessageBoardMessage,
    MessageBoardMessageSquaddieTurnEnds,
    MessageBoardMessageType,
} from "../../message/messageBoardMessage"
import { SquaddieService } from "../../squaddie/squaddieService"
import {
    BattleActionRecorder,
    BattleActionRecorderService,
} from "../history/battleAction/battleActionRecorder"
import { BattleActionService } from "../history/battleAction/battleAction"
import { DrawSquaddieIconOnMapUtilities } from "../animation/drawSquaddieIconOnMap/drawSquaddieIconOnMap"
import { SquaddieStatusTileService } from "../hud/playerActionPanel/tile/squaddieStatusTile/squaddieStatusTile"
import { ActionTilePosition } from "../hud/playerActionPanel/tile/actionTilePosition"
import {
    PlayerConsideredActions,
    PlayerConsideredActionsService,
} from "./playerConsideredActions"
import { SearchPathAdapter } from "../../search/searchPathAdapter/searchPathAdapter"
import { BattleActionsDuringTurnService } from "../history/battleAction/battleActionsDuringTurn"
import { HexCoordinateService } from "../../hexMap/hexCoordinate/hexCoordinate"
import { SearchResultsCacheService } from "../../hexMap/pathfinder/searchResults/searchResultsCache"
import {
    ChallengeModifierSetting,
    ChallengeModifierSettingService,
} from "../challengeModifier/challengeModifierSetting"
import { EnumLike } from "../../utils/enum"
import { BattleCacheService } from "../orchestrator/battleCache/battleCache"
import { BattleHUDStateService } from "../hud/battleHUD/battleHUDState"

export const BattleStateValidityMissingComponent = {
    MISSION_MAP: "MISSION_MAP",
    TEAMS: "TEAMS",
    MISSION_OBJECTIVE: "MISSION_OBJECTIVE",
} as const satisfies Record<string, string>

export type TBattleStateValidityMissingComponent = EnumLike<
    typeof BattleStateValidityMissingComponent
>

export interface BattleState extends MissionObjectivesAndCutscenes {
    missionId: string
    missionMap: MissionMap
    teams: BattleSquaddieTeam[]
    teamStrategiesById: { [key: string]: TeamStrategy[] }
    battlePhaseState: BattlePhaseState
    squaddieMovePath?: SearchPathAdapter
    playerConsideredActions?: PlayerConsideredActions
    camera: BattleCamera
    battleActionRecorder: BattleActionRecorder
    missionCompletionStatus: MissionCompletionStatus
    missionStatistics: MissionStatistics
    battleActionDecisionStep: BattleActionDecisionStep
    challengeModifierSetting: ChallengeModifierSetting
}

export const BattleStateService = {
    new: (params: BattleStateConstructorParameters): BattleState => {
        return newBattleState(params)
    },
    newBattleState: (params: BattleStateConstructorParameters): BattleState => {
        return newBattleState(params)
    },
    isValid: (battleState: BattleState): boolean => {
        if (!battleState) {
            return false
        }
        const missingComponents = getMissingComponents(battleState)
        return (
            missingComponents.length === 0 ||
            (missingComponents.length === 1 &&
                missingComponents.includes(
                    BattleStateValidityMissingComponent.MISSION_OBJECTIVE
                ))
        )
    },
    missingComponents: (
        battleState: BattleState
    ): TBattleStateValidityMissingComponent[] => {
        return getMissingComponents(battleState)
    },
    isReadyToContinueMission: (battleState: BattleState): boolean => {
        const missingComponents = getMissingComponents(battleState)
        return missingComponents.length === 0
    },
    getCurrentTeam: (
        battleState: BattleState,
        squaddieRepository: ObjectRepository
    ): BattleSquaddieTeam | undefined => {
        if (
            !isValidValue(battleState) ||
            !isValidValue(battleState.battlePhaseState)
        ) {
            return undefined
        }

        const teamsOfAffiliation: BattleSquaddieTeam[] =
            BattlePhaseService.findTeamsOfAffiliation(
                battleState.teams,
                BattlePhaseService.ConvertBattlePhaseToSquaddieAffiliation(
                    battleState.battlePhaseState.battlePhase
                )
            )

        return teamsOfAffiliation.find((team) =>
            BattleSquaddieTeamService.hasAnActingSquaddie(
                team,
                squaddieRepository
            )
        )
    },
    clone: (battleState: BattleState): BattleState => {
        return { ...battleState }
    },
    update: (battleState: BattleState, other: BattleState): void => {
        Object.assign(battleState, other)
    },
    defaultBattleState: (
        params: BattleStateConstructorParameters
    ): BattleState => {
        const defaultParameters: BattleStateConstructorParameters = {
            ...{
                missionId: "default mission id",
                missionMap: NullMissionMap(),
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            },
            ...params,
        }

        return newBattleState(defaultParameters)
    },
    getTeamsAndStrategiesByAffiliation: ({
        battleState,
        affiliation,
    }: {
        battleState: BattleState
        affiliation: TSquaddieAffiliation
    }):
        | {
              teams: BattleSquaddieTeam[]
              strategies: { [teamName: string]: TeamStrategy[] }
          }
        | undefined => {
        const foundTeams: BattleSquaddieTeam[] = battleState.teams.filter(
            (team) => team.affiliation === affiliation
        )
        const foundStrategies = Object.fromEntries(
            Object.entries(battleState.teamStrategiesById).filter(
                ([teamId, _]) => {
                    return foundTeams.some((team) => team.id === teamId)
                }
            )
        )

        const noTeamsFound: boolean = foundTeams.length === 0
        if (noTeamsFound && affiliation === SquaddieAffiliation.PLAYER) {
            return undefined
        }

        return {
            teams: foundTeams,
            strategies: foundStrategies,
        }
    },
    sanitize: (battleState: BattleState) => {
        MissionObjectivesAndCutscenesHelper.sanitize(battleState)
    },
    resetPlayerConsideredActions: (battleState: BattleState) => {
        if (battleState == undefined) {
            throw new Error(
                "[BattleStateService.resetPlayerConsideredActions]: battleState must be defined"
            )
        }
        battleState.playerConsideredActions =
            PlayerConsideredActionsService.new()
    },
    getBattleSquaddieIdCurrentlyTakingATurn: (
        battleState: BattleState
    ): string | undefined => {
        const isSquaddieCurrentlySelected =
            BattleActionDecisionStepService.isActorSet(
                battleState.battleActionDecisionStep
            )
        const isSquaddieCurrentlyAnimating =
            !BattleActionRecorderService.isAnimationQueueEmpty(
                battleState.battleActionRecorder
            )
        const didSquaddieAlreadyAnimateThisTurn =
            !BattleActionRecorderService.isAlreadyAnimatedQueueEmpty(
                battleState.battleActionRecorder
            )
        switch (true) {
            case !isSquaddieCurrentlyTakingATurn({
                battleActionDecisionStep: battleState.battleActionDecisionStep,
                battleActionRecorder: battleState.battleActionRecorder,
            }):
                return undefined
            case isSquaddieCurrentlySelected:
                return BattleActionDecisionStepService.getActor(
                    battleState.battleActionDecisionStep
                )?.battleSquaddieId
            case isSquaddieCurrentlyAnimating:
                return BattleActionRecorderService.peekAtAnimationQueue(
                    battleState.battleActionRecorder
                )?.actor?.actorBattleSquaddieId
            case didSquaddieAlreadyAnimateThisTurn:
                return BattleActionRecorderService.peekAtAlreadyAnimatedQueue(
                    battleState.battleActionRecorder
                )?.actor?.actorBattleSquaddieId
            default:
                return undefined
        }
    },
}

interface BattleStateConstructorParameters {
    campaignId: string
    missionId: string
    cutsceneCollection?: MissionCutsceneCollection
    battleEvents?: BattleEvent[]
    objectives?: MissionObjective[]
    missionMap?: MissionMap
    camera?: BattleCamera
    battlePhaseState?: BattlePhaseState
    teams?: BattleSquaddieTeam[]
    teamStrategiesById?: { [key: string]: TeamStrategy[] }
    missionCompletionStatus?: MissionCompletionStatus
    missionStatistics?: MissionStatistics
    searchPath?: SearchPathAdapter
    battleCompletionStatus?: TBattleCompletionStatus
    battleActionRecorder?: BattleActionRecorder
    battleActionDecisionStep?: BattleActionDecisionStep
    challengeModifierSetting?: ChallengeModifierSetting
}

const newBattleState = ({
    missionId,
    objectives,
    cutsceneCollection,
    battleEvents,
    missionMap,
    camera,
    battlePhaseState,
    missionStatistics,
    missionCompletionStatus,
    searchPath,
    battleCompletionStatus,
    teams,
    teamStrategiesById,
    battleActionRecorder,
    battleActionDecisionStep,
    challengeModifierSetting,
}: BattleStateConstructorParameters): BattleState => {
    const missionObjectivesAndCutscenes =
        MissionObjectivesAndCutscenesHelper.new({
            objectives,
            cutsceneCollection,
            battleEvents,
            missionCompletionStatus,
            battleCompletionStatus,
        })

    return {
        ...missionObjectivesAndCutscenes,
        missionId: missionId,
        missionMap: missionMap ?? MissionMapService.default(),
        teams: isValidValue(teams) && teams != undefined ? [...teams] : [],
        teamStrategiesById: isValidValue(teamStrategiesById)
            ? { ...teamStrategiesById }
            : {},
        battlePhaseState:
            battlePhaseState ??
            BattlePhaseStateService.new({
                currentAffiliation: BattlePhase.PLAYER,
                turnCount: 0,
            }),
        squaddieMovePath: searchPath || undefined,
        camera: camera || new BattleCamera(),
        battleActionRecorder:
            battleActionRecorder || BattleActionRecorderService.new(),
        missionStatistics:
            missionStatistics || MissionStatisticsService.new({}),
        battleCompletionStatus:
            battleCompletionStatus || BattleCompletionStatus.IN_PROGRESS,
        battleActionDecisionStep:
            battleActionDecisionStep ?? BattleActionDecisionStepService.new(),
        playerConsideredActions: PlayerConsideredActionsService.new(),
        challengeModifierSetting:
            challengeModifierSetting ?? ChallengeModifierSettingService.new(),
    }
}

const getMissingComponents = (
    battleState: BattleState
): TBattleStateValidityMissingComponent[] => {
    const expectedComponents = {
        [BattleStateValidityMissingComponent.MISSION_MAP]: isValidValue(
            battleState.missionMap
        ),
        [BattleStateValidityMissingComponent.TEAMS]:
            isValidValue(battleState.teams) &&
            battleState.teams.length > 0 &&
            isValidValue(battleState.teamStrategiesById),
        [BattleStateValidityMissingComponent.MISSION_OBJECTIVE]:
            isValidValue(battleState.objectives) &&
            battleState.objectives.length > 0 &&
            battleState.objectives[0].conditions.length > 0,
    }

    return Object.keys(expectedComponents)
        .map((str) => str as TBattleStateValidityMissingComponent)
        .filter(
            (
                battleStateValidityMissingComponent: TBattleStateValidityMissingComponent
            ) => !expectedComponents[battleStateValidityMissingComponent]
        )
}

export class BattleStateListener implements MessageBoardListener {
    messageBoardListenerId: string

    constructor(messageBoardListenerId: string) {
        this.messageBoardListenerId = messageBoardListenerId
    }

    receiveMessage(message: MessageBoardMessage): void {
        if (
            message.type ===
            MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION
        ) {
            battleActionFinishesAnimation(
                message as MessageBoardBattleActionFinishesAnimation
            )
        }
        if (message.type === MessageBoardMessageType.SQUADDIE_TURN_ENDS) {
            squaddieTurnEnds(message as MessageBoardMessageSquaddieTurnEnds)
        }
    }
}

const battleActionFinishesAnimation = (
    message: MessageBoardBattleActionFinishesAnimation
) => {
    const battleActionRecorder = message.battleActionRecorder
    const repository = message.repository
    const missionMap = message.missionMap
    const cache = message.cache
    const battleHUDState = message.battleHUDState
    const battleState = message.battleState
    const messageBoard = message.messageBoard

    if (repository == undefined) return

    const battleAction =
        BattleActionRecorderService.peekAtAnimationQueue(battleActionRecorder)
    if (battleAction == undefined) return

    const { battleSquaddie, squaddieTemplate } =
        ObjectRepositoryService.getSquaddieByBattleId(
            repository,
            battleAction.actor.actorBattleSquaddieId
        )

    const { originMapCoordinate } = MissionMapService.getByBattleSquaddieId(
        missionMap,
        battleAction.actor.actorBattleSquaddieId
    )

    SearchResultsCacheService.invalidateSquaddieAllMovementCacheForAll({
        searchResultsCache: cache.searchResultsCache,
    })
    BattleCacheService.resetActionValidity(cache)

    updateSummaryHUDAfterFinishingAnimation(message)

    DrawSquaddieIconOnMapUtilities.highlightPlayableSquaddieReachIfTheyCanAct({
        battleSquaddie,
        squaddieTemplate,
        missionMap,
        repository,
        squaddieAllMovementCache: cache.searchResultsCache,
    })
    DrawSquaddieIconOnMapUtilities.tintSquaddieMapIconIfTheyCannotAct(
        battleSquaddie,
        squaddieTemplate,
        repository
    )

    BattleActionService.setAnimationCompleted({
        battleAction: battleAction,
        animationCompleted: true,
    })

    if (battleAction.action.isMovement) {
        BattleActionsDuringTurnService.removeUndoableMovementActions(
            battleActionRecorder.actionsAlreadyAnimatedThisTurn
        )

        const squaddieUndidMovementWithoutActing =
            battleAction.effect.movement != undefined &&
            HexCoordinateService.areEqual(
                originMapCoordinate,
                battleAction.effect.movement.endCoordinate
            )
        if (squaddieUndidMovementWithoutActing) {
            BattleActionRecorderService.dequeueBattleActionFromReadyToAnimateQueue(
                battleActionRecorder
            )
        } else {
            BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
                battleActionRecorder
            )
        }
    } else {
        BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
            battleActionRecorder
        )
    }

    const canAct = SquaddieService.canSquaddieActRightNow({
        battleSquaddie,
        squaddieTemplate,
    }).canAct

    if (battleSquaddie && canAct) {
        BattleActionDecisionStepService.reset(
            battleState.battleActionDecisionStep
        )
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: battleState.battleActionDecisionStep,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
        })
        return
    }

    BattleActionDecisionStepService.reset(battleState.battleActionDecisionStep)

    if (!canAct) {
        messageBoard.sendMessage({
            type: MessageBoardMessageType.SQUADDIE_TURN_ENDS,
            cache,
            battleActionRecorder,
            battleHUDState,
            battleState,
        })
    }
}

const squaddieTurnEnds = (message: MessageBoardMessageSquaddieTurnEnds) => {
    const cache = message.cache
    const battleActionRecorder = message.battleActionRecorder
    const battleHUDState = message.battleHUDState
    const battleState = message.battleState

    BattleActionRecorderService.turnComplete(battleActionRecorder)

    SearchResultsCacheService.invalidateSquaddieAllMovementCacheForAll({
        searchResultsCache: cache.searchResultsCache,
    })
    BattleCacheService.resetActionValidity(cache)
    BattleHUDStateService.clearSummaryHUDState(battleHUDState)
    battleState.playerConsideredActions = PlayerConsideredActionsService.new()
}

const updateSummaryHUDAfterFinishingAnimation = (
    message: MessageBoardBattleActionFinishesAnimation
) => {
    const { battleHUDState, missionMap, battleState, repository } = message

    if (!battleHUDState.summaryHUDState) {
        return
    }
    if (repository == undefined) return
    ;[ActionTilePosition.ACTOR_STATUS, ActionTilePosition.TARGET_STATUS]
        .filter((tilePosition) =>
            isValidValue(
                battleHUDState.summaryHUDState?.squaddieStatusTiles[
                    tilePosition
                ]
            )
        )
        .map(
            (tilePosition) =>
                battleHUDState.summaryHUDState?.squaddieStatusTiles[
                    tilePosition
                ]
        )
        .filter((tile) => tile != undefined)
        .forEach((tile) =>
            SquaddieStatusTileService.updateTileUsingSquaddie({
                tile,
                missionMap,
                playerConsideredActions: battleState.playerConsideredActions,
                battleActionDecisionStep: battleState.battleActionDecisionStep,
                objectRepository: repository,
            })
        )
}

const isSquaddieCurrentlyTakingATurn = ({
    battleActionDecisionStep,
    battleActionRecorder,
}: {
    battleActionDecisionStep: BattleActionDecisionStep
    battleActionRecorder: BattleActionRecorder
}): boolean => {
    if (
        BattleActionDecisionStepService.isActorSet(battleActionDecisionStep) &&
        BattleActionDecisionStepService.isActionSet(battleActionDecisionStep) &&
        BattleActionDecisionStepService.isTargetConsidered(
            battleActionDecisionStep
        )
    ) {
        return true
    }

    if (
        !BattleActionRecorderService.isAnimationQueueEmpty(battleActionRecorder)
    ) {
        return true
    }

    return !BattleActionRecorderService.isAlreadyAnimatedQueueEmpty(
        battleActionRecorder
    )
}
