import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattlePlayerSquaddieTarget} from "./battlePlayerSquaddieTarget";
import {BattleSquaddie} from "../battleSquaddie";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {SquaddieAction} from "../../squaddie/action";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {MissionMap} from "../../missionMap/missionMap";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {SquaddieActionsForThisRound} from "../history/squaddieActionsForThisRound";
import {convertMapCoordinatesToScreenCoordinates} from "../../hexMap/convertCoordinates";
import {HighlightPulseRedColor} from "../../hexMap/hexDrawingUtils";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {SquaddieSquaddieActionData} from "../history/squaddieSquaddieAction";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import {ResourceHandler} from "../../resource/resourceHandler";
import {makeResult} from "../../utils/ResultOrError";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {DamageType, GetHitPoints, GetNumberOfActionPoints} from "../../squaddie/squaddieService";
import {BattleEvent} from "../history/battleEvent";
import {ArmyAttributes} from "../../squaddie/armyAttributes";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {SquaddieActionType} from "../history/anySquaddieAction";

describe('BattleSquaddieTarget', () => {
    let squaddieRepo: BattleSquaddieRepository = new BattleSquaddieRepository();
    let targetComponent: BattlePlayerSquaddieTarget;
    let knightStatic: SquaddieTemplate;
    let knightDynamic: BattleSquaddie;
    let citizenStatic: SquaddieTemplate;
    let citizenDynamic: BattleSquaddie;
    let thiefStatic: SquaddieTemplate;
    let thiefDynamic: BattleSquaddie;
    let battleMap: MissionMap;
    let longswordAction: SquaddieAction;
    let longswordActionId: "longsword";
    let bandageWoundsAction: SquaddieAction;
    let bandageWoundsActionId: "bandage wounds";
    let state: BattleOrchestratorState;
    let mockResourceHandler: jest.Mocked<ResourceHandler>;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
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

        longswordAction = new SquaddieAction({
            name: "longsword",
            id: longswordActionId,
            traits: new TraitStatusStorage({
                initialTraitValues: {
                    [Trait.ATTACK]: true,
                    [Trait.TARGET_ARMOR]: true,
                }
            }).filterCategory(TraitCategory.ACTION),
            minimumRange: 1,
            maximumRange: 1,
            actionPointCost: 1,
            damageDescriptions: {
                [DamageType.Body]: 2,
            },
        });

        bandageWoundsAction = new SquaddieAction({
            name: "Bandage Wounds",
            id: bandageWoundsActionId,
            traits: new TraitStatusStorage({
                initialTraitValues: {
                    [Trait.HEALING]: true,
                    [Trait.TARGETS_ALLIES]: true,
                }
            }).filterCategory(TraitCategory.ACTION),
            minimumRange: 1,
            maximumRange: 1,
            actionPointCost: 2,
        });

        ({
            squaddieTemplate: knightStatic,
            battleSquaddie: knightDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Knight",
            templateId: "Knight",
            battleId: "Knight 0",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository: squaddieRepo,
            actions: [longswordAction, bandageWoundsAction],
        }));
        battleMap.addSquaddie(knightStatic.templateId, knightDynamic.battleSquaddieId, new HexCoordinate({q: 1, r: 1}));

        ({
            squaddieTemplate: citizenStatic,
            battleSquaddie: citizenDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Citizen",
            templateId: "Citizen",
            battleId: "Citizen 0",
            affiliation: SquaddieAffiliation.ALLY,
            squaddieRepository: squaddieRepo,
            actions: [],
        }));
        battleMap.addSquaddie(citizenStatic.templateId, citizenDynamic.battleSquaddieId, new HexCoordinate({
            q: 0,
            r: 1
        }));

        ({
            squaddieTemplate: thiefStatic,
            battleSquaddie: thiefDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Thief",
            templateId: "Thief",
            battleId: "Thief 0",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository: squaddieRepo,
            actions: [longswordAction],
            attributes: new ArmyAttributes({
                maxHitPoints: 5,
            })
        }));
        battleMap.addSquaddie(thiefStatic.templateId, thiefDynamic.battleSquaddieId, new HexCoordinate({q: 1, r: 2}));

        const currentInstruction: SquaddieInstructionInProgress = new SquaddieInstructionInProgress({
            actionsForThisRound: new SquaddieActionsForThisRound({
                battleSquaddieId: knightDynamic.battleSquaddieId,
                squaddieTemplateId: knightStatic.templateId,
                startingLocation: new HexCoordinate({q: 1, r: 1}),
            }),
            currentSquaddieAction: longswordAction,
        });

        mockResourceHandler = mocks.mockResourceHandler();
        mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

        state = new BattleOrchestratorState({
            missionMap: battleMap,
            squaddieRepository: squaddieRepo,
            hexMap: battleMap.terrainTileMap,
            squaddieCurrentlyActing: currentInstruction,
            pathfinder: new Pathfinder(),
            resourceHandler: mockResourceHandler,
        });
    });

    function clickOnThief() {
        const {mapLocation} = state.missionMap.getSquaddieByBattleId(thiefDynamic.battleSquaddieId);
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

    function clickOnCitizen() {
        const {mapLocation} = state.missionMap.getSquaddieByBattleId(citizenDynamic.battleSquaddieId);
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
            mouseY: ScreenDimensions.SCREEN_HEIGHT / 2,
        };

        targetComponent.mouseEventHappened(state, confirmSelectionClick);
    }


    it('should highlight the map with the ability range', () => {
        targetComponent.update(state, mockedP5GraphicsContext);

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

        state.squaddieCurrentlyActing.reset();
        state.squaddieCurrentlyActing.addInitialState({
            battleSquaddieId: knightDynamic.battleSquaddieId,
            squaddieTemplateId: knightStatic.templateId,
            startingLocation: new HexCoordinate({q: 1, r: 1}),
        });
        state.squaddieCurrentlyActing.addSelectedAction(longswordAction);

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

        state.squaddieCurrentlyActing.reset();
        state.squaddieCurrentlyActing.addInitialState({
            battleSquaddieId: knightDynamic.battleSquaddieId,
            squaddieTemplateId: knightStatic.templateId,
            startingLocation: new HexCoordinate({q: 1, r: 1}),
        });
        state.squaddieCurrentlyActing.squaddieActionsForThisRound.addAction({
            type: SquaddieActionType.MOVEMENT,
            data: {
                destination: {q: 0, r: 1},
                numberOfActionPointsSpent: 1,
            }
        });
        state.squaddieCurrentlyActing.addSelectedAction(longswordAction);

        targetComponent.mouseEventHappened(state, mouseEvent);
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
        state.missionMap.updateSquaddieLocation(thiefDynamic.battleSquaddieId, new HexCoordinate({q: 0, r: 0}));
        targetComponent.update(state, mockedP5GraphicsContext);
        clickOnThief();
        expect(targetComponent.shouldDrawConfirmWindow()).toBeFalsy();
        expect(targetComponent.hasCompleted(state)).toBeFalsy();
    });

    describe('user clicks on target with attack', () => {
        beforeEach(() => {
            targetComponent.update(state, mockedP5GraphicsContext);
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

    describe('user clicks on target with heal', () => {
        beforeEach(() => {
            const currentInstruction: SquaddieInstructionInProgress = new SquaddieInstructionInProgress({
                actionsForThisRound: new SquaddieActionsForThisRound({
                    battleSquaddieId: knightDynamic.battleSquaddieId,
                    squaddieTemplateId: knightStatic.templateId,
                    startingLocation: new HexCoordinate({q: 1, r: 1}),
                }),
                currentSquaddieAction: bandageWoundsAction,
            });

            state = new BattleOrchestratorState({
                missionMap: battleMap,
                squaddieRepository: squaddieRepo,
                hexMap: battleMap.terrainTileMap,
                squaddieCurrentlyActing: currentInstruction,
                pathfinder: new Pathfinder(),
                resourceHandler: mockResourceHandler,
            });

            targetComponent.update(state, mockedP5GraphicsContext);
            clickOnCitizen();
        });

        it('should show the confirm window', () => {
            expect(targetComponent.shouldDrawConfirmWindow()).toBeTruthy();
            expect(targetComponent.hasCompleted(state)).toBeFalsy();
        });
    });

    describe('user confirms the target', () => {
        beforeEach(() => {
            targetComponent.update(state, mockedP5GraphicsContext);
            clickOnThief();
            clickOnConfirmTarget();
        });

        it('should create a squaddie instruction', () => {
            const expectedInstruction = new SquaddieActionsForThisRound({
                squaddieTemplateId: knightStatic.templateId,
                battleSquaddieId: knightDynamic.battleSquaddieId,
                startingLocation: new HexCoordinate({q: 1, r: 1}),
            });
            expectedInstruction.addAction({
                type: SquaddieActionType.SQUADDIE,
                data: {
                    targetLocation: new HexCoordinate({q: 1, r: 2}),
                    squaddieAction: longswordAction,
                    numberOfActionPointsSpent: 1,
                }
            });

            expect(state.squaddieCurrentlyActing.squaddieActionsForThisRound).toStrictEqual(expectedInstruction);
        });

        it('should be completed', () => {
            expect(targetComponent.hasCompleted(state)).toBeTruthy();
        });

        it('should change the state to Squaddie Uses Action On Squaddie', () => {
            const recommendedInfo = targetComponent.recommendStateChanges(state);
            expect(recommendedInfo.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE);
        });

        it('should consume the squaddie action points', () => {
            const {actionPointsRemaining} = GetNumberOfActionPoints({
                squaddieTemplate: knightStatic,
                battleSquaddie: knightDynamic
            });
            expect(actionPointsRemaining).toBe(2);
        });
    });

    describe('confirming an action mid turn', () => {
        beforeEach(() => {
            state.squaddieCurrentlyActing.addInitialState({
                squaddieTemplateId: knightStatic.templateId,
                battleSquaddieId: knightDynamic.battleSquaddieId,
                startingLocation: new HexCoordinate({q: 1, r: 1}),
            });

            expect(targetComponent.hasCompleted(state)).toBeFalsy();
            targetComponent.update(state, mockedP5GraphicsContext);
            clickOnThief();
            clickOnConfirmTarget();
            expect(targetComponent.hasCompleted(state)).toBeTruthy();
        });

        it('should add to existing instruction when confirmed mid turn', () => {
            const expectedInstruction = new SquaddieActionsForThisRound({
                squaddieTemplateId: knightStatic.templateId,
                battleSquaddieId: knightDynamic.battleSquaddieId,
                startingLocation: new HexCoordinate({q: 1, r: 1}),
            });
            expectedInstruction.addAction({
                type: SquaddieActionType.SQUADDIE,
                data: {
                    targetLocation: new HexCoordinate({q: 1, r: 2}),
                    squaddieAction: longswordAction,
                    numberOfActionPointsSpent: 1,
                }
            });

            expect(state.squaddieCurrentlyActing.squaddieActionsForThisRound).toStrictEqual(expectedInstruction);
        });

        it('should spend the action resource cost after confirming but before showing results', () => {
            const {actionPointsRemaining} = GetNumberOfActionPoints({
                squaddieTemplate: knightStatic,
                battleSquaddie: knightDynamic
            });
            expect(actionPointsRemaining).toBe(3 - longswordAction.actionPointCost);
        });

        it('should add the results to the history', () => {
            expect(state.battleEventRecording.history).toHaveLength(1);
            const mostRecentEvent: BattleEvent = state.battleEventRecording.history[0];
            expect(mostRecentEvent.actions).toHaveLength(1);
            expect((
                mostRecentEvent.actions[0].data as SquaddieSquaddieActionData
            ).squaddieAction.id).toBe(longswordAction.id);
            const results = mostRecentEvent.results;
            expect(results.actingBattleSquaddieId).toBe(knightDynamic.battleSquaddieId);
            expect(results.targetedBattleSquaddieIds).toHaveLength(1);
            expect(results.targetedBattleSquaddieIds[0]).toBe(thiefDynamic.battleSquaddieId);
            expect(results.resultPerTarget[thiefDynamic.battleSquaddieId]).toBeTruthy();
        });

        it('should store the calculated results', () => {
            const mostRecentEvent: BattleEvent = state.battleEventRecording.history[0];
            const knightUsesLongswordOnThiefResults = mostRecentEvent.results.resultPerTarget[thiefDynamic.battleSquaddieId];
            expect(knightUsesLongswordOnThiefResults.damageTaken).toBe(longswordAction.damageDescriptions[DamageType.Body]);

            const {maxHitPoints, currentHitPoints} = GetHitPoints({
                squaddieTemplate: thiefStatic,
                battleSquaddie: thiefDynamic
            });
            expect(currentHitPoints).toBe(maxHitPoints - longswordAction.damageDescriptions[DamageType.Body]);
        });
    });

    describe('invalid target based on affiliation', () => {
        const tests = [
            {
                name: 'target foe tries to attack an ally',
                actionTraits: [Trait.ATTACK, Trait.TARGETS_FOE],
                invalidTargetClicker: clickOnCitizen,
            },
            {
                name: 'heal ally tries to heal a foe',
                actionTraits: [Trait.HEALING, Trait.TARGETS_ALLIES],
                invalidTargetClicker: clickOnThief,
            }
        ]
        it.each(tests)(`$name do not show a confirm window`, ({
                                                                  name,
                                                                  actionTraits,
                                                                  invalidTargetClicker,
                                                              }) => {
            const traits: { [key in Trait]?: boolean } = Object.fromEntries(
                actionTraits.map(e => [e, true])
            );
            const action = new SquaddieAction({
                id: name,
                name,
                traits: new TraitStatusStorage({initialTraitValues: traits}),
                minimumRange: 0,
                maximumRange: 9001,
            });
            const currentInstruction: SquaddieInstructionInProgress = new SquaddieInstructionInProgress({
                actionsForThisRound: new SquaddieActionsForThisRound({
                    battleSquaddieId: knightDynamic.battleSquaddieId,
                    squaddieTemplateId: knightStatic.templateId,
                    startingLocation: new HexCoordinate({q: 1, r: 1}),
                }),
                currentSquaddieAction: action,
            });

            state = new BattleOrchestratorState({
                missionMap: battleMap,
                squaddieRepository: squaddieRepo,
                hexMap: battleMap.terrainTileMap,
                squaddieCurrentlyActing: currentInstruction,
                pathfinder: new Pathfinder(),
                resourceHandler: mockResourceHandler,
            });

            targetComponent.update(state, mockedP5GraphicsContext);
            invalidTargetClicker();

            expect(targetComponent.shouldDrawConfirmWindow()).toBeFalsy();
            expect(targetComponent.hasCompleted(state)).toBeFalsy();
        });
    })
});
