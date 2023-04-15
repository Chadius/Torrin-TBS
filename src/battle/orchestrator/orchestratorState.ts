export type OrchestratorStateOptions = {
    displayMap: boolean;
}

export class OrchestratorState {
    displayMap: boolean;

    constructor(options: Partial<OrchestratorStateOptions> = {}) {
        this.displayMap = options.displayMap || false;
    }
}