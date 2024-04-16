import { TOKEN } from "./constant";

export type Token = (typeof TOKEN)[number]

export type Address = {
    [key in Token]: string;
};
