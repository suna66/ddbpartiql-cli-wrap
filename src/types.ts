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
    TYPE_SHOW_HISTORY = 10,
    TYPE_SHOW_CURRENT_CMD = 11,
    TYPE_SHOW_VARIABLES = 12,
    TYPE_END = 99,
}

export const DELIMITTER = " ";
export const HISTORY_LIST_MAX = 30;
