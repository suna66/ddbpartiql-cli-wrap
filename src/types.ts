export type OptionType = {
    profile: undefined | string;
    region: undefined | string;
    endpoint: undefined | string;
    accessKey: undefined | string;
    secretAccessKey: undefined | string;
    script: undefined | string;
    debug: undefined | boolean;
};

export enum InputType {
    TYPE_CONTINUE = 0,
    TYPE_RUN = 1,
    TYPE_COMMENT = 2,
    TYPE_CLEAR = 3,
    TYPE_END = 9,
}

export const DELIMITTER = " ";
