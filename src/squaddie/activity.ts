import {assertsInteger} from "../utils/mathAssert";
import {TraitStatusStorage} from "../trait/traitStatusStorage";

type RequiredOptions = {
    name: string;
    id: string;
    traits: TraitStatusStorage;
}

export type ActivityRange = {
    minimumRange: number | undefined;
    maximumRange: number | undefined;
}

type Options = ActivityRange & {
    actionsToSpend: number;
}

export class SquaddieActivity {
    name: string;
    id: string;
    minimumRange: number;
    maximumRange: number;
    actionsToSpend: number;
    traits: TraitStatusStorage;

    constructor(options: RequiredOptions & Partial<Options>) {
        this.name = options.name;
        this.id = options.id;

        if (options.minimumRange !== undefined) {
            assertsInteger(options.minimumRange);
        }
        if (options.maximumRange !== undefined) {
            assertsInteger(options.maximumRange);
        }
        if (options.actionsToSpend !== undefined) {
            assertsInteger(options.actionsToSpend);
        }

        this.minimumRange = options.minimumRange;
        this.maximumRange = options.maximumRange;

        if (options.actionsToSpend) {
            assertsInteger(options.actionsToSpend);
            this.actionsToSpend = options.actionsToSpend;
        } else {
            this.actionsToSpend = 1;
        }

        this.traits = options.traits;
    }
}
