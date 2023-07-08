import {CreateNewSquaddieAndAddToRepository} from "../utils/test/squaddie";
import {SquaddieAffiliation} from "./squaddieAffiliation";
import {BattleSquaddieRepository} from "../battle/battleSquaddieRepository";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battle/battleSquaddie";
import {
    CanPlayerControlSquaddieRightNow,
    CanSquaddieActRightNow,
    GetArmorClass,
    GetHitPoints,
    GetNumberOfActions
} from "./squaddieService";
import {ArmyAttributes} from "./armyAttributes";

describe('Squaddie Service', () => {
    let playerStatic: BattleSquaddieStatic;
    let playerDynamic: BattleSquaddieDynamic;
    let enemyStatic: BattleSquaddieStatic;
    let enemyDynamic: BattleSquaddieDynamic;
    let squaddieRepository: BattleSquaddieRepository;

    beforeEach(() => {
        squaddieRepository = new BattleSquaddieRepository();
        ({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
            } =
                CreateNewSquaddieAndAddToRepository({
                    name: "Player",
                    staticId: "player",
                    dynamicId: "player",
                    affiliation: SquaddieAffiliation.PLAYER,
                    squaddieRepository,
                    attributes: new ArmyAttributes({
                        armorClass: 3,
                        maxHitPoints: 5,
                    })
                })
        );

        ({
                staticSquaddie: enemyStatic,
                dynamicSquaddie: enemyDynamic,
            } =
                CreateNewSquaddieAndAddToRepository({
                    name: "Enemy",
                    staticId: "enemy",
                    dynamicId: "enemy",
                    affiliation: SquaddieAffiliation.ENEMY,
                    squaddieRepository,
                })
        );
    });

    describe('Turns Remaining', () => {
        it('returns the number of actions', () => {
            let {
                normalActionsRemaining
            } = GetNumberOfActions({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
            });
            expect(normalActionsRemaining).toBe(3);

            playerDynamic.squaddieTurn.spendNumberActions(1);
            ({
                normalActionsRemaining
            } = GetNumberOfActions({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
            }));
            expect(normalActionsRemaining).toBe(2);
        });
    });

    describe('Current Armor Class', () => {
        it('Returns the normal armor class', () => {
            let {
                normalArmorClass,
            } = GetArmorClass({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
            });

            expect(normalArmorClass).toBe(3);
        });
    });

    describe('Current HP', () => {
        it('Returns the maximum HP', () => {
            let {
                maxHitPoints,
            } = GetHitPoints({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
            });

            expect(maxHitPoints).toBe(5);
        });
    });

    describe('Squaddie can still act', () => {
        it('can act by default', () => {
            let {
                canAct,
                hasActionsRemaining,
            } = CanSquaddieActRightNow({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
            });

            expect(canAct).toBeTruthy();
            expect(hasActionsRemaining).toBeTruthy();
        });
        it('cannot act because it is out of actions', () => {
            playerDynamic.squaddieTurn.spendNumberActions(3);
            let {
                canAct,
                hasActionsRemaining,
            } = CanSquaddieActRightNow({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
            });

            expect(canAct).toBeFalsy();
            expect(hasActionsRemaining).toBeFalsy();
        });
    });

    describe('Player can control', () => {
        it('checks when the player controlled squaddie has actions', () => {
            let {
                squaddieHasThePlayerControlledAffiliation,
                squaddieCanCurrentlyAct,
                playerCanControlThisSquaddieRightNow,
            } = CanPlayerControlSquaddieRightNow({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
            });

            expect(squaddieHasThePlayerControlledAffiliation).toBeTruthy();
            expect(squaddieCanCurrentlyAct).toBeTruthy();
            expect(playerCanControlThisSquaddieRightNow).toBeTruthy();
        });
        it('checks when the player controlled squaddie has no actions', () => {
            playerDynamic.squaddieTurn.spendNumberActions(3);
            let {
                squaddieHasThePlayerControlledAffiliation,
                squaddieCanCurrentlyAct,
                playerCanControlThisSquaddieRightNow,
            } = CanPlayerControlSquaddieRightNow({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
            });
            expect(squaddieHasThePlayerControlledAffiliation).toBeTruthy();
            expect(squaddieCanCurrentlyAct).toBeFalsy();
            expect(playerCanControlThisSquaddieRightNow).toBeFalsy();
        });
        it('checks when the enemy controlled squaddie has actions', () => {
            let {
                squaddieHasThePlayerControlledAffiliation,
                squaddieCanCurrentlyAct,
                playerCanControlThisSquaddieRightNow,
            } = CanPlayerControlSquaddieRightNow({
                staticSquaddie: enemyStatic,
                dynamicSquaddie: enemyDynamic,
            });
            expect(squaddieHasThePlayerControlledAffiliation).toBeFalsy();
            expect(squaddieCanCurrentlyAct).toBeTruthy();
            expect(playerCanControlThisSquaddieRightNow).toBeFalsy();
        });
    });
});
