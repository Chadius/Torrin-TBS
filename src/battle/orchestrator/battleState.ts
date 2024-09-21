import {
    BattleCompletionStatus,
    MissionObjectivesAndCutscenes,
    MissionObjectivesAndCutscenesHelper,
} from "./missionObjectivesAndCutscenes"
import { MissionMap } from "../../missionMap/missionMap"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { TeamStrategy } from "../teamStrategy/teamStrategy"
import { BattlePhaseState } from "../orchestratorComponents/battlePhaseController"
import { SearchPath } from "../../hexMap/pathfinder/searchPath"
import { BattleCamera } from "../battleCamera"
import { Recording } from "../history/recording"
import { MissionCompletionStatus } from "../missionResult/missionCompletionStatus"
import {
    MissionStatistics,
    MissionStatisticsService,
} from "../missionStatistics/missionStatistics"
import { MissionCutsceneCollection } from "./missionCutsceneCollection"
import { CutsceneTrigger } from "../../cutscene/cutsceneTrigger"
import { MissionObjective } from "../missionResult/missionObjective"
import { NullMissionMap } from "../../utils/test/battleOrchestratorState"
import {
    BattlePhase,
    BattlePhaseService,
} from "../orchestratorComponents/battlePhaseTracker"
import { isValidValue } from "../../utils/validityCheck"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { ActionsThisRound } from "../history/actionsThisRound"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../actionDecision/battleActionDecisionStep"
import { MessageBoardListener } from "../../message/messageBoardListener"
import {
    MessageBoardBattleActionFinishesAnimation,
    MessageBoardMessage,
    MessageBoardMessageType,
} from "../../message/messageBoardMessage"
import { GameEngineState } from "../../gameEngine/gameEngine"
import {
    BattleActionQueue,
    BattleActionQueueService,
} from "../history/battleActionQueue"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SquaddieService } from "../../squaddie/squaddieService"

export enum BattleStateValidityMissingComponent {
    MISSION_MAP = "MISSION_MAP",
    TEAMS = "TEAMS",
    MISSION_OBJECTIVE = "MISSION_OBJECTIVE",
}

export interface BattleState extends MissionObjectivesAndCutscenes {
    missionId: string
    missionMap: MissionMap
    teams: BattleSquaddieTeam[]
    teamStrategiesById: { [key: string]: TeamStrategy[] }
    battlePhaseState: BattlePhaseState
    squaddieMovePath?: SearchPath
    camera: BattleCamera
    recording: Recording
    battleActionQueue: BattleActionQueue
    missionCompletionStatus: MissionCompletionStatus
    missionStatistics: MissionStatistics
    actionsThisRound: ActionsThisRound
    battleActionDecisionStep: BattleActionDecisionStep
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
    ): BattleStateValidityMissingComponent[] => {
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
        affiliation: SquaddieAffiliation
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
}

interface BattleStateConstructorParameters {
    campaignId: string
    missionId: string
    cutsceneCollection?: MissionCutsceneCollection
    cutsceneTriggers?: CutsceneTrigger[]
    objectives?: MissionObjective[]
    missionMap?: MissionMap
    camera?: BattleCamera
    battlePhaseState?: BattlePhaseState
    recording?: Recording
    teams?: BattleSquaddieTeam[]
    teamStrategiesById?: { [key: string]: TeamStrategy[] }
    missionCompletionStatus?: MissionCompletionStatus
    missionStatistics?: MissionStatistics
    searchPath?: SearchPath
    battleCompletionStatus?: BattleCompletionStatus
    actionsThisRound?: ActionsThisRound
}

const newBattleState = ({
    campaignId,
    missionId,
    objectives,
    cutsceneCollection,
    cutsceneTriggers,
    missionMap,
    camera,
    battlePhaseState,
    recording,
    missionStatistics,
    missionCompletionStatus,
    searchPath,
    battleCompletionStatus,
    teams,
    teamStrategiesById,
    actionsThisRound,
}: BattleStateConstructorParameters): BattleState => {
    const missionObjectivesAndCutscenes =
        MissionObjectivesAndCutscenesHelper.new({
            objectives,
            cutsceneCollection,
            cutsceneTriggers,
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
        recording: recording || { history: [] },
        missionStatistics:
            missionStatistics || MissionStatisticsService.new({}),
        battleCompletionStatus:
            battleCompletionStatus || BattleCompletionStatus.IN_PROGRESS,
        actionsThisRound,
        battleActionDecisionStep: undefined,
        battleActionQueue: BattleActionQueueService.new(),
    }
}

const getMissingComponents = (
    battleState: BattleState
): BattleStateValidityMissingComponent[] => {
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
        .map((str) => str as BattleStateValidityMissingComponent)
        .filter((component) => expectedComponents[component] === false)
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
            battleActionFinishesAnimation(message)
        }
    }
}

const battleActionFinishesAnimation = (
    message: MessageBoardBattleActionFinishesAnimation
) => {
    const gameEngineState: GameEngineState = message.gameEngineState

    const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            BattleActionQueueService.peek(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionQueue
            ).actor.actorBattleSquaddieId
        )
    )
    BattleActionQueueService.dequeue(
        gameEngineState.battleOrchestratorState.battleState.battleActionQueue
    )
    if (
        battleSquaddie &&
        SquaddieService.canSquaddieActRightNow({
            battleSquaddie,
            squaddieTemplate,
        }).canAct
    ) {
        gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
        })
        return
    }

    gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
        undefined
}
