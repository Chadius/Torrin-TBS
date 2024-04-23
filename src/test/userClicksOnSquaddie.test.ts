import {SquaddieTemplate, SquaddieTemplateService} from "../campaign/squaddieTemplate";
import {ObjectRepository, ObjectRepositoryService} from "../battle/objectRepository";
import {BattleSquaddie, BattleSquaddieService} from "../battle/battleSquaddie";
import {SquaddieIdService} from "../squaddie/id";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {ActionTemplate, ActionTemplateService} from "../action/template/actionTemplate";
import {ActionEffectSquaddieTemplateService} from "../action/template/actionEffectSquaddieTemplate";
import {Trait, TraitStatusStorageService} from "../trait/traitStatusStorage";
import {BattleSquaddieSelectedHUD} from "../battle/hud/battleSquaddieSelectedHUD";
import {GameEngineState, GameEngineStateService} from "../gameEngine/gameEngine";
import {BattleOrchestratorStateService} from "../battle/orchestrator/battleOrchestratorState";
import {BattleStateService} from "../battle/orchestrator/battleState";
import {BattleCamera} from "../battle/battleCamera";
import {MakeDecisionButton} from "../squaddie/makeDecisionButton";
import * as mocks from "../utils/test/mocks";
import {makeResult} from "../utils/ResultOrError";
import {ResourceHandler} from "../resource/resourceHandler";
import {MissionMap, MissionMapService} from "../missionMap/missionMap";
import {TerrainTileMap} from "../hexMap/terrainTileMap";
import {convertMapCoordinatesToScreenCoordinates} from "../hexMap/convertCoordinates";
import {OrchestratorComponentMouseEventType} from "../battle/orchestrator/battleOrchestratorComponent";
import {BattlePlayerSquaddieSelector} from "../battle/orchestratorComponents/battlePlayerSquaddieSelector";
import {BattleSquaddieTeam, BattleSquaddieTeamService} from "../battle/battleSquaddieTeam";
import {BattlePhaseState, BattlePhaseStateService} from "../battle/orchestratorComponents/battlePhaseController";
import {BattlePhase} from "../battle/orchestratorComponents/battlePhaseTracker";
import {CampaignService} from "../campaign/campaign";
import {RectAreaService} from "../ui/rectArea";
import {TextBoxHelper} from "../ui/textBox";
import {ActionsThisRound} from "../battle/history/actionsThisRound";
import {MouseButton} from "../utils/mouseConfig";

describe('User clicks on a squaddie', () => {
    let repository: ObjectRepository;

    let playerTeam: BattleSquaddieTeam;
    let playerSquaddieTemplate: SquaddieTemplate;
    let playerBattleSquaddie: BattleSquaddie;

    let attackAction: ActionTemplate;

    let battleSquaddieSelectedHUD: BattleSquaddieSelectedHUD;

    let resourceHandler: ResourceHandler;
    let missionMap: MissionMap;

    beforeEach(() => {
        repository = ObjectRepositoryService.new();
        attackAction = ActionTemplateService.new({
            id: "action",
            name: "action",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    })
                })
            ]
        });

        playerSquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                name: "player",
                affiliation: SquaddieAffiliation.PLAYER,
                templateId: "player",
            }),
            actionTemplates: [attackAction],
        });
        ObjectRepositoryService.addSquaddieTemplate(repository, playerSquaddieTemplate);

        playerBattleSquaddie = BattleSquaddieService.new({
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "player 0",
        });
        ObjectRepositoryService.addBattleSquaddie(repository, playerBattleSquaddie);

        playerTeam = BattleSquaddieTeamService.new({
            name: "player team",
            id: "player",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: [playerBattleSquaddie.battleSquaddieId],
        });

        battleSquaddieSelectedHUD = new BattleSquaddieSelectedHUD();

        resourceHandler = mocks.mockResourceHandler();
        resourceHandler.areAllResourcesLoaded = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
        resourceHandler.getResource = jest.fn().mockReturnValue(makeResult({width: 1, height: 1}));

        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        });
    });

    it('HUD produces a button for each ActionTemplate', () => {
        const attackAction2 = ActionTemplateService.new({
            id: "action",
            name: "action",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    })
                })
            ]
        });
        repository.squaddieTemplates[playerSquaddieTemplate.squaddieId.templateId].actionTemplates.push(attackAction2);
        selectSquaddieForTheHUD({
            battleSquaddie: playerBattleSquaddie,
            battleSquaddieSelectedHUD,
            gameEngineState: getGameEngineState({
                resourceHandler,
                missionMap,
                repository,
                teams: [],
                battlePhaseState: undefined,
            }),
        });

        expect(battleSquaddieSelectedHUD.selectedBattleSquaddieId).toEqual(playerBattleSquaddie.battleSquaddieId);

        const actionButtons: MakeDecisionButton[] = battleSquaddieSelectedHUD.getUseActionButtons();
        expect(actionButtons).toHaveLength(2);

        expect(actionButtons.find((button) => {
            return button.actionTemplate.id === attackAction.id;
        })).toBeTruthy();

        expect(actionButtons.find((button) => {
            return button.actionTemplate.id === attackAction2.id;
        })).toBeTruthy();
    });

    describe('BattlePlayerSquaddieSelector clicks on a squaddie to start their turn', () => {
        let gameEngineState: GameEngineState;
        beforeEach(() => {
            gameEngineState = getGameEngineState({
                resourceHandler,
                missionMap,
                repository,
                teams: [playerTeam],
                battlePhaseState: BattlePhaseStateService.new({
                    currentAffiliation: BattlePhase.PLAYER,
                    turnCount: 0,
                }),
            });
            MissionMapService.addSquaddie(missionMap, playerSquaddieTemplate.squaddieId.templateId, playerBattleSquaddie.battleSquaddieId, {
                q: 0,
                r: 0
            });
        });
        const selectorClicksOnSquaddie = (gameEngineState: GameEngineState) => {
            const selector = new BattlePlayerSquaddieSelector();
            let [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 0, ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates());
            selector.mouseEventHappened(gameEngineState, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX,
                mouseY,
                mouseButton: MouseButton.ACCEPT,
            });
        };

        it('BattlePlayerSquaddieSelector does not create an ActionsThsRound object when the player clicks on a squaddie to start their turn', () => {
            selectorClicksOnSquaddie(gameEngineState);

            const battleState = gameEngineState.battleOrchestratorState.battleState;
            expect(battleState.actionsThisRound).toBeUndefined();
        });

        it('Map should highlight all the tiles it can reach when BattlePlayerSquaddieSelector selects a squaddie', () => {
            const highlightSpy = jest.spyOn(missionMap.terrainTileMap, "highlightTiles");
            selectorClicksOnSquaddie(gameEngineState);
            expect(highlightSpy).toBeCalled();
        });
    });

    it('BattlePlayerSquaddieSelector does not create an ActionsThsRound when the player clicks on a different squaddie to start their turn', () => {
        const player2 = BattleSquaddieService.new({
            battleSquaddieId: "player 2",
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
        });
        ObjectRepositoryService.addBattleSquaddie(repository, player2);
        BattleSquaddieTeamService.addBattleSquaddieIds(playerTeam, [player2.battleSquaddieId]);

        const gameEngineState = getGameEngineState({
            resourceHandler,
            missionMap,
            repository,
            teams: [playerTeam],
            battlePhaseState: BattlePhaseStateService.new({
                currentAffiliation: BattlePhase.PLAYER,
                turnCount: 0,
            }),
        });

        MissionMapService.addSquaddie(missionMap, playerSquaddieTemplate.squaddieId.templateId, playerBattleSquaddie.battleSquaddieId, {
            q: 0,
            r: 0
        });
        MissionMapService.addSquaddie(missionMap, player2.squaddieTemplateId, player2.battleSquaddieId, {q: 0, r: 1});

        const selector = new BattlePlayerSquaddieSelector();
        let [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 0, ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates());
        selector.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
            mouseButton: MouseButton.ACCEPT,
        });

        ([mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 1, ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates()));
        selector.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
            mouseButton: MouseButton.ACCEPT,
        });

        const battleState = gameEngineState.battleOrchestratorState.battleState;
        expect(battleState.actionsThisRound).toBeUndefined();
    });

    it('HUD presents a warning if the squaddie is out of actions', () => {
        const actionCostIsTooHigh = ActionTemplateService.new({
            id: "too many action points",
            name: "too many action points",
            actionPoints: 9001,
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    })
                })
            ]
        });
        repository.squaddieTemplates[playerSquaddieTemplate.squaddieId.templateId].actionTemplates.push(actionCostIsTooHigh);
        selectSquaddieForTheHUD({
            battleSquaddie: playerBattleSquaddie,
            battleSquaddieSelectedHUD,
            gameEngineState: getGameEngineState({
                resourceHandler,
                missionMap,
                repository,
                teams: [],
                battlePhaseState: undefined,
            }),
        });
        const gameEngineState = getGameEngineState({
            resourceHandler,
            missionMap,
            repository,
            teams: [playerTeam],
            battlePhaseState: BattlePhaseStateService.new({
                currentAffiliation: BattlePhase.PLAYER,
                turnCount: 0,
            }),
        });

        const actionButtons: MakeDecisionButton[] = battleSquaddieSelectedHUD.getUseActionButtons();

        const actionButton = actionButtons.find((button) => {
            return button.actionTemplate.id === actionCostIsTooHigh.id;
        });

        battleSquaddieSelectedHUD.mouseClicked({
            mouseX: RectAreaService.centerX(actionButton.buttonArea),
            mouseY: RectAreaService.centerY(actionButton.buttonArea),
            gameEngineState,
            mouseButton: MouseButton.ACCEPT,
        });

        expect(TextBoxHelper.isDone(battleSquaddieSelectedHUD.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX)).toBeFalsy();
        expect(battleSquaddieSelectedHUD.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX.text).toEqual("Need 9001 action points");
    });

    it('HUD presents a warning if the squaddie’s affiliation does not match the Phase', () => {
        const {enemyTeam, enemyBattleSquaddie, enemySquaddieTemplate} = setupEnemyTeam({attackAction, repository});

        const gameEngineState = getGameEngineState({
            resourceHandler,
            missionMap,
            repository,
            teams: [playerTeam, enemyTeam],
            battlePhaseState: BattlePhaseStateService.new({
                currentAffiliation: BattlePhase.ENEMY,
                turnCount: 0,
            }),
        });

        MissionMapService.addSquaddie(missionMap, enemyBattleSquaddie.squaddieTemplateId, enemyBattleSquaddie.battleSquaddieId, {
            q: 0,
            r: 0
        });

        selectSquaddieForTheHUD({
            battleSquaddie: enemyBattleSquaddie,
            battleSquaddieSelectedHUD,
            gameEngineState,
        });

        expect(battleSquaddieSelectedHUD.selectedBattleSquaddieId).toEqual(enemyBattleSquaddie.battleSquaddieId);

        battleSquaddieSelectedHUD.drawUncontrollableSquaddieWarning(gameEngineState);

        expect(TextBoxHelper.isDone(battleSquaddieSelectedHUD.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX)).toBeFalsy();
        expect(battleSquaddieSelectedHUD.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX.text).toEqual(`You cannot control ${enemySquaddieTemplate.squaddieId.name}`);
    });
});

const getGameEngineState = ({
                                resourceHandler,
                                missionMap,
                                repository,
                                teams,
                                battlePhaseState,
                                actionsThisRound,
                            }: {
    resourceHandler: ResourceHandler,
    missionMap: MissionMap,
    repository: ObjectRepository,
    teams: BattleSquaddieTeam[],
    battlePhaseState: BattlePhaseState,
    actionsThisRound?: ActionsThisRound,
}): GameEngineState => {
    return GameEngineStateService.new({
        resourceHandler: resourceHandler,
        battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({

            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                campaignId: "test campaign",
                missionMap,
                camera: new BattleCamera(0, 0),
                teams,
                battlePhaseState,
                actionsThisRound,
            }),
        }),
        repository,
        campaign: CampaignService.default({}),
    });
}

const selectSquaddieForTheHUD = ({
                                     battleSquaddie,
                                     battleSquaddieSelectedHUD,
                                     gameEngineState,
                                 }: {
    battleSquaddie: BattleSquaddie,
    battleSquaddieSelectedHUD: BattleSquaddieSelectedHUD,
    gameEngineState: GameEngineState,
}) => {
    battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
        battleId: battleSquaddie.battleSquaddieId,
        state: gameEngineState,
        repositionWindow: {mouseX: 0, mouseY: 0},
    });
}

const setupEnemyTeam = ({attackAction, repository}: {
    attackAction: ActionTemplate,
    repository: ObjectRepository,
}): {
    enemySquaddieTemplate: SquaddieTemplate,
    enemyBattleSquaddie: BattleSquaddie,
    enemyTeam: BattleSquaddieTeam,
} => {
    const enemySquaddieTemplate = SquaddieTemplateService.new({
        squaddieId: SquaddieIdService.new({
            name: "enemy",
            affiliation: SquaddieAffiliation.ENEMY,
            templateId: "enemy",
        }),
        actionTemplates: [attackAction],
    });
    ObjectRepositoryService.addSquaddieTemplate(repository, enemySquaddieTemplate);

    const enemyBattleSquaddie = BattleSquaddieService.new({
        squaddieTemplateId: enemySquaddieTemplate.squaddieId.templateId,
        battleSquaddieId: "enemy 0",
    });
    ObjectRepositoryService.addBattleSquaddie(repository, enemyBattleSquaddie);

    const enemyTeam = BattleSquaddieTeamService.new({
        name: "enemy team",
        id: "enemy",
        affiliation: SquaddieAffiliation.ENEMY,
        battleSquaddieIds: [enemyBattleSquaddie.battleSquaddieId],
    });

    return {
        enemySquaddieTemplate,
        enemyBattleSquaddie,
        enemyTeam,
    }
}

const addAnotherPlayer = ({
                              playerSquaddieTemplate,
                              repository,
                              playerTeam,
                          }: {
    playerSquaddieTemplate: SquaddieTemplate,
    repository: ObjectRepository,
    playerTeam: BattleSquaddieTeam,
}): {
    player2: BattleSquaddie
} => {
    const player2 = BattleSquaddieService.new({
        battleSquaddieId: "player 2",
        squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
    });
    ObjectRepositoryService.addBattleSquaddie(repository, player2);
    BattleSquaddieTeamService.addBattleSquaddieIds(playerTeam, [player2.battleSquaddieId]);

    return {
        player2
    }
}
