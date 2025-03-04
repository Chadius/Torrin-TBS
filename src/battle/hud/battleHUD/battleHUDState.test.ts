import { BattleHUDState, BattleHUDStateService } from "./battleHUDState"
import { SummaryHUDStateService } from "../summary/summaryHUD"
import { beforeEach, describe, expect, it } from "vitest"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { SquaddieRepositoryService } from "../../../utils/test/squaddie"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../../battleSquaddieTeam"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../../hexMap/terrainTileMap"
import { getResultOrThrowError } from "../../../utils/ResultOrError"
import { SquaddieTurnService } from "../../../squaddie/turn"
import { SquaddieSelectorPanelService } from "../playerActionPanel/squaddieSelectorPanel/squaddieSelectorPanel"
import { BattleActionDecisionStepService } from "../../actionDecision/battleActionDecisionStep"

describe("BattleHUDState", () => {
    it("can be initialized with default fields", () => {
        const battleHUDState: BattleHUDState = BattleHUDStateService.new({})
        expect(battleHUDState.summaryHUDState).toBeUndefined()
        expect(battleHUDState.squaddieSelectorPanel).toBeUndefined()
    })
    it("can be cloned", () => {
        const battleHUDState: BattleHUDState = BattleHUDStateService.new({
            summaryHUDState: SummaryHUDStateService.new(),
        })

        const clone = BattleHUDStateService.clone(battleHUDState)

        expect(clone).toEqual(battleHUDState)
    })

    describe("getting the next squaddie", () => {
        let objectRepository: ObjectRepository
        let missionMap: MissionMap
        let playerTeam: BattleSquaddieTeam
        let battleHUDState: BattleHUDState

        beforeEach(() => {
            objectRepository = ObjectRepositoryService.new()
            missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 1 "],
                }),
            })
            playerTeam = BattleSquaddieTeamService.new({
                id: "playerTeamId",
                name: "player controlled team",
                affiliation: SquaddieAffiliation.PLAYER,
                battleSquaddieIds: [],
                iconResourceKey: "icon_player_team",
            })
            ;["playerSquaddie0", "playerSquaddie1", "playerSquaddie2"].forEach(
                (battleSquaddieId, index) => {
                    SquaddieRepositoryService.createNewSquaddieAndAddToRepository(
                        {
                            name: battleSquaddieId,
                            templateId: "player_soldier",
                            battleId: battleSquaddieId,
                            affiliation: SquaddieAffiliation.PLAYER,
                            objectRepository,
                            actionTemplateIds: [],
                        }
                    )
                    BattleSquaddieTeamService.addBattleSquaddieIds(playerTeam, [
                        battleSquaddieId,
                    ])
                    MissionMapService.addSquaddie({
                        missionMap: missionMap,
                        squaddieTemplateId: "player_soldier",
                        battleSquaddieId: battleSquaddieId,
                        coordinate: { q: 0, r: index },
                    })
                }
            )
            const battleActionDecisionStep =
                BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: battleActionDecisionStep,
                battleSquaddieId: "playerSquaddie0",
            })
            battleHUDState = BattleHUDStateService.new({})
            BattleHUDStateService.resetSquaddieListingForTeam({
                battleHUDState,
                team: playerTeam,
                objectRepository,
                battleActionDecisionStep,
            })
        })

        it("can be initialized with a given squaddie team", () => {
            expect(battleHUDState.squaddieListing.teamId).toEqual(playerTeam.id)
            expect(battleHUDState.squaddieListing.currentIndex).toEqual(0)
            expect(battleHUDState.squaddieListing.battleSquaddieIds).toEqual([
                ...playerTeam.battleSquaddieIds,
            ])
            expect(battleHUDState.squaddieSelectorPanel).not.toBeUndefined()
            expect(battleHUDState.squaddieSelectorPanel.buttons).toHaveLength(
                playerTeam.battleSquaddieIds.length
            )
        })

        it("knows to iterate through the squaddies and repeat when it runs out", () => {
            expect(
                BattleHUDStateService.getNextSquaddieId({
                    battleHUDState,
                    objectRepository,
                    missionMap,
                })
            ).toEqual("playerSquaddie0")
            expect(
                SquaddieSelectorPanelService.getSelectedBattleSquaddieId(
                    battleHUDState.squaddieSelectorPanel
                )
            ).toBe("playerSquaddie0")

            expect(
                BattleHUDStateService.getNextSquaddieId({
                    battleHUDState,
                    objectRepository,
                    missionMap,
                })
            ).toEqual("playerSquaddie1")
            expect(
                SquaddieSelectorPanelService.getSelectedBattleSquaddieId(
                    battleHUDState.squaddieSelectorPanel
                )
            ).toBe("playerSquaddie1")

            expect(
                BattleHUDStateService.getNextSquaddieId({
                    battleHUDState,
                    objectRepository,
                    missionMap,
                })
            ).toEqual("playerSquaddie2")
            expect(
                SquaddieSelectorPanelService.getSelectedBattleSquaddieId(
                    battleHUDState.squaddieSelectorPanel
                )
            ).toBe("playerSquaddie2")

            expect(
                BattleHUDStateService.getNextSquaddieId({
                    battleHUDState,
                    objectRepository,
                    missionMap,
                })
            ).toEqual("playerSquaddie0")
            expect(
                SquaddieSelectorPanelService.getSelectedBattleSquaddieId(
                    battleHUDState.squaddieSelectorPanel
                )
            ).toBe("playerSquaddie0")
        })

        it("skips the currently selected squaddie", () => {
            expect(
                BattleHUDStateService.getNextSquaddieId({
                    battleHUDState,
                    objectRepository,
                    missionMap,
                    selectedBattleSquaddieId: "playerSquaddie0",
                })
            ).toEqual("playerSquaddie1")
        })

        it("skips any squaddie who took their turn", () => {
            const { battleSquaddie } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    "playerSquaddie0"
                )
            )

            SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)
            expect(
                BattleHUDStateService.getNextSquaddieId({
                    battleHUDState,
                    objectRepository,
                    missionMap,
                })
            ).toEqual("playerSquaddie1")
        })

        it("skips any dead squaddies", () => {
            const { battleSquaddie } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    "playerSquaddie1"
                )
            )

            battleSquaddie.inBattleAttributes.currentHitPoints = 0

            expect(
                BattleHUDStateService.getNextSquaddieId({
                    battleHUDState,
                    objectRepository,
                    missionMap,
                })
            ).toEqual("playerSquaddie0")
            expect(
                BattleHUDStateService.getNextSquaddieId({
                    battleHUDState,
                    objectRepository,
                    missionMap,
                })
            ).toEqual("playerSquaddie2")
        })

        it("skips any offscreen squaddies", () => {
            MissionMapService.updateBattleSquaddieCoordinate(
                missionMap,
                "playerSquaddie2",
                undefined
            )

            expect(
                BattleHUDStateService.getNextSquaddieId({
                    battleHUDState,
                    objectRepository,
                    missionMap,
                })
            ).toEqual("playerSquaddie0")
            expect(
                BattleHUDStateService.getNextSquaddieId({
                    battleHUDState,
                    objectRepository,
                    missionMap,
                })
            ).toEqual("playerSquaddie1")
            expect(
                BattleHUDStateService.getNextSquaddieId({
                    battleHUDState,
                    objectRepository,
                    missionMap,
                })
            ).toEqual("playerSquaddie0")
        })

        it("if no squaddies are available, returns undefined", () => {
            playerTeam.battleSquaddieIds.forEach((battleSquaddieId) => {
                const { battleSquaddie } = getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        objectRepository,
                        battleSquaddieId
                    )
                )

                SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)
            })
            expect(
                BattleHUDStateService.getNextSquaddieId({
                    battleHUDState,
                    objectRepository,
                    missionMap,
                })
            ).toBeUndefined()
            expect(
                SquaddieSelectorPanelService.getSelectedBattleSquaddieId(
                    battleHUDState.squaddieSelectorPanel
                )
            ).toBeUndefined()
        })
    })
})
