import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattlePlayerSquaddieTarget} from "./battlePlayerSquaddieTarget";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {SquaddieActivity} from "../../squaddie/activity";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {MissionMap} from "../../missionMap/missionMap";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {SquaddieInstruction} from "../history/squaddieInstruction";
import {convertMapCoordinatesToScreenCoordinates} from "../../hexMap/convertCoordinates";
import {HighlightPulseRedColor} from "../../hexMap/hexDrawingUtils";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {ScreenDimensions} from "../../utils/graphicsConfig";
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {SquaddieSquaddieActivity} from "../history/squaddieSquaddieActivity";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import {ResourceHandler} from "../../resource/resourceHandler";
import {makeResult} from "../../utils/ResultOrError";
import * as mocks from "../../utils/test/mocks";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {DamageType, GetHitPoints, GetNumberOfActions} from "../../squaddie/squaddieService";
import {BattleEvent} from "../history/battleEvent";
import {ArmyAttributes} from "../../squaddie/armyAttributes";
import {SquaddieMovementActivity} from "../history/squaddieMovementActivity";

describe('BattleSquaddieTarget', () => {
    let squaddieRepo: BattleSquaddieRepository = new BattleSquaddieRepository();
    let targetComponent: BattlePlayerSquaddieTarget;
    let knightStatic: BattleSquaddieStatic;
    let knightDynamic: BattleSquaddieDynamic;
    let thiefStatic: BattleSquaddieStatic;
    let thiefDynamic: BattleSquaddieDynamic;
    let battleMap: MissionMap;
    let longswordActivity: SquaddieActivity;
    let state: BattleOrchestratorState;
    let mockResourceHandler: jest.Mocked<ResourceHandler>;
    let mockedP5 = mocks.mockedP5();

    beforeEach(() => {
        mockedP5 = mocks.mockedP5();
        targetComponent = new BattlePlayerSquaddieTarget();
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
            damageDescriptions: {
                [DamageType.Body]: 2,
            },
        });

        ({
            staticSquaddie: knightStatic,
            dynamicSquaddie: knightDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Knight",
            staticId: "Knight",
            dynamicId: "Knight 0",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository: squaddieRepo,
            activities: [longswordActivity],
        }));

        battleMap.addSquaddie(knightStatic.staticId, knightDynamic.dynamicSquaddieId, new HexCoordinate({q: 1, r: 1}));

        ({
            staticSquaddie: thiefStatic,
            dynamicSquaddie: thiefDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Thief",
            staticId: "Thief",
            dynamicId: "Thief 0",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository: squaddieRepo,
            activities: [longswordActivity],
            attributes: new ArmyAttributes({
                maxHitPoints: 5,
            })
        }));

        battleMap.addSquaddie(thiefStatic.staticId, thiefDynamic.dynamicSquaddieId, new HexCoordinate({q: 1, r: 2}));

        const currentInstruction: SquaddieInstructionInProgress = new SquaddieInstructionInProgress({
            instruction: new SquaddieInstruction({
                dynamicSquaddieId: knightDynamic.dynamicSquaddieId,
                staticSquaddieId: knightStatic.staticId,
                startingLocation: new HexCoordinate({q: 1, r: 1}),
            }),
            currentSquaddieActivity: longswordActivity,
        });

        mockResourceHandler = mocks.mockResourceHandler();
        mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

        state = new BattleOrchestratorState({
            missionMap: battleMap,
            squaddieRepo,
            hexMap: battleMap.terrainTileMap,
            squaddieCurrentlyActing: currentInstruction,
            pathfinder: new Pathfinder(),
            resourceHandler: mockResourceHandler,
        });
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
            expect(recommendedInfo.nextMode).toBe(BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR);
        });
    });

    it('should clear whoever is acting if they cancel at the start of the turn', () => {
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: ScreenDimensions.SCREEN_WIDTH,
            mouseY: ScreenDimensions.SCREEN_HEIGHT,
        };

        state.squaddieCurrentlyActing = new SquaddieInstructionInProgress({
            instruction: new SquaddieInstruction({
                dynamicSquaddieId: knightDynamic.dynamicSquaddieId,
                staticSquaddieId: knightStatic.staticId,
                startingLocation: new HexCoordinate({q: 1, r: 1}),
            }),
            currentSquaddieActivity: longswordActivity,
        });

        targetComponent.mouseEventHappened(state, mouseEvent);
        expect(state.squaddieCurrentlyActing.squaddieHasActedThisTurn).toBeFalsy();
        expect(state.squaddieCurrentlyActing.isReadyForNewSquaddie).toBeTruthy();
    });

    it('should remember the squaddie is still acting if they cancel midway through their turn', () => {
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: ScreenDimensions.SCREEN_WIDTH,
            mouseY: ScreenDimensions.SCREEN_HEIGHT,
        };

        const moveInstruction = new SquaddieInstruction({
            dynamicSquaddieId: knightDynamic.dynamicSquaddieId,
            staticSquaddieId: knightStatic.staticId,
            startingLocation: new HexCoordinate({q: 1, r: 1}),
        });
        moveInstruction.addActivity(new SquaddieMovementActivity({
            destination: new HexCoordinate({q: 0, r: 1}),
            numberOfActionsSpent: 1,
        }));

        const squaddieInstructionInProgress = new SquaddieInstructionInProgress({
            instruction: moveInstruction,
            currentSquaddieActivity: longswordActivity,
        });
        state.squaddieCurrentlyActing = squaddieInstructionInProgress;

        targetComponent.mouseEventHappened(state, mouseEvent);
        expect(state.squaddieCurrentlyActing).toStrictEqual(squaddieInstructionInProgress);
        expect(state.squaddieCurrentlyActing.squaddieHasActedThisTurn).toBeTruthy();
        expect(state.squaddieCurrentlyActing.isReadyForNewSquaddie).toBeFalsy();
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
            const {normalActionsRemaining} = GetNumberOfActions({
                staticSquaddie: knightStatic,
                dynamicSquaddie: knightDynamic
            });
            expect(normalActionsRemaining).toBe(2);
        });
    });

    describe('confirming an action mid turn', () => {
        beforeEach(() => {
            state.squaddieCurrentlyActing.addSquaddie({
                staticSquaddieId: knightStatic.staticId,
                dynamicSquaddieId: knightDynamic.dynamicSquaddieId,
                startingLocation: new HexCoordinate({q: 1, r: 1}),
            });

            expect(targetComponent.hasCompleted(state)).toBeFalsy();
            targetComponent.update(state, mockedP5);
            clickOnThief();
            clickOnConfirmTarget();
            expect(targetComponent.hasCompleted(state)).toBeTruthy();
        });

        it('should add to existing instruction when confirmed mid turn', () => {
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

        it('should spend the activity resource cost', () => {
            const {normalActionsRemaining} = GetNumberOfActions({
                staticSquaddie: knightStatic,
                dynamicSquaddie: knightDynamic
            });
            expect(normalActionsRemaining).toBe(3 - longswordActivity.actionsToSpend);
        });

        it('should add the results to the history', () => {
            expect(state.battleEventRecording.history).toHaveLength(1);
            const mostRecentEvent: BattleEvent = state.battleEventRecording.history[0];
            expect(mostRecentEvent.activities).toHaveLength(1);
            expect((
                mostRecentEvent.activities[0] as SquaddieSquaddieActivity
            ).squaddieActivity.id).toBe(longswordActivity.id);
            const results = mostRecentEvent.results;
            expect(results.actingSquaddieDynamicId).toBe(knightDynamic.dynamicSquaddieId);
            expect(results.targetedSquaddieDynamicIds).toHaveLength(1);
            expect(results.targetedSquaddieDynamicIds[0]).toBe(thiefDynamic.dynamicSquaddieId);
            expect(results.resultPerTarget[thiefDynamic.dynamicSquaddieId]).toBeTruthy();
        });

        it('should store the calculated results', () => {
            const mostRecentEvent: BattleEvent = state.battleEventRecording.history[0];
            const knightUsesLongswordOnThiefResults = mostRecentEvent.results.resultPerTarget[thiefDynamic.dynamicSquaddieId];
            expect(knightUsesLongswordOnThiefResults.damageTaken).toBe(longswordActivity.damageDescriptions[DamageType.Body]);

            const {maxHitPoints, currentHitPoints} = GetHitPoints({
                staticSquaddie: thiefStatic,
                dynamicSquaddie: thiefDynamic
            });
            expect(currentHitPoints).toBe(maxHitPoints - longswordActivity.damageDescriptions[DamageType.Body]);
        });
    });
});