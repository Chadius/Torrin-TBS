import { BattleHUDService } from "../hud/battleHUD/battleHUD"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../battleState/battleState"
import {
    BattlePhase,
    BattlePhaseService,
    TBattlePhase,
} from "../orchestratorComponents/battlePhaseTracker"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { TSquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleSquaddieService } from "../battleSquaddie"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { SquaddieTurnService } from "../../squaddie/turn"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { SquaddieService } from "../../squaddie/squaddieService"
import { SquaddiePhaseListener } from "./squaddiePhaseListener"
import {
    AttributeModifierService,
    AttributeSource,
} from "../../squaddie/attribute/attributeModifier"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { Attribute } from "../../squaddie/attribute/attribute"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngineState/gameEngineState"

describe("squaddie phase starts", () => {
    let squaddiePhaseListener: SquaddiePhaseListener
    let gameEngineState: GameEngineState
    let repository: ObjectRepository
    let getImageUISpy: MockInstance

    const addListenerToGameState = (gameEngineState: GameEngineState) => {
        squaddiePhaseListener = new SquaddiePhaseListener(
            "squaddiePhaseListener"
        )
        gameEngineState.messageBoard.addListener(
            squaddiePhaseListener,
            MessageBoardMessageType.SQUADDIE_PHASE_STARTS
        )
    }

    const createTeamOfTwo = (
        affiliation: TSquaddieAffiliation
    ): BattleSquaddieTeam => {
        const { squaddieTemplate } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: affiliation,
                affiliation: affiliation,
                templateId: `${affiliation} template`,
                objectRepository: repository,
                battleId: `${affiliation} 1`,
                actionTemplateIds: [],
            })

        ObjectRepositoryService.addBattleSquaddie(
            repository,
            BattleSquaddieService.newBattleSquaddie({
                squaddieTemplate: squaddieTemplate,
                battleSquaddieId: `${affiliation} 2`,
            })
        )

        return BattleSquaddieTeamService.new({
            id: `${affiliation} team`,
            name: `${affiliation} team`,
            affiliation: affiliation,
            battleSquaddieIds: [`${affiliation} 1`, `${affiliation} 2`],
        })
    }

    const createGameEngineStateWithTeamsAndPhase = (
        teams: BattleSquaddieTeam[],
        startingBattlePhase: TBattlePhase
    ): GameEngineState => {
        return GameEngineStateService.new({
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleHUD: BattleHUDService.new({}),
                battleState: BattleStateService.new({
                    battlePhaseState: {
                        currentAffiliation: startingBattlePhase,
                        turnCount: 0,
                    },
                    teams: teams,
                    missionId: "missionId",
                    campaignId: "test campaign",
                }),
            }),
            repository,
        })
    }

    beforeEach(() => {
        repository = ObjectRepositoryService.new()
        getImageUISpy = vi
            .spyOn(ObjectRepositoryService, "getImageUIByBattleSquaddieId")
            .mockReturnValue(undefined)
    })

    afterEach(() => {
        getImageUISpy.mockRestore()
    })

    describe("renew the turn for each squaddie of the starting team", () => {
        const tests = [
            BattlePhase.PLAYER,
            BattlePhase.ENEMY,
            BattlePhase.ALLY,
            BattlePhase.NONE,
        ]

        it.each(tests)(`phase`, (phase) => {
            const affiliation =
                BattlePhaseService.ConvertBattlePhaseToSquaddieAffiliation(
                    phase
                )
            const team = createTeamOfTwo(affiliation)

            gameEngineState = createGameEngineStateWithTeamsAndPhase(
                [team],
                phase
            )
            addListenerToGameState(gameEngineState)

            team.battleSquaddieIds.forEach((battleSquaddieId) => {
                const { battleSquaddie } =
                    ObjectRepositoryService.getSquaddieByBattleId(
                        gameEngineState.repository!,
                        battleSquaddieId
                    )

                SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)
            })

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SQUADDIE_PHASE_STARTS,
                repository: gameEngineState.repository,
                battleState:
                    gameEngineState.battleOrchestratorState.battleState,
                teams: gameEngineState.battleOrchestratorState.battleState
                    .teams,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                camera: gameEngineState.battleOrchestratorState.battleState
                    .camera,
                phase,
            })

            expect(
                team.battleSquaddieIds.every((battleSquaddieId) => {
                    const { battleSquaddie, squaddieTemplate } =
                        ObjectRepositoryService.getSquaddieByBattleId(
                            gameEngineState.repository!,
                            battleSquaddieId
                        )

                    return SquaddieService.canSquaddieActRightNow({
                        squaddieTemplate,
                        battleSquaddie,
                    }).canAct
                })
            ).toBeTruthy()
        })
    })

    describe("reduce cooldown for all used abilities on the team", () => {
        const tests = [
            BattlePhase.PLAYER,
            BattlePhase.ENEMY,
            BattlePhase.ALLY,
            BattlePhase.NONE,
        ]

        it.each(tests)(`phase`, (phase) => {
            const affiliation =
                BattlePhaseService.ConvertBattlePhaseToSquaddieAffiliation(
                    phase
                )
            const team = createTeamOfTwo(affiliation)

            gameEngineState = createGameEngineStateWithTeamsAndPhase(
                [team],
                phase
            )
            addListenerToGameState(gameEngineState)

            team.battleSquaddieIds.forEach((battleSquaddieId) => {
                const { battleSquaddie } =
                    ObjectRepositoryService.getSquaddieByBattleId(
                        gameEngineState.repository!,
                        battleSquaddieId
                    )

                InBattleAttributesService.addActionCooldown({
                    inBattleAttributes: battleSquaddie.inBattleAttributes,
                    actionTemplateId: "3 turns cooldown",
                    numberOfCooldownTurns: 3,
                })
            })

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SQUADDIE_PHASE_STARTS,
                repository: gameEngineState.repository,
                battleState:
                    gameEngineState.battleOrchestratorState.battleState,
                teams: gameEngineState.battleOrchestratorState.battleState
                    .teams,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                camera: gameEngineState.battleOrchestratorState.battleState
                    .camera,
                phase,
            })

            expect(
                team.battleSquaddieIds.every((battleSquaddieId) => {
                    const { battleSquaddie } =
                        ObjectRepositoryService.getSquaddieByBattleId(
                            gameEngineState.repository!,
                            battleSquaddieId
                        )

                    return (
                        InBattleAttributesService.getActionTurnsOfCooldown({
                            inBattleAttributes:
                                battleSquaddie.inBattleAttributes,
                            actionTemplateId: "3 turns cooldown",
                        }) == 2
                    )
                })
            ).toBeTruthy()
        })
    })

    it("decreases the attribute modifier durations at the start of the phase they were used", () => {
        const affiliation =
            BattlePhaseService.ConvertBattlePhaseToSquaddieAffiliation(
                BattlePhase.PLAYER
            )
        const team = createTeamOfTwo(affiliation)

        gameEngineState = createGameEngineStateWithTeamsAndPhase(
            [team],
            BattlePhase.PLAYER
        )
        addListenerToGameState(gameEngineState)

        team.battleSquaddieIds.forEach((battleSquaddieId, index) => {
            const { battleSquaddie } =
                ObjectRepositoryService.getSquaddieByBattleId(
                    gameEngineState.repository!,
                    battleSquaddieId
                )

            const armorModifierAddedDuringPlayerPhase =
                AttributeModifierService.new({
                    type: Attribute.ARMOR,
                    source: AttributeSource.CIRCUMSTANCE,
                    amount: 1,
                    duration: index + 1,
                    description:
                        "Player Phase Armor, first squaddie expires immediately, second squaddie will last another round",
                })

            InBattleAttributesService.addActiveAttributeModifier(
                battleSquaddie.inBattleAttributes,
                armorModifierAddedDuringPlayerPhase
            )
        })

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.SQUADDIE_PHASE_STARTS,
            repository: gameEngineState.repository,
            battleState: gameEngineState.battleOrchestratorState.battleState,
            teams: gameEngineState.battleOrchestratorState.battleState.teams,
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            camera: gameEngineState.battleOrchestratorState.battleState.camera,
            phase: BattlePhase.PLAYER,
        })

        const { battleSquaddie: squaddieWithExpiredArmorModifier } =
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository!,
                team.battleSquaddieIds[0]
            )

        const { battleSquaddie: squaddieWithActiveArmorModifier } =
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository!,
                team.battleSquaddieIds[1]
            )

        expect(
            InBattleAttributesService.getAllActiveAttributeModifiers(
                squaddieWithExpiredArmorModifier.inBattleAttributes
            )
        ).toHaveLength(0)
        expect(
            squaddieWithExpiredArmorModifier.inBattleAttributes
                .attributeModifiers
        ).toHaveLength(0)

        expect(
            InBattleAttributesService.getAllActiveAttributeModifiers(
                squaddieWithActiveArmorModifier.inBattleAttributes
            )
        ).toHaveLength(1)
        expect(
            InBattleAttributesService.getAllActiveAttributeModifiers(
                squaddieWithActiveArmorModifier.inBattleAttributes
            )[0]
        ).toEqual(
            expect.objectContaining({
                type: Attribute.ARMOR,
                duration: 1,
            })
        )
        expect(
            squaddieWithActiveArmorModifier.inBattleAttributes
                .attributeModifiers
        ).toHaveLength(1)

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.SQUADDIE_PHASE_STARTS,
            repository: gameEngineState.repository,
            battleState: gameEngineState.battleOrchestratorState.battleState,
            teams: gameEngineState.battleOrchestratorState.battleState.teams,
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            camera: gameEngineState.battleOrchestratorState.battleState.camera,
            phase: BattlePhase.PLAYER,
        })
        expect(
            InBattleAttributesService.getAllActiveAttributeModifiers(
                squaddieWithActiveArmorModifier.inBattleAttributes
            )
        ).toHaveLength(0)
        expect(
            squaddieWithActiveArmorModifier.inBattleAttributes
                .attributeModifiers
        ).toHaveLength(0)
    })
})
