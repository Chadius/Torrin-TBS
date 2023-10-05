import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {MissionMap} from "../missionMap/missionMap";
import {ResourceHandler} from "../resource/resourceHandler";
import {BattleSquaddieSelectedHUD} from "./battleSquaddieSelectedHUD";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "./battleSquaddie";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {TerrainTileMap} from "../hexMap/terrainTileMap";
import {ActivityButton} from "../squaddie/activityButton";
import {SquaddieActivity} from "../squaddie/activity";
import {TargetingShape} from "./targeting/targetingShapeGenerator";
import {SquaddieEndTurnActivity} from "./history/squaddieEndTurnActivity";
import {RectArea} from "../ui/rectArea";
import {getResultOrThrowError, makeResult} from "../utils/ResultOrError";
import {TraitStatusStorage} from "../trait/traitStatusStorage";
import {CreateNewSquaddieAndAddToRepository} from "../utils/test/squaddie";
import {BattleCamera} from "./battleCamera";
import {convertMapCoordinatesToWorldCoordinates} from "../hexMap/convertCoordinates";
import {HexCoordinate} from "../hexMap/hexCoordinate/hexCoordinate";
import {BattleOrchestratorState} from "./orchestrator/battleOrchestratorState";
import {KeyButtonName} from "../utils/keyboardConfig";
import {config} from "../configuration/config";
import {SquaddieInstructionInProgress} from "./history/squaddieInstructionInProgress";
import {SquaddieActivitiesForThisRound} from "./history/squaddieActivitiesForThisRound";
import * as mocks from "../utils/test/mocks";
import {MockedP5GraphicsContext} from "../utils/test/mocks";
import {ButtonStatus} from "../ui/button";

describe('BattleSquaddieSelectedHUD', () => {
    let hud: BattleSquaddieSelectedHUD;
    let squaddieRepository: BattleSquaddieRepository;
    let missionMap: MissionMap;
    let resourceHandler: ResourceHandler;
    let playerSquaddieDynamicID: string = "player_squaddie_0";
    let playerSquaddieStatic: BattleSquaddieStatic;
    let playerSquaddieDynamic: BattleSquaddieDynamic;
    let enemySquaddieDynamicID: string = "enemy_squaddie_0";
    let enemySquaddieStatic: BattleSquaddieStatic;
    let enemySquaddieDynamic: BattleSquaddieDynamic;
    let player2SquaddieDynamicId: string = "player_squaddie_2";
    let player2SquaddieStatic: BattleSquaddieStatic;
    let player2SquaddieDynamic: BattleSquaddieDynamic;
    let longswordActivity: SquaddieActivity;
    let warnUserNotEnoughActionsToPerformActionSpy: jest.SpyInstance;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        })

        squaddieRepository = new BattleSquaddieRepository();

        resourceHandler = mocks.mockResourceHandler();
        resourceHandler.areAllResourcesLoaded = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
        resourceHandler.getResource = jest.fn().mockReturnValue(makeResult({width: 1, height: 1}));
        resourceHandler.loadResources([
            "affiliate_icon_crusaders",
            "affiliate_icon_infiltrators",
            "affiliate_icon_western",
            "affiliate_icon_none",
        ]);

        longswordActivity = new SquaddieActivity({
            name: "longsword",
            id: "longsword",
            traits: new TraitStatusStorage(),
            actionsToSpend: 1,
            minimumRange: 0,
            maximumRange: 1,
            targetingShape: TargetingShape.Snake,
        });

        ({
                staticSquaddie: playerSquaddieStatic,
                dynamicSquaddie: playerSquaddieDynamic,
            } =
                CreateNewSquaddieAndAddToRepository({
                    staticId: "player_soldier",
                    name: "Player Soldier",
                    affiliation: SquaddieAffiliation.PLAYER,
                    dynamicId: playerSquaddieDynamicID,
                    squaddieRepository,
                    activities: [
                        longswordActivity
                    ],
                })
        );

        ({
                staticSquaddie: player2SquaddieStatic,
                dynamicSquaddie: player2SquaddieDynamic,
            } =
                CreateNewSquaddieAndAddToRepository({
                    staticId: "player_soldier2",
                    name: "Player Soldier 2",
                    affiliation: SquaddieAffiliation.PLAYER,
                    dynamicId: player2SquaddieDynamicId,
                    squaddieRepository,
                    activities: [
                        longswordActivity
                    ],
                })
        );

        ({
                staticSquaddie: enemySquaddieStatic,
                dynamicSquaddie: enemySquaddieDynamic,
            } =
                CreateNewSquaddieAndAddToRepository({
                    staticId: "enemy_soldier",
                    name: "Enemy Soldier",
                    affiliation: SquaddieAffiliation.ENEMY,
                    dynamicId: enemySquaddieDynamicID,
                    squaddieRepository,
                    activities: [
                        longswordActivity
                    ],
                })
        );

        hud = new BattleSquaddieSelectedHUD();
        warnUserNotEnoughActionsToPerformActionSpy = jest.spyOn((hud as any), "warnUserNotEnoughActionsToPerformAction").mockReturnValue(null);

        mockedP5GraphicsContext = new MockedP5GraphicsContext();
    });

    it('generates a button for each squaddie activity', () => {
        hud.selectSquaddieAndDrawWindow({
                dynamicId: playerSquaddieDynamicID,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state: new BattleOrchestratorState({
                    squaddieRepo: squaddieRepository,
                    missionMap,
                    resourceHandler: resourceHandler,
                    camera: new BattleCamera(0, 0),
                })
            },
        );

        const activityButtons: ActivityButton[] = hud.getActivityButtons();
        expect(activityButtons).toBeTruthy();

        expect(activityButtons.find((button) =>
            button.activity instanceof SquaddieActivity
            && button.activity.name === longswordActivity.name
        )).toBeTruthy();
    });

    it('reports when an activity button is clicked', () => {
        const state = new BattleOrchestratorState({
            squaddieRepo: squaddieRepository,
            missionMap,
            resourceHandler: resourceHandler,
            camera: new BattleCamera(0, 0),
        });
        hud.selectSquaddieAndDrawWindow({
            dynamicId: playerSquaddieDynamicID,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });
        expect(hud.wasActivitySelected()).toBeFalsy();
        expect(hud.getSelectedActivity()).toBeUndefined();

        const longswordButton = hud.getActivityButtons().find((button) =>
            button.activity instanceof SquaddieActivity
            && button.activity.name === longswordActivity.name
        );
        hud.mouseClicked(longswordButton.buttonArea.left, longswordButton.buttonArea.top, state);

        expect(hud.wasActivitySelected()).toBeTruthy();
        expect(hud.getSelectedActivity()).toBe(longswordActivity);

        hud.reset();
        expect(hud.wasActivitySelected()).toBeFalsy();
        expect(hud.getSelectedActivity()).toBeUndefined();
    });

    it('reports when an activity button is hovered', () => {
        const state = new BattleOrchestratorState({
            squaddieRepo: squaddieRepository,
            missionMap,
            resourceHandler: resourceHandler,
            camera: new BattleCamera(0, 0),
        });
        hud.selectSquaddieAndDrawWindow({
            dynamicId: playerSquaddieDynamicID,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });
        expect(hud.wasActivitySelected()).toBeFalsy();
        expect(hud.getSelectedActivity()).toBeUndefined();

        const longswordButton = hud.getActivityButtons().find((button) =>
            button.activity instanceof SquaddieActivity
            && button.activity.name === longswordActivity.name
        );
        hud.mouseMoved(longswordButton.buttonArea.left, longswordButton.buttonArea.top, state);

        expect(longswordButton.status).toBe(ButtonStatus.HOVER);
    });

    it('generates a Wait Turn activity button when a squaddie is selected', () => {
        const state = new BattleOrchestratorState({
            squaddieRepo: squaddieRepository,
            missionMap,
            resourceHandler: resourceHandler,
            camera: new BattleCamera(0, 0),
        });

        hud.selectSquaddieAndDrawWindow({
            dynamicId: playerSquaddieDynamicID,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });

        const activityButtons: ActivityButton[] = hud.getActivityButtons();
        expect(activityButtons).toBeTruthy();

        const waitTurnButton = activityButtons.find((button) =>
            button.activity instanceof SquaddieEndTurnActivity
        );
        expect(waitTurnButton).toBeTruthy();
    });

    it('reports when a Wait Turn activity button was clicked on', () => {
        const state = new BattleOrchestratorState({
            squaddieRepo: squaddieRepository,
            missionMap,
            resourceHandler: resourceHandler,
            camera: new BattleCamera(0, 0),
        });

        hud.selectSquaddieAndDrawWindow({
            dynamicId: playerSquaddieDynamicID,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });
        expect(hud.wasActivitySelected()).toBeFalsy();
        expect(hud.getSelectedActivity()).toBeUndefined();

        const waitTurnButton = hud.getActivityButtons().find((button) =>
            button.activity instanceof SquaddieEndTurnActivity
        );

        hud.mouseClicked(waitTurnButton.buttonArea.left, waitTurnButton.buttonArea.top, state);

        expect(hud.wasActivitySelected()).toBeTruthy();
        expect(hud.getSelectedActivity()).toBeInstanceOf(SquaddieEndTurnActivity);

        hud.reset();
        expect(hud.wasActivitySelected()).toBeFalsy();
        expect(hud.getSelectedActivity()).toBeUndefined();
    });

    it('can reopen the window in the previous position if no mouse location is given', () => {
        const state = new BattleOrchestratorState({
            squaddieRepo: squaddieRepository,
            missionMap,
            resourceHandler: resourceHandler,
            camera: new BattleCamera(0, 0),
        });

        hud.selectSquaddieAndDrawWindow({
            dynamicId: playerSquaddieDynamicID,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });
        const initialWindowPosition: RectArea = new RectArea({baseRectangle: hud.background.area, left: 0, top: 0});
        hud.selectSquaddieAndDrawWindow({
            dynamicId: playerSquaddieDynamicID,
            state,
        });
        expect(hud.background.area).toStrictEqual(initialWindowPosition);
    });

    it('will warn the user if the squaddie does not have enough actions to perform the activity', () => {
        let notEnoughActionsActivity: SquaddieActivity;
        notEnoughActionsActivity = new SquaddieActivity({
            name: "not enough actions",
            id: "not enough actions",
            traits: new TraitStatusStorage(),
            actionsToSpend: 9001,
            minimumRange: 0,
            maximumRange: 1,
            targetingShape: TargetingShape.Snake,
        });
        const {staticSquaddie} = getResultOrThrowError(squaddieRepository.getSquaddieByDynamicId(playerSquaddieDynamicID));
        staticSquaddie.addActivity(notEnoughActionsActivity);

        const state = new BattleOrchestratorState({
            squaddieRepo: squaddieRepository,
            missionMap,
            resourceHandler: resourceHandler,
            camera: new BattleCamera(0, 0),
        });

        hud.selectSquaddieAndDrawWindow({
            dynamicId: playerSquaddieDynamicID,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });
        expect(hud.wasActivitySelected()).toBeFalsy();
        expect(hud.getSelectedActivity()).toBeUndefined();

        const notEnoughActionsButton = hud.getActivityButtons().find((button) =>
            button.activity instanceof SquaddieActivity && button.activity.name === "not enough actions"
        );

        hud.mouseClicked(
            notEnoughActionsButton.buttonArea.left,
            notEnoughActionsButton.buttonArea.top,
            state,
        );

        expect(hud.wasActivitySelected()).toBeFalsy();
        expect(hud.getSelectedActivity()).toBeUndefined();
        expect(warnUserNotEnoughActionsToPerformActionSpy).toBeCalled();
    });

    it('will warn the user if another squaddie is still completing their turn', () => {
        const state = new BattleOrchestratorState({
            squaddieRepo: squaddieRepository,
            missionMap,
            resourceHandler: resourceHandler,
            camera: new BattleCamera(0, 0),
            squaddieCurrentlyActing: new SquaddieInstructionInProgress({
                activitiesForThisRound: new SquaddieActivitiesForThisRound({
                    dynamicSquaddieId: playerSquaddieDynamic.dynamicSquaddieId,
                    staticSquaddieId: playerSquaddieStatic.staticId,
                    startingLocation: new HexCoordinate({q: 0, r: 0}),
                }),
                currentSquaddieActivity: new SquaddieActivity({
                    name: "purifying stream",
                    id: "purifying_stream",
                    traits: new TraitStatusStorage(),
                })
            })
        });

        hud.selectSquaddieAndDrawWindow({
            dynamicId: player2SquaddieDynamic.dynamicSquaddieId,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });

        const textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
        hud.draw(state.squaddieCurrentlyActing, state, mockedP5GraphicsContext);

        expect(textSpy).toBeCalled();
        expect(textSpy).toBeCalledWith(expect.stringMatching(`wait for ${playerSquaddieStatic.squaddieId.name}`),
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything()
        );
    });

    it('will warn the user they cannot control enemy squaddies', () => {
        const state = new BattleOrchestratorState({
            squaddieRepo: squaddieRepository,
            missionMap,
            resourceHandler: resourceHandler,
            camera: new BattleCamera(0, 0),
        });

        hud.selectSquaddieAndDrawWindow({
            dynamicId: enemySquaddieDynamic.dynamicSquaddieId,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });

        const textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
        hud.draw(state.squaddieCurrentlyActing, state, mockedP5GraphicsContext);

        expect(textSpy).toBeCalled();
        expect(textSpy).toBeCalledWith(expect.stringMatching(`cannot control ${enemySquaddieStatic.squaddieId.name}`),
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything()
        );
    });

    describe("Next Squaddie button", () => {
        it('should show the button if there are at least 2 player controllable squaddies', () => {
            const state = new BattleOrchestratorState({
                squaddieRepo: squaddieRepository,
                missionMap,
                resourceHandler: resourceHandler,
                camera: new BattleCamera(0, 0),
            });


            hud = new BattleSquaddieSelectedHUD()

            hud.selectSquaddieAndDrawWindow({
                dynamicId: playerSquaddieDynamic.dynamicSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            expect(hud.shouldDrawNextButton(state)).toBeTruthy();
        });

        it('should show the button if there is 1 player controllable squaddie and the HUD is focused on an uncontrollable squaddie', () => {
            const onePlayerOneEnemy = new BattleSquaddieRepository();
            onePlayerOneEnemy.addSquaddie(playerSquaddieStatic, playerSquaddieDynamic);
            onePlayerOneEnemy.addSquaddie(enemySquaddieStatic, enemySquaddieDynamic);

            const state = new BattleOrchestratorState({
                squaddieRepo: onePlayerOneEnemy,
                missionMap,
                resourceHandler: resourceHandler,
                camera: new BattleCamera(0, 0),
            });


            hud = new BattleSquaddieSelectedHUD();

            hud.selectSquaddieAndDrawWindow({
                dynamicId: enemySquaddieDynamic.dynamicSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            expect(hud.shouldDrawNextButton(state)).toBeTruthy();
        });

        it('should show the button if there is 1 player controllable squaddie and the HUD is not focused', () => {
            const onePlayerOneEnemy = new BattleSquaddieRepository();
            onePlayerOneEnemy.addSquaddie(playerSquaddieStatic, playerSquaddieDynamic);
            onePlayerOneEnemy.addSquaddie(enemySquaddieStatic, enemySquaddieDynamic);

            const state = new BattleOrchestratorState({
                squaddieRepo: onePlayerOneEnemy,
                missionMap,
                resourceHandler: resourceHandler,
                camera: new BattleCamera(0, 0),
            });

            hud = new BattleSquaddieSelectedHUD()

            expect(hud.shouldDrawNextButton(state)).toBeTruthy();
        });

        it('should not show the button if there is fewer than 2 player controllable squaddies', () => {
            const onePlayerOneEnemy = new BattleSquaddieRepository();
            onePlayerOneEnemy.addSquaddie(playerSquaddieStatic, playerSquaddieDynamic);
            onePlayerOneEnemy.addSquaddie(enemySquaddieStatic, enemySquaddieDynamic);
            const state = new BattleOrchestratorState({
                squaddieRepo: onePlayerOneEnemy,
                missionMap,
                resourceHandler: resourceHandler,
                camera: new BattleCamera(0, 0),
            });

            hud = new BattleSquaddieSelectedHUD();

            hud.selectSquaddieAndDrawWindow({
                dynamicId: playerSquaddieDynamic.dynamicSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            expect(hud.shouldDrawNextButton(state)).toBeFalsy();
        });

        it('clicking on the next button will select a different squaddie', () => {
            const battleCamera = new BattleCamera(0, 0);
            hud = new BattleSquaddieSelectedHUD();
            missionMap.addSquaddie(playerSquaddieStatic.staticId, playerSquaddieDynamic.dynamicSquaddieId, new HexCoordinate({
                q: 0,
                r: 0
            }));
            missionMap.addSquaddie(player2SquaddieStatic.staticId, player2SquaddieDynamic.dynamicSquaddieId, new HexCoordinate({
                q: 0,
                r: 1
            }));

            const state = new BattleOrchestratorState({
                squaddieRepo: squaddieRepository,
                missionMap,
                resourceHandler: resourceHandler,
                camera: battleCamera,
            });

            hud.selectSquaddieAndDrawWindow({
                dynamicId: playerSquaddieDynamic.dynamicSquaddieId,
                repositionWindow: {mouseX: 0, mouseY: 0},
                state,
            });

            expect(hud.selectedSquaddieDynamicId).toBe(playerSquaddieDynamic.dynamicSquaddieId);
            hud.mouseClicked(hud.nextSquaddieButton.rectangle.area.centerX, hud.nextSquaddieButton.rectangle.area.centerY, state,);
            expect(hud.selectedSquaddieDynamicId).toBe(player2SquaddieDynamic.dynamicSquaddieId);
            const panningInfo = battleCamera.getPanningInformation();
            const player2MapCoordinates = missionMap.getSquaddieByDynamicId(player2SquaddieDynamicId);
            expect(player2MapCoordinates.isValid()).toBeTruthy();
            const player2WorldCoordinates = convertMapCoordinatesToWorldCoordinates(
                player2MapCoordinates.mapLocation.q,
                player2MapCoordinates.mapLocation.r
            );

            expect(panningInfo.xDestination).toBe(player2WorldCoordinates[0]);
            expect(panningInfo.yDestination).toBe(player2WorldCoordinates[1]);
        });

        it('should respond to keyboard presses for the next squaddie, even if the HUD is not open', () => {
            const battleCamera = new BattleCamera(0, 0);
            hud = new BattleSquaddieSelectedHUD();
            const selectSpy = jest.spyOn((hud as any), "selectSquaddieAndDrawWindow");
            jest.spyOn((hud as any), "generateAffiliateIcon").mockImplementation(() => {
            });
            jest.spyOn((hud as any), "generateSquaddieActivityButtons").mockImplementation(() => {
            });
            jest.spyOn((hud as any), "generateNextSquaddieButton").mockImplementation(() => {
            });
            jest.spyOn((hud as any), "generateSquaddieIdText").mockImplementation(() => {
            });

            missionMap.addSquaddie(playerSquaddieStatic.staticId, playerSquaddieDynamic.dynamicSquaddieId, new HexCoordinate({
                q: 0,
                r: 0
            }));
            missionMap.addSquaddie(player2SquaddieStatic.staticId, player2SquaddieDynamic.dynamicSquaddieId, new HexCoordinate({
                q: 0,
                r: 1
            }));

            const state = new BattleOrchestratorState({
                squaddieRepo: squaddieRepository,
                missionMap,
                resourceHandler: resourceHandler,
                camera: battleCamera,
            });

            expect(hud.selectedSquaddieDynamicId).toBe("");
            hud.keyPressed(config.KEYBOARD_SHORTCUTS[KeyButtonName.NEXT_SQUADDIE][0], state);
            expect(selectSpy).toHaveBeenCalled();
            expect(hud.selectedSquaddieDynamicId).not.toBe("");
            expect(battleCamera.isPanning()).toBeTruthy();
        });
    });
});
