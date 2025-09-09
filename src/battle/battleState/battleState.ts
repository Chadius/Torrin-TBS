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
import { BattlePhaseState } from "../orchestratorComponents/battlePhaseController"
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
import { GameEngineState } from "../../gameEngine/gameEngine"
import { getResultOrThrowError } from "../../utils/ResultOrError"
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
import { ActionValidityByIdCacheService } from "../actionValidity/cache/actionValidityByIdCache"

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
    ): BattleSquaddieTeam => {
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
                    battleState.battlePhaseState.currentAffiliation
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
        missionMap: missionMap,
        teams: isValidValue(teams) ? [...teams] : [],
        teamStrategiesById: isValidValue(teamStrategiesById)
            ? { ...teamStrategiesById }
            : {},
        battlePhaseState: battlePhaseState,
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
            (battleStateValidityMissingComponent) =>
                expectedComponents[battleStateValidityMissingComponent] ===
                false
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
    const gameEngineState: GameEngineState = message.gameEngineState

    const battleAction = BattleActionRecorderService.peekAtAnimationQueue(
        gameEngineState.battleOrchestratorState.battleState.battleActionRecorder
    )
    const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            battleAction.actor.actorBattleSquaddieId
        )
    )
    const { originMapCoordinate } = MissionMapService.getByBattleSquaddieId(
        gameEngineState.battleOrchestratorState.battleState.missionMap,
        battleAction.actor.actorBattleSquaddieId
    )

    SearchResultsCacheService.invalidateSquaddieAllMovementCacheForAll({
        searchResultsCache:
            gameEngineState.battleOrchestratorState.cache.searchResultsCache,
    })
    gameEngineState.battleOrchestratorState.cache.actionValidity =
        ActionValidityByIdCacheService.new()

    updateSummaryHUDAfterFinishingAnimation(message)

    DrawSquaddieIconOnMapUtilities.highlightPlayableSquaddieReachIfTheyCanAct({
        battleSquaddie,
        squaddieTemplate,
        missionMap:
            gameEngineState.battleOrchestratorState.battleState.missionMap,
        repository: gameEngineState.repository,
        squaddieAllMovementCache:
            gameEngineState.battleOrchestratorState.cache.searchResultsCache,
    })
    DrawSquaddieIconOnMapUtilities.tintSquaddieMapIconIfTheyCannotAct(
        battleSquaddie,
        squaddieTemplate,
        gameEngineState.repository
    )

    BattleActionService.setAnimationCompleted({
        battleAction: battleAction,
        animationCompleted: true,
    })

    if (battleAction.action.isMovement) {
        BattleActionsDuringTurnService.removeUndoableMovementActions(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder.actionsAlreadyAnimatedThisTurn
        )

        const squaddieUndidMovementWithoutActing =
            HexCoordinateService.areEqual(
                originMapCoordinate,
                battleAction.effect.movement.endCoordinate
            )
        if (squaddieUndidMovementWithoutActing) {
            BattleActionRecorderService.dequeueBattleActionFromReadyToAnimateQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )
        } else {
            BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )
        }
    } else {
        BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        )
    }

    const canAct = SquaddieService.canSquaddieActRightNow({
        battleSquaddie,
        squaddieTemplate,
    }).canAct

    if (battleSquaddie && canAct) {
        BattleActionDecisionStepService.reset(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        )
        BattleActionDecisionStepService.setActor({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
        })
        return
    }

    BattleActionDecisionStepService.reset(
        gameEngineState.battleOrchestratorState.battleState
            .battleActionDecisionStep
    )

    if (!canAct) {
        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.SQUADDIE_TURN_ENDS,
            gameEngineState,
        })
    }
}

const squaddieTurnEnds = (message: MessageBoardMessageSquaddieTurnEnds) => {
    const gameEngineState: GameEngineState = message.gameEngineState
    BattleActionRecorderService.turnComplete(
        gameEngineState.battleOrchestratorState.battleState.battleActionRecorder
    )
    SearchResultsCacheService.invalidateSquaddieAllMovementCacheForAll({
        searchResultsCache:
            gameEngineState.battleOrchestratorState.cache.searchResultsCache,
    })

    gameEngineState.battleOrchestratorState.cache.actionValidity =
        ActionValidityByIdCacheService.new()

    gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
        undefined
    gameEngineState.battleOrchestratorState.battleState.playerConsideredActions =
        PlayerConsideredActionsService.new()
}

const updateSummaryHUDAfterFinishingAnimation = (
    message: MessageBoardBattleActionFinishesAnimation
) => {
    const gameEngineState: GameEngineState = message.gameEngineState

    if (
        !gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState
    ) {
        return
    }

    ;[ActionTilePosition.ACTOR_STATUS, ActionTilePosition.TARGET_STATUS]
        .filter((tilePosition) =>
            isValidValue(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieStatusTiles[tilePosition]
            )
        )
        .map(
            (tilePosition) =>
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieStatusTiles[tilePosition]
        )
        .forEach((tile) =>
            SquaddieStatusTileService.updateTileUsingSquaddie({
                tile,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                playerConsideredActions:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                objectRepository: gameEngineState.repository,
            })
        )
}
