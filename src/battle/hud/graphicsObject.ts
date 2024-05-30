import { TextBox } from "../../ui/textBox"

export enum BattleHUDGraphicsObjectTextBoxTypes {
    ACTION_POINTS = "ACTION_POINTS",
    SQUADDIE_ID = "SQUADDIE_ID",
    INVALID_COMMAND_WARNING_TEXT_BOX = "INVALID_COMMAND_WARNING_TEXT_BOX",
    HIT_POINTS = "HIT_POINTS",
}

export interface BattleHUDGraphicsObject {
    textBoxes: {
        [textBoxType in BattleHUDGraphicsObjectTextBoxTypes]?: TextBox
    }
}

export const BattleHUDGraphicsObjectsHelper = {
    new: (): BattleHUDGraphicsObject => {
        return {
            textBoxes: {
                [BattleHUDGraphicsObjectTextBoxTypes.ACTION_POINTS]: undefined,
            },
        }
    },
    lazySetTextBox: (
        objects: BattleHUDGraphicsObject,
        boxType: BattleHUDGraphicsObjectTextBoxTypes,
        textBox: TextBox
    ) => {
        if (objects.textBoxes[boxType] === undefined) {
            objects.textBoxes[boxType] = textBox
        }
    },
}
