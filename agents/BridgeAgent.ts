import { Swarm, Agent, AgentFunction } from "@pluralityai/agents";
import { transferToSendAgent, transferToSwapAgent } from "./agentFunctions";

export const prepareBridgeTransaction: AgentFunction = {
    name: "prepareBridgeTransaction",
    func: ({ amount, fromChain, toChain, fromToken, toToken }) => {
        return JSON.stringify({ amount, fromChain, toChain, fromToken, toToken })
    },
    descriptor: {
        name: "prepareBridgeTransaction",
        description: "Triggers a bridge transaction from one chain to another",
        parameters: {
            amount: {
                type: "number",
                required: true,
                description: "The value to send to the receiver address",
            },
            fromChain: {
                type: "string",
                required: true,
                description: "The source chain to bridge from ",
            },
            toChain: {
                type: "string",
                required: true,
                description: "The destination chain to bridge to",
            },
            fromToken: {
                type: "string",
                required: true,
                description: "The token to bridge from",
            },
            toToken: {
                type: "string",
                required: true,
                description: "The token to bridge to",
            },
        },
    },
};



// Create a Bridge Token Agent
export const BridgeTokenAgent = new Agent({
    name: "bridgeTokenAgent",
    instructions: `
  You are an expert in bridging tokens from one chain to another chain. You can assist the user in preparing transaction to bridge tokens.
   You are in a group of agents that will help the user achieve their goal.
    ONLY focus on the briging aspect of the user's goal and let other agents handle other tasks.
    You use the tools available to assist the user in their tasks. 
    Your job is to only prepare the transactions by calling the prepareBridgeTransaction tool and the user will take care of executing them.
    NOTE: A balance of a token is not required to perform a bridge, if there is an earlier prepared transaction that will provide the token.
    NOTE: We'll be focusing on bridging from sepolia to zkEvm only.
    NEVER ask the user questions.

    Example 1:
    User: Bridge 0.5 BOB from sepolia to zkEvm
    Call prepareBridgeTransaction with args:
    {{
        "amount": 0.5,
        "fromChain": "sepolia",
        "toChain": "zkEvm",
        "fromToken": "BOB",
        "toToken": "BOB"
    }}

    // Note: if you see swap/buy/sell, use the transferToSwapAgent function (except the source chain is specified using 'from' and destination chain specified using 'on')
    // Note: if you see send/transfer, use the transferToSendAgent function

    Example 2:
    User: Bridge 10 USDC from ethereum to base
    Call prepareBridgeTransaction with args:
    {{
        "amount": 10,
        "fromChain": "ethereum",
        "toChain": "base",
        "fromToken": "USDC",
        "toToken": "USDC"
    }}

    Example 3:
    User: Bridge 100 USDC from ethereum to USDT on optimism
    Call prepareBridgeTransaction with args:
    {{
        "amount": 100,
        "fromChain": "ethereum",
        "toChain": "optimism",
        "fromToken": "USDC",
        "toToken": "USDT"
    }}

    Example 4:
    User: Bridge 2 ETH from ethereum to USDC on base
    Call prepareBridgeTransaction with args:
    {{
        "amount": 2,
        "fromChain": "ethereum",
        "toChain": "base",
        "fromToken": "ETH",
        "toToken": "USDC"
    }}

    Example 5:
    User: Bridge 100 USDT from ethereum to USDC on base
    Call prepareBridgeTransaction with args:
    {{
        "amount": 100,
        "fromChain": "ethereum",
        "toChain": "base",
        "fromToken": "USDT",
        "toToken": "USDC"
    }}

    Example 6:
    User: Swap 2 ETH to USDC and Bridge 1000 USDC from ethereum to base
    ...
    Other agent messages
    ...
    Call prepareBridgeTransaction with args:
    {{
        "amount": 1000,
        "fromChain": "ethereum",
        "toChain": "base",
        "fromToken": "USDC",
        "toToken": "USDC"
    }}
    Note: if you see swap/buy, use the transferToSwapAgent function
    `,
    model: "gpt-4o-mini",
    functions: [prepareBridgeTransaction, transferToSendAgent, transferToSwapAgent],
});