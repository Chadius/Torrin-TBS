import { BattleHUDService } from "../hud/battleHUD"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../orchestrator/battleState"
import {
    BattlePhase,
    BattlePhaseService,
} from "../orchestratorComponents/battlePhaseTracker"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleSquaddieService } from "../battleSquaddie"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { SquaddieTurnService } from "../../squaddie/turn"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { SquaddieService } from "../../squaddie/squaddieService"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SquaddiePhaseListener } from "./squaddiePhaseListener"
import {
    AttributeModifierService,
    AttributeSource,
    AttributeType,
} from "../../squaddie/attributeModifier"
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
        affiliation: SquaddieAffiliation
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
        startingBattlePhase: BattlePhase
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
                const { battleSquaddie } = getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        gameEngineState.repository,
                        battleSquaddieId
                    )
                )
                SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)
            })

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SQUADDIE_PHASE_STARTS,
                gameEngineState: gameEngineState,
                phase,
            })

            expect(
                team.battleSquaddieIds.every((battleSquaddieId) => {
                    const { battleSquaddie, squaddieTemplate } =
                        getResultOrThrowError(
                            ObjectRepositoryService.getSquaddieByBattleId(
                                gameEngineState.repository,
                                battleSquaddieId
                            )
                        )

                    return SquaddieService.canSquaddieActRightNow({
                        squaddieTemplate,
                        battleSquaddie,
                    }).canAct
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
            const { battleSquaddie } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    gameEngineState.repository,
                    battleSquaddieId
                )
            )

            const armorModifierAddedDuringPlayerPhase =
                AttributeModifierService.new({
                    type: AttributeType.ARMOR,
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
            gameEngineState: gameEngineState,
            phase: BattlePhase.PLAYER,
        })

        const { battleSquaddie: squaddieWithExpiredArmorModifier } =
            getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    gameEngineState.repository,
                    team.battleSquaddieIds[0]
                )
            )
        const { battleSquaddie: squaddieWithActiveArmorModifier } =
            getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    gameEngineState.repository,
                    team.battleSquaddieIds[1]
                )
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
                type: AttributeType.ARMOR,
                duration: 1,
            })
        )
        expect(
            squaddieWithActiveArmorModifier.inBattleAttributes
                .attributeModifiers
        ).toHaveLength(1)

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.SQUADDIE_PHASE_STARTS,
            gameEngineState: gameEngineState,
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
