import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleSquaddieTarget} from "./battleSquaddieTarget";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {SquaddieActivity} from "../../squaddie/activity";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieId} from "../../squaddie/id";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {NullArmyAttributes} from "../../squaddie/armyAttributes";
import {SquaddieTurn} from "../../squaddie/turn";
import {MissionMap} from "../../missionMap/missionMap";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {OrchestratorState} from "../orchestrator/orchestratorState";
import {SquaddieInstruction} from "../history/squaddieInstruction";
import {BattleCamera} from "../battleCamera";
import {
    convertMapCoordinatesToScreenCoordinates,
    convertMapCoordinatesToWorldCoordinates
} from "../../hexMap/convertCoordinates";
import {HighlightPulseRedColor} from "../../hexMap/hexDrawingUtils";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {ScreenDimensions} from "../../utils/graphicsConfig";
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/orchestratorComponent";
import {BattleOrchestratorMode} from "../orchestrator/orchestrator";
import {SquaddieSquaddieActivity} from "../history/squaddieSquaddieActivity";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import {ResourceHandler} from "../../resource/resourceHandler";
import {stubImmediateLoader} from "../../resource/resourceHandlerTestUtils";
import {makeResult} from "../../utils/ResultOrError";
import {ImageUI} from "../../ui/imageUI";
import * as mocks from "../../utils/test/mocks";

describe('BattleSquaddieTarget', () => {
    let squaddieRepo: BattleSquaddieRepository = new BattleSquaddieRepository();
    let targetComponent: BattleSquaddieTarget;
    let knightStatic: BattleSquaddieStatic;
    let knightDynamic: BattleSquaddieDynamic;
    let thiefStatic: BattleSquaddieStatic;
    let thiefDynamic: BattleSquaddieDynamic;
    let battleMap: MissionMap;
    let longswordActivity: SquaddieActivity;
    let powerAttackLongswordActivity: SquaddieActivity;
    let state: OrchestratorState;
    let camera: BattleCamera;
    let mockResourceHandler: jest.Mocked<ResourceHandler>;
    let mockedP5 = mocks.mockedP5();

    beforeEach(() => {
        mockedP5 = mocks.mockedP5();
        targetComponent = new BattleSquaddieTarget();
        squaddieRepo = new BattleSquaddieRepository();
        battleMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 1 ",
                    " 1 1 1 ",
                    "  1 1 1 ",
                ]
            })
        });

        longswordActivity = new SquaddieActivity({
            name: "longsword",
            id: "longsword",
            traits: new TraitStatusStorage({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }).filterCategory(TraitCategory.ACTIVITY),
            minimumRange: 1,
            maximumRange: 1,
            actionsToSpend: 1,
        });

        powerAttackLongswordActivity = new SquaddieActivity({
            name: "power attack longsword",
            id: "powerAttackLongsword",
            traits: new TraitStatusStorage({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }).filterCategory(TraitCategory.ACTIVITY),
            minimumRange: 1,
            maximumRange: 1,
            actionsToSpend: 3,
        });

        knightStatic = new BattleSquaddieStatic({
            squaddieId: new SquaddieId({
                name: "Knight",
                staticId: "Knight",
                affiliation: SquaddieAffiliation.PLAYER,
            }),
            activities: [longswordActivity],
            attributes: NullArmyAttributes(),
        });

        knightDynamic = new BattleSquaddieDynamic({
            staticSquaddie: knightStatic,
            dynamicSquaddieId: "Knight 0",
            squaddieTurn: new SquaddieTurn(),
            mapIcon: new (<new (options: any) => ImageUI>ImageUI)({}) as jest.Mocked<ImageUI>,
        });

        squaddieRepo.addSquaddie(knightStatic, knightDynamic);
        battleMap.addSquaddie(knightStatic.staticId, knightDynamic.dynamicSquaddieId, new HexCoordinate({q: 1, r: 1}));

        thiefStatic = new BattleSquaddieStatic({
            squaddieId: new SquaddieId({
                name: "Thief",
                staticId: "Thief",
                affiliation: SquaddieAffiliation.ENEMY,
            }),
            activities: [longswordActivity],
            attributes: NullArmyAttributes(),
        });

        thiefDynamic = new BattleSquaddieDynamic({
            staticSquaddie: thiefStatic,
            dynamicSquaddieId: "Thief 0",
            squaddieTurn: new SquaddieTurn(),
        });

        squaddieRepo.addSquaddie(thiefStatic, thiefDynamic);
        battleMap.addSquaddie(thiefStatic.staticId, thiefDynamic.dynamicSquaddieId, new HexCoordinate({q: 1, r: 2}));

        const currentInstruction: SquaddieInstructionInProgress = new SquaddieInstructionInProgress({
            instruction: new SquaddieInstruction({
                dynamicSquaddieId: knightDynamic.dynamicSquaddieId,
                staticSquaddieId: knightStatic.staticId,
                startingLocation: new HexCoordinate({q: 1, r: 1}),
            }),
            currentSquaddieActivity: longswordActivity,
        });

        mockResourceHandler = new (
            <new (options: any) => ResourceHandler>ResourceHandler
        )({
            imageLoader: new stubImmediateLoader(),
        }) as jest.Mocked<ResourceHandler>;
        mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

        state = new OrchestratorState({
            missionMap: battleMap,
            squaddieRepo,
            hexMap: battleMap.terrainTileMap,
            squaddieCurrentlyActing: currentInstruction,
            pathfinder: new Pathfinder(),
            resourceHandler: mockResourceHandler,
        });

        camera = new BattleCamera(...convertMapCoordinatesToWorldCoordinates(0, 0));
    });

    function clickOnThief() {
        const {mapLocation} = state.missionMap.getSquaddieByDynamicId(thiefDynamic.dynamicSquaddieId);
        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(
            mapLocation.q,
            mapLocation.r,
            ...state.camera.getCoordinates()
        );
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
        };

        targetComponent.mouseEventHappened(state, mouseEvent);
    }

    function clickOnConfirmTarget() {
        const confirmSelectionClick: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: ScreenDimensions.SCREEN_WIDTH,
            mouseY: ScreenDimensions.SCREEN_HEIGHT,
        };

        targetComponent.mouseEventHappened(state, confirmSelectionClick);
    }


    it('should highlight the map with the ability range', () => {
        targetComponent.update(state, mockedP5);

        expect(targetComponent.hasCompleted(state)).toBeFalsy();

        const highlightedTileDescription = {
            pulseColor: HighlightPulseRedColor,
            name: "map icon attack 1 action",
        };

        expect(battleMap.terrainTileMap.highlightedTiles).toStrictEqual({
            [new HexCoordinate({q: 1, r: 0}).toStringKey()]: highlightedTileDescription,
            [new HexCoordinate({q: 1, r: 2}).toStringKey()]: highlightedTileDescription,
            [new HexCoordinate({q: 0, r: 1}).toStringKey()]: highlightedTileDescription,
            [new HexCoordinate({q: 2, r: 1}).toStringKey()]: highlightedTileDescription,
            [new HexCoordinate({q: 2, r: 0}).toStringKey()]: highlightedTileDescription,
            [new HexCoordinate({q: 0, r: 2}).toStringKey()]: highlightedTileDescription,
        });
    });

    describe('canceling', () => {
        const tests = [
            {
                mouseX: 0,
                mouseY: ScreenDimensions.SCREEN_HEIGHT,
            },
            {
                mouseX: ScreenDimensions.SCREEN_WIDTH,
                mouseY: ScreenDimensions.SCREEN_HEIGHT,
            },
        ];
        it.each(tests)('should cancel if the user clicks on the cancel button', ({
                                                                                     mouseX,
                                                                                     mouseY,
                                                                                 }) => {
            const mouseEvent: OrchestratorComponentMouseEvent = {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX,
                mouseY,
            };

            targetComponent.mouseEventHappened(state, mouseEvent);

            expect(targetComponent.hasCompleted(state)).toBeTruthy();
            const recommendedInfo = targetComponent.recommendStateChanges(state);
            expect(recommendedInfo.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_SELECTOR);
        });
    });

    it('should ignore if the user does not click off of the map', () => {
        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(battleMap.terrainTileMap.getDimensions().numberOfRows + 1, 0, ...state.camera.getCoordinates());
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
        };

        targetComponent.mouseEventHappened(state, mouseEvent);
        expect(targetComponent.shouldDrawConfirmWindow()).toBeFalsy();
        expect(targetComponent.hasCompleted(state)).toBeFalsy();
    });

    it('should ignore if the target is out of range', () => {
        state.missionMap.updateSquaddieLocation(thiefDynamic.dynamicSquaddieId, new HexCoordinate({q: 0, r: 0}));
        targetComponent.update(state, mockedP5);
        clickOnThief();
        expect(targetComponent.shouldDrawConfirmWindow()).toBeFalsy();
        expect(targetComponent.hasCompleted(state)).toBeFalsy();
    });

    describe('user clicks on target', () => {
        beforeEach(() => {
            targetComponent.update(state, mockedP5);
            clickOnThief();
        });

        it('should show the confirm window', () => {
            expect(targetComponent.shouldDrawConfirmWindow()).toBeTruthy();
            expect(targetComponent.hasCompleted(state)).toBeFalsy();
        });

        it('should unset the target location if the user cancels', () => {
            const cancelTargetClick: OrchestratorComponentMouseEvent = {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX: 0,
                mouseY: ScreenDimensions.SCREEN_HEIGHT,
            };

            targetComponent.mouseEventHappened(state, cancelTargetClick);

            expect(targetComponent.hasCompleted(state)).toBeFalsy();
            expect(targetComponent.shouldDrawConfirmWindow()).toBeFalsy();
        });
    });

    describe('user confirms the target', () => {
        beforeEach(() => {
            targetComponent.update(state, mockedP5);
            clickOnThief();
            clickOnConfirmTarget();
        });

        it('should create a squaddie instruction', () => {
            const expectedInstruction = new SquaddieInstruction({
                staticSquaddieId: knightStatic.staticId,
                dynamicSquaddieId: knightDynamic.dynamicSquaddieId,
                startingLocation: new HexCoordinate({q: 1, r: 1}),
            });
            expectedInstruction.addSquaddieSquaddieActivity(
                new SquaddieSquaddieActivity({
                    targetLocation: new HexCoordinate({q: 1, r: 2}),
                    squaddieActivity: longswordActivity,
                })
            );

            expect(state.squaddieCurrentlyActing.instruction).toStrictEqual(expectedInstruction);
        });

        it('should be completed', () => {
            expect(targetComponent.hasCompleted(state)).toBeTruthy();
        });

        it('should change the state to Squaddie Squaddie Activity', () => {
            const recommendedInfo = targetComponent.recommendStateChanges(state);
            expect(recommendedInfo.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_SQUADDIE_ACTIVITY);
        });

        it('should consume the squaddie actions', () => {
            expect(knightDynamic.squaddieTurn.getRemainingActions()).toBe(2);
        });
    });

    it('should add to existing instruction when confirmed mid turn', () => {
        state.squaddieCurrentlyActing.addSquaddie({
            staticSquaddieId: knightStatic.staticId,
            dynamicSquaddieId: knightDynamic.dynamicSquaddieId,
            startingLocation: new HexCoordinate({q: 1, r: 1}),
        });
        state.squaddieCurrentlyActing.addConfirmedActivity(new SquaddieSquaddieActivity({
            targetLocation: new HexCoordinate({q: 1, r: 2}),
            squaddieActivity: longswordActivity,
        }));
        knightDynamic.squaddieTurn.spendActionsOnActivity(longswordActivity);

        expect(targetComponent.hasCompleted(state)).toBeFalsy();
        targetComponent.update(state, mockedP5);
        clickOnThief();
        clickOnConfirmTarget();
        expect(targetComponent.hasCompleted(state)).toBeTruthy();

        const expectedInstruction = new SquaddieInstruction({
            staticSquaddieId: knightStatic.staticId,
            dynamicSquaddieId: knightDynamic.dynamicSquaddieId,
            startingLocation: new HexCoordinate({q: 1, r: 1}),
        });
        expectedInstruction.addSquaddieSquaddieActivity(
            new SquaddieSquaddieActivity({
                targetLocation: new HexCoordinate({q: 1, r: 2}),
                squaddieActivity: longswordActivity,
            })
        );
        expectedInstruction.addSquaddieSquaddieActivity(
            new SquaddieSquaddieActivity({
                targetLocation: new HexCoordinate({q: 1, r: 2}),
                squaddieActivity: longswordActivity,
            })
        );

        expect(state.squaddieCurrentlyActing.instruction).toStrictEqual(expectedInstruction);
        expect(knightDynamic.squaddieTurn.getRemainingActions()).toBe(1);
    });
});
