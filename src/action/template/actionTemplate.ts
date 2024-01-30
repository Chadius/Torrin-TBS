export interface ActionTemplate {
    id: string;
    name: string;
}

export const ActionTemplateService = {
    new: ({
        id,
        name,
          }: {
        id?: string,
        name: string,
    }): ActionTemplate => {
        return {
            id,
            name,
        }
    }
}
