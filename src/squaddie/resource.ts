export class SquaddieResource {
    mapIconResourceKey: string;

    constructor(options?: {
        mapIconResourceKey: string
    }) {
        if (!options) {
            options = {
                mapIconResourceKey: ""
            }
        }

        this.mapIconResourceKey = options.mapIconResourceKey;
    }
};

