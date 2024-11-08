import { parseUnits } from "viem";
import { NATIVE_TOKEN_ADDRESS } from "./constants";
import { buildTransferERC20, buildTransferNative, ETHAddress, getTokenDetailsByContract } from "./utils";
import { triggerSwapRoute } from "./enso";
import { constructBridgeTransaction } from "./bridgeEthPolygon";
import { triggerLifiQuote } from "./lifi";
import { AxiosError } from "axios";

enum IntentType {
    SEND = "send",
    SWAP = "swap",
    BRIDGE = "bridge"
}

interface Token {
    symbol: string;
    address: string;
}

interface Chain {
    chain_id: number;
    name?: string
}

interface TxParams {
    // Add parameters for the transaction as needed
    [key: string]: unknown;
}

abstract class IntentBase {
    type: IntentType;
    summary: string;

    constructor(type: IntentType, summary: string) {
        this.type = type;
        this.summary = summary;
    }
    // eslint-disable-next-line
    abstract buildTransaction(network: Chain, smartWalletAddress: string): any;
}

class SendIntent extends IntentBase {
    receiver: string;
    token: Token;
    amount: number;

    private constructor(token: Token, amount: number, receiver: string) {
        super(IntentType.SEND, `Transfer ${amount} ${token.symbol} to ${receiver}`);
        this.receiver = receiver;
        this.token = token;
        this.amount = amount;
    }

    static create(token: Token, amount: number, receiver: string): SendIntent {
        return new SendIntent(token, amount, receiver);
    }

    async buildTransaction(network: Chain, smartWalletAddress: string) {
        let tx: TxParams;

        const receiverAddress = new ETHAddress(this.receiver)

        await receiverAddress.resolve()

        const receiver = receiverAddress.hex || this.receiver

        if (this.token.address === NATIVE_TOKEN_ADDRESS) {
            tx = buildTransferNative(smartWalletAddress, receiver, this.amount);
        } else {
            tx = await buildTransferERC20(this.token.address, receiver, this.amount, smartWalletAddress);
        }

        console.log(this.amount, NATIVE_TOKEN_ADDRESS, tx)
        return tx;
    }
}

class SwapIntent extends IntentBase {
    fromToken: Token;
    toToken: Token;
    amount: number;

    private constructor(fromToken: Token, toToken: Token, amount: number) {
        super(IntentType.SWAP, `Swap amount worth of ${amount} from ${fromToken.symbol} to ${toToken.symbol}`);
        this.fromToken = fromToken;
        this.toToken = toToken;
        this.amount = amount;
    }

    static create(fromToken: Token, toToken: Token, amount: number): SwapIntent {
        return new SwapIntent(fromToken, toToken, amount);
    }

    async buildTransaction(network: Chain, fromAddress: string) {
        const token = getTokenDetailsByContract(this.fromToken.address)

        const decimal = token?.decimals || 18

        const amount = parseUnits(this.amount.toString(), decimal)

        console.log(amount, token)

        // const req = await triggerSwapRoute({ fromAddress: fromAddress, chainId: network.chain_id, tokenIn: this.fromToken.address, tokenOut: this.toToken.address, amountIn: amount.toString() })



        let req;

        try {

            let toToken = this.toToken.address;
            let fromToken = this.fromToken.address;

            if (toToken == NATIVE_TOKEN_ADDRESS) {
                toToken = "0x0000000000000000000000000000000000000000"
            }

            if (fromToken == NATIVE_TOKEN_ADDRESS) {
                fromToken = "0x0000000000000000000000000000000000000000"
            }

            const lifi = await triggerLifiQuote({
                fromChain: network.chain_id.toString(),
                toChain: network.chain_id.toString(),
                toToken: toToken,
                fromToken: fromToken,
                fromAmount: amount.toString(),
                fromAddress: fromAddress,
                toAddress: fromAddress,
                order: 'FASTEST'
            })

            req = {
                ...lifi,
                ...lifi.transactionRequest
            }

        } catch (e: any) {
            console.log(e)
            if (e?.response?.status == 404 && e?.response?.data?.message == "No available quotes for the requested transfer") {
                req = await triggerSwapRoute({ fromAddress: fromAddress, chainId: network.chain_id, tokenIn: this.fromToken.address, tokenOut: this.toToken.address, amountIn: amount.toString() })
            }
        }

        return req

    }
}


class BridgeIntent extends IntentBase {
    fromChain: Chain;
    toChain: Chain;
    fromToken: Token;
    toToken: Token;
    amount: number;

    private constructor(fromChain: Chain, toChain: Chain, fromToken: Token, toToken: Token, amount: number) {
        super(IntentType.BRIDGE, `Bridge amount worth of ${amount} ${fromToken.symbol} from ${fromChain.name} to  ${toChain.name}`);
        this.fromChain = fromChain;
        this.toChain = toChain
        this.amount = amount;
        this.fromToken = fromToken;
        this.toToken = toToken;

    }

    static create(fromChain: Chain, toChain: Chain, fromToken: Token, toToken: Token, amount: number): BridgeIntent {
        return new BridgeIntent(fromChain, toChain, fromToken, toToken, amount);
    }

    async buildTransaction(network: Chain, fromAddress: string) {
        const token = getTokenDetailsByContract(this.fromToken.address)
        // console.log(token, this.token.address)
        // console.log(token, this.fromChain, this.toChain)

        const decimal = token?.decimals || 18

        const amount = parseUnits(this.amount.toString(), decimal)

        let req

        let toToken = this.toToken.address;
        let fromToken = this.fromToken.address;

        if (toToken == NATIVE_TOKEN_ADDRESS) {
            toToken = "0x0000000000000000000000000000000000000000"
        }

        if (fromToken == NATIVE_TOKEN_ADDRESS) {
            fromToken = "0x0000000000000000000000000000000000000000"
        }

        const lifi = await triggerLifiQuote({
            fromChain: this.fromChain.chain_id.toString() || "1",
            toChain: this.toChain.chain_id.toString() || "1",
            toToken: toToken,
            fromToken: fromToken,
            fromAmount: amount.toString(),
            fromAddress: fromAddress,
            toAddress: fromAddress,
            order: 'FASTEST'
        })

        req = {
            ...lifi,
            ...lifi.transactionRequest
        }

        // const req = await constructBridgeTransaction(fromAddress, this.token.address, amount)
        return req

    }
}


type Intent = SendIntent | SwapIntent | BridgeIntent
// eslint-disable-next-line
export function loadIntent(intentData: Record<string, any>): Intent {
    switch (intentData.type) {
        case IntentType.SEND:
            return SendIntent.create(
                {
                    symbol: intentData.token.symbol,
                    address: intentData.token.address,
                },
                intentData.amount,
                intentData.receiver
            );
        case IntentType.SWAP:
            return SwapIntent.create(
                {
                    symbol: intentData.tokenIn.symbol,
                    address: intentData.tokenIn.address,
                },
                {
                    symbol: intentData.tokenOut.symbol,
                    address: intentData.tokenOut.address,
                },
                intentData.amount
            );
        case IntentType.BRIDGE:
            return BridgeIntent.create(
                {
                    chain_id: intentData.fromChain.chain_id,
                    name: intentData.fromChain.name,
                },
                {
                    chain_id: intentData.toChain.chain_id,
                    name: intentData.toChain.name,
                },
                {
                    symbol: intentData.fromToken.symbol,
                    address: intentData.fromToken.address,
                },
                {
                    symbol: intentData.toToken.symbol,
                    address: intentData.toToken.address,
                },
                intentData.amount
            );
        default:
            throw new Error(`Unknown intent type: ${intentData.type}`);
    }
}
