import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
} from "vitest"
import { DebugModeMenu, DebugModeMenuService } from "./debugModeMenu"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../../../utils/test/mocks"
import { MouseButton } from "../../../utils/mouseConfig"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { SquaddieRepositoryService } from "../../../utils/test/squaddie"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { Damage, SquaddieService } from "../../../squaddie/squaddieService"
import { InBattleAttributesService } from "../../stats/inBattleAttributes"

describe("Debug Mode Menu", () => {
    let debugModeMenu: DebugModeMenu
    let graphicsContext: GraphicsBuffer
    let graphicsBufferSpies: { [key: string]: MockInstance }
    let repository: ObjectRepository

    beforeEach(() => {
        graphicsContext = new MockedP5GraphicsBuffer()
        graphicsBufferSpies =
            MockedGraphicsBufferService.addSpies(graphicsContext)
        repository = ObjectRepositoryService.new()
    })

    afterEach(() => {
        MockedGraphicsBufferService.resetSpies(graphicsBufferSpies)
    })

    it("will try to draw a title", () => {
        debugModeMenu = DebugModeMenuService.new()
        DebugModeMenuService.draw({ debugModeMenu, graphicsContext })
        expect(graphicsBufferSpies["text"]).toBeCalledWith(
            "DEBUG MODE",
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything()
        )
    })

    describe("clicking on menu button", () => {
        beforeEach(() => {
            debugModeMenu = DebugModeMenuService.new()
            DebugModeMenuService.draw({ debugModeMenu, graphicsContext })
            clickOnDebugModeToggle(debugModeMenu, repository)
        })
        it("should open the menu when clicked", () => {
            DebugModeMenuService.draw({ debugModeMenu, graphicsContext })
            expect(debugModeMenu.data.getContext().isMenuOpen).toBeTruthy()
        })
        it("should close the menu when the button is clicked again", () => {
            clickOnDebugModeToggle(debugModeMenu, repository)
            DebugModeMenuService.draw({ debugModeMenu, graphicsContext })
            expect(debugModeMenu.data.getContext().isMenuOpen).toBeFalsy()
        })
    })
    describe("override offensive behavior", () => {
        beforeEach(() => {
            debugModeMenu = DebugModeMenuService.new()
            DebugModeMenuService.draw({ debugModeMenu, graphicsContext })
            clickOnDebugModeToggle(debugModeMenu, repository)
            DebugModeMenuService.draw({ debugModeMenu, graphicsContext })
        })
        it("by default override is off", () => {
            expect(
                DebugModeMenuService.getDebugModeFlags(debugModeMenu)
                    .behaviorOverrides
            ).toEqual(
                expect.objectContaining({
                    noActions: false,
                })
            )
        })
        it("should export the flag when clicked", () => {
            clickOnBehaviorOverrideToggleNoActionButton(
                debugModeMenu,
                repository
            )
            expect(
                DebugModeMenuService.getDebugModeFlags(debugModeMenu)
                    .behaviorOverrides
            ).toEqual(
                expect.objectContaining({
                    noActions: true,
                })
            )
        })
    })
    describe("reduce all HP to 1", () => {
        beforeEach(() => {
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "player0",
                battleId: "player0",
                templateId: "player0",
                actionTemplateIds: [],
                affiliation: SquaddieAffiliation.PLAYER,
                objectRepository: repository,
            })
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "enemy0",
                battleId: "enemy0",
                templateId: "enemy0",
                actionTemplateIds: [],
                affiliation: SquaddieAffiliation.ENEMY,
                objectRepository: repository,
            })
            debugModeMenu = DebugModeMenuService.new()
            DebugModeMenuService.draw({ debugModeMenu, graphicsContext })
            clickOnDebugModeToggle(debugModeMenu, repository)
            DebugModeMenuService.draw({ debugModeMenu, graphicsContext })
        })
        it("reduces all living squaddies HP to 1 upon clicking", () => {
            const {
                battleSquaddie: enemyBattleSquaddie,
                squaddieTemplate: enemySquaddieTemplate,
            } = ObjectRepositoryService.getSquaddieByBattleId(
                repository,
                "enemy0"
            )
            InBattleAttributesService.takeDamage({
                inBattleAttributes: enemyBattleSquaddie.inBattleAttributes,
                damageToTake: 9001,
                damageType: Damage.UNKNOWN,
            })
            expect(
                SquaddieService.canSquaddieActRightNow({
                    squaddieTemplate: enemySquaddieTemplate,
                    battleSquaddie: enemyBattleSquaddie,
                }).isDead
            ).toBeTruthy()

            const {
                battleSquaddie: playerBattleSquaddie,
                squaddieTemplate: playerSquaddieTemplate,
            } = ObjectRepositoryService.getSquaddieByBattleId(
                repository,
                "player0"
            )
            expect(
                SquaddieService.canSquaddieActRightNow({
                    squaddieTemplate: playerSquaddieTemplate,
                    battleSquaddie: playerBattleSquaddie,
                }).isDead
            ).toBeFalsy()

            const reduceHPButton =
                debugModeMenu.data.getUIObjects().reduceSquaddiesTo1HPButton
            expect(reduceHPButton).toBeDefined()
            clickOnButton(
                debugModeMenu,
                reduceHPButton!.rectangle.area,
                repository
            )

            const {
                battleSquaddie: enemyBattleSquaddieAfterClicking,
                squaddieTemplate: enemySquaddieTemplateAfterClicking,
            } = ObjectRepositoryService.getSquaddieByBattleId(
                repository,
                "enemy0"
            )
            expect(
                SquaddieService.canSquaddieActRightNow({
                    squaddieTemplate: enemySquaddieTemplateAfterClicking,
                    battleSquaddie: enemyBattleSquaddieAfterClicking,
                }).isDead
            ).toBeTruthy()

            const {
                battleSquaddie: playerBattleSquaddieAfterClicking,
                squaddieTemplate: playerSquaddieTemplateAfterClicking,
            } = ObjectRepositoryService.getSquaddieByBattleId(
                repository,
                "player0"
            )
            expect(
                SquaddieService.canSquaddieActRightNow({
                    squaddieTemplate: playerSquaddieTemplateAfterClicking,
                    battleSquaddie: playerBattleSquaddieAfterClicking,
                }).isDead
            ).toBeFalsy()
            expect(
                playerBattleSquaddieAfterClicking.inBattleAttributes
                    .currentHitPoints
            ).toBe(1)
        })
    })
})

const clickOnDebugModeToggle = (
    debugModeMenu: DebugModeMenu,
    repository: ObjectRepository
) => {
    clickOnButton(
        debugModeMenu,
        debugModeMenu.data.getUIObjects().toggleMenuButton!.getArea(),
        repository
    )
}

const clickOnBehaviorOverrideToggleNoActionButton = (
    debugModeMenu: DebugModeMenu,
    repository: ObjectRepository
) => {
    clickOnButton(
        debugModeMenu,
        debugModeMenu.data
            .getUIObjects()
            .behaviorOverrideToggleNoActionButton!.getArea(),
        repository
    )
}

const clickOnButton = (
    debugModeMenu: DebugModeMenu,
    buttonArea: RectArea,
    repository: ObjectRepository
) => {
    DebugModeMenuService.mousePressed({
        debugModeMenu,
        mousePress: {
            button: MouseButton.ACCEPT,
            x: RectAreaService.centerX(buttonArea),
            y: RectAreaService.centerY(buttonArea),
        },
    })
    DebugModeMenuService.mouseReleased({
        debugModeMenu,
        mouseRelease: {
            button: MouseButton.ACCEPT,
            x: RectAreaService.centerX(buttonArea),
            y: RectAreaService.centerY(buttonArea),
        },
        repository,
    })
}
