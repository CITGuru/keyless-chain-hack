import axios from "axios"
import { ENSO_API_KEY } from "./constants";
import { getTokenDetailsByContract } from "./utils";
import { parseUnits } from "viem";


const BASE_URL = "https://li.quest/v1/"



export type LifiBasePayload = {
    fromChain: string;
    toChain: string;
    toToken: string;
    fromToken: string;
    fromAddress: string;
    toAddress: string;
    order: "CHEAPEST" | "FASTEST"
}


export type LifiSwapFromPayload = LifiBasePayload & {
    fromAmount: string;
}
export type LifiSwapToPayload = LifiBasePayload & {
    toAmount: string;
}

export type LifiSwapPayload = LifiSwapFromPayload | LifiSwapToPayload


export const LifiAgent = axios.create({
    baseURL: BASE_URL,
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENSO_API_KEY}`
    },
});


export const triggerLifiQuote = async (body: LifiSwapPayload) => {
    const req = await LifiAgent.get("/quote", {
        params: {
            ...body
        }
    })

    const data = req?.data


    let response = { ...data }
    response = { ...response, ...data.tx }
    delete response.tx

    return response
}
