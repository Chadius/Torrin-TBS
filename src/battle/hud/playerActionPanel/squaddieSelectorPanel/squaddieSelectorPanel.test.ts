import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../objectRepository"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { SquaddieTemplateService } from "../../../../campaign/squaddieTemplate"
import { SquaddieIdService } from "../../../../squaddie/id"
import { SquaddieAffiliation } from "../../../../squaddie/squaddieAffiliation"
import { SquaddieResourceService } from "../../../../squaddie/resource"
import { BattleSquaddieService } from "../../../battleSquaddie"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../../../battleSquaddieTeam"
import { GraphicsBuffer } from "../../../../utils/graphics/graphicsRenderer"
import * as mocks from "../../../../utils/test/mocks"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../../../../utils/test/mocks"
import { ResourceHandler } from "../../../../resource/resourceHandler"
import {
    SquaddieSelectorPanel,
    SquaddieSelectorPanelService,
} from "./squaddieSelectorPanel"
import { SquaddieSelectorPanelButtonService } from "./squaddieSelectorPanelButton/squaddieSelectorPanelButton"
import { getResultOrThrowError } from "../../../../utils/resultOrError"
import { SquaddieTurnService } from "../../../../squaddie/turn"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../../../actionDecision/battleActionDecisionStep"
import { MouseButton } from "../../../../utils/mouseConfig"
import { RectArea, RectAreaService } from "../../../../ui/rectArea"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../../../gameEngine/gameEngine"
import { CampaignService } from "../../../../campaign/campaign"

describe("Squaddie Selector Panel", () => {
    let objectRepository: ObjectRepository
    let graphicsContext: GraphicsBuffer
    let graphicsBufferSpies: { [key: string]: MockInstance }
    let resourceHandler: ResourceHandler

    const squaddiesToAdd = [
        {
            squaddieTemplateId: "playerSquaddieTemplate0",
            battleSquaddieId: "playerBattleSquaddieId0",
            name: "Player Squaddie 0",
            mapIconResourceKey: "playerSquaddieMapIcon0",
        },
        {
            squaddieTemplateId: "playerSquaddieTemplate1",
            battleSquaddieId: "playerBattleSquaddieId1",
            name: "Player Squaddie 1",
            mapIconResourceKey: "playerSquaddieMapIcon1",
        },
        {
            squaddieTemplateId: "playerSquaddieTemplate2",
            battleSquaddieId: "playerBattleSquaddieId2",
            name: "Player Squaddie 2",
            mapIconResourceKey: "playerSquaddieMapIcon2",
        },
        {
            squaddieTemplateId: "playerSquaddieTemplate3",
            battleSquaddieId: "playerBattleSquaddieId3",
            name: "Player Squaddie 3",
            mapIconResourceKey: "playerSquaddieMapIcon3",
        },
    ]

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()

        squaddiesToAdd.forEach(
            ({
                squaddieTemplateId,
                battleSquaddieId,
                name,
                mapIconResourceKey,
            }) => {
                const squaddieTemplate = SquaddieTemplateService.new({
                    squaddieId: SquaddieIdService.new({
                        squaddieTemplateId: squaddieTemplateId,
                        name,
                        affiliation: SquaddieAffiliation.PLAYER,
                        resources: SquaddieResourceService.new({
                            mapIconResourceKey,
                        }),
                    }),
                })
                const battleSquaddie = BattleSquaddieService.new({
                    battleSquaddieId,
                    squaddieTemplate,
                })
                ObjectRepositoryService.addSquaddie({
                    repo: objectRepository,
                    battleSquaddie,
                    squaddieTemplate,
                })
            }
        )

        graphicsContext = new MockedP5GraphicsBuffer()
        resourceHandler = mocks.mockResourceHandler(graphicsContext)
        resourceHandler.loadResource = vi
            .fn()
            .mockReturnValue({ width: 1, height: 1 })
        graphicsBufferSpies =
            MockedGraphicsBufferService.addSpies(graphicsContext)
    })

    afterEach(() => {
        MockedGraphicsBufferService.resetSpies(graphicsBufferSpies)
    })

    const createPlayerTeamWithSomeSquaddies = (
        numberOfSquaddies: number
    ): BattleSquaddieTeam => {
        const battleSquaddieIds: string[] = []
        for (
            let i = 0;
            i < numberOfSquaddies && i < squaddiesToAdd.length;
            i++
        ) {
            const battleSquaddieId = `playerBattleSquaddieId${i}`
            battleSquaddieIds.push(battleSquaddieId)
        }

        return BattleSquaddieTeamService.new({
            id: "player team",
            name: "player team",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds,
        })
    }

    it("will create one button per squaddie on the team", () => {
        const playerTeam = createPlayerTeamWithSomeSquaddies(4)
        const panelSpy = vi.spyOn(SquaddieSelectorPanelButtonService, "new")
        SquaddieSelectorPanelService.new({
            battleSquaddieIds: playerTeam.battleSquaddieIds,
            objectRepository,
        })
        expect(panelSpy).toBeCalledTimes(4)
        panelSpy.mockRestore()
    })

    describe("uncontrollable squaddie", () => {
        it("will set the button status as uncontrollable if the squaddie is out of actions", () => {
            const playerTeam = createPlayerTeamWithSomeSquaddies(2)
            const { battleSquaddie: battleSquaddieWithoutActions } =
                getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        objectRepository,
                        "playerBattleSquaddieId0"
                    )
                )

            SquaddieTurnService.endTurn(
                battleSquaddieWithoutActions.squaddieTurn
            )

            const panel = SquaddieSelectorPanelService.new({
                battleSquaddieIds: playerTeam.battleSquaddieIds,
                objectRepository,
            })

            expect(
                SquaddieSelectorPanelButtonService.getStatus(panel.buttons[0]!)
                    .squaddieIsControllable
            ).toBe(false)
            expect(
                SquaddieSelectorPanelButtonService.getStatus(panel.buttons[1])
                    .squaddieIsControllable
            ).toBe(true)
        })
    })

    describe("selected squaddie", () => {
        it("will set the button status as selected if the player selected a squaddie and is figuring out their turn", () => {
            const playerTeam = createPlayerTeamWithSomeSquaddies(2)

            const battleActionDecisionStep: BattleActionDecisionStep =
                BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: battleActionDecisionStep,
                battleSquaddieId: "playerBattleSquaddieId0",
            })

            const panel = SquaddieSelectorPanelService.new({
                battleSquaddieIds: playerTeam.battleSquaddieIds,
                objectRepository,
                battleActionDecisionStep,
            })

            expect(
                SquaddieSelectorPanelButtonService.getStatus(panel.buttons[0]!)
                    .squaddieIsSelected
            ).toBe(true)
            expect(
                SquaddieSelectorPanelButtonService.getStatus(panel.buttons[1])
                    .squaddieIsSelected
            ).toBe(false)
        })
        it("will change the selected button if a different one is chosen", () => {
            const playerTeam = createPlayerTeamWithSomeSquaddies(2)
            const panel = SquaddieSelectorPanelService.new({
                battleSquaddieIds: playerTeam.battleSquaddieIds,
                objectRepository,
            })
            SquaddieSelectorPanelService.selectSquaddie(
                panel,
                "playerBattleSquaddieId0"
            )
            expect(
                SquaddieSelectorPanelButtonService.getStatus(panel.buttons[0]!)
                    .squaddieIsSelected
            ).toBe(true)
            expect(
                SquaddieSelectorPanelButtonService.getStatus(panel.buttons[1])
                    .squaddieIsSelected
            ).toBe(false)

            SquaddieSelectorPanelService.selectSquaddie(
                panel,
                "playerBattleSquaddieId1"
            )
            expect(
                SquaddieSelectorPanelButtonService.getStatus(panel.buttons[0]!)
                    .squaddieIsSelected
            ).toBe(false)
            expect(
                SquaddieSelectorPanelButtonService.getStatus(panel.buttons[1])
                    .squaddieIsSelected
            ).toBe(true)

            SquaddieSelectorPanelService.selectSquaddie(
                panel,
                "squaddieIsNotOnThisTeam"
            )
            expect(
                SquaddieSelectorPanelButtonService.getStatus(panel.buttons[0]!)
                    .squaddieIsSelected
            ).toBe(false)
            expect(
                SquaddieSelectorPanelButtonService.getStatus(panel.buttons[1])
                    .squaddieIsSelected
            ).toBe(false)
        })
    })

    describe("drawing a panel", () => {
        it("will draw one button for each squaddie", () => {
            const playerTeam = createPlayerTeamWithSomeSquaddies(3)
            const panel = SquaddieSelectorPanelService.new({
                battleSquaddieIds: playerTeam.battleSquaddieIds,
                objectRepository,
            })
            const drawSpy = vi.spyOn(SquaddieSelectorPanelButtonService, "draw")
            SquaddieSelectorPanelService.draw({
                squaddieSelectorPanel: panel,
                objectRepository,
                graphicsContext,
                resourceHandler,
            })
            expect(drawSpy).toHaveBeenCalledTimes(3)
            expect(
                SquaddieSelectorPanelButtonService.getBattleSquaddieId(
                    drawSpy.mock.calls[0][0].button
                )
            ).toEqual("playerBattleSquaddieId0")
            expect(
                SquaddieSelectorPanelButtonService.getBattleSquaddieId(
                    drawSpy.mock.calls[1][0].button
                )
            ).toEqual("playerBattleSquaddieId1")
            expect(
                SquaddieSelectorPanelButtonService.getBattleSquaddieId(
                    drawSpy.mock.calls[2][0].button
                )
            ).toEqual("playerBattleSquaddieId2")
            drawSpy.mockRestore()
        })
        it("will update each button's controllability status", () => {
            const playerTeam = createPlayerTeamWithSomeSquaddies(3)
            const panel = SquaddieSelectorPanelService.new({
                battleSquaddieIds: playerTeam.battleSquaddieIds,
                objectRepository,
            })

            SquaddieSelectorPanelService.draw({
                squaddieSelectorPanel: panel,
                objectRepository,
                graphicsContext,
                resourceHandler,
            })
            expect(panel.buttons[0]!.data.context!.battleSquaddieId).toBe(
                "playerBattleSquaddieId0"
            )
            expect(
                SquaddieSelectorPanelButtonService.getStatus(panel.buttons[0]!)
                    .squaddieIsControllable
            ).toBeTruthy()
            const { battleSquaddie: battleSquaddieWithoutActions } =
                getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        objectRepository,
                        "playerBattleSquaddieId0"
                    )
                )

            SquaddieTurnService.endTurn(
                battleSquaddieWithoutActions.squaddieTurn
            )

            SquaddieSelectorPanelService.draw({
                squaddieSelectorPanel: panel,
                objectRepository,
                graphicsContext,
                resourceHandler,
            })
            expect(
                SquaddieSelectorPanelButtonService.getStatus(panel.buttons[0]!)
                    .squaddieIsControllable
            ).toBeFalsy()
        })
    })

    describe("clicking on the panel", () => {
        let playerTeam: BattleSquaddieTeam
        let panel: SquaddieSelectorPanel
        let gameEngineState: GameEngineState
        let messageSpy: MockInstance

        const getRectangleAreaForButton = (
            panel: SquaddieSelectorPanel,
            squaddieIndex: number
        ): RectArea => {
            const button = panel.buttons.find(
                (button) => button.data.context!.squaddieIndex === squaddieIndex
            )
            expect(button).not.toBeUndefined()
            if (button != undefined) return button?.data.uiObjects!.drawingArea
            throw new Error("button is undefined")
        }

        beforeEach(() => {
            playerTeam = createPlayerTeamWithSomeSquaddies(3)
            panel = SquaddieSelectorPanelService.new({
                battleSquaddieIds: playerTeam.battleSquaddieIds,
                objectRepository,
            })
            SquaddieSelectorPanelService.draw({
                squaddieSelectorPanel: panel,
                objectRepository,
                resourceHandler,
                graphicsContext,
            })
            gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default(),
            })
            messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")
        })

        afterEach(() => {
            messageSpy.mockRestore()
        })

        it("knows what button it would click on", () => {
            const buttonArea = getRectangleAreaForButton(panel, 0)
            expect(
                SquaddieSelectorPanelService.getClickedButton(panel, {
                    button: MouseButton.ACCEPT,
                    x: RectAreaService.centerX(buttonArea),
                    y: RectAreaService.centerY(buttonArea),
                })
            ).toEqual(panel.buttons[0])
        })
    })
})
