import { getRoutes, RoutesRequest } from "@lifi/sdk";
import { Address, batchTx, BridgePlugin, encodeBridgingOps, rawTx, buildItx, singleTx, TransactionBatch } from "klaster-sdk";
import { Hex, } from "viem";
import {
    buildMultichainReadonlyClient,
    buildRpcInfo,
    initKlaster,
    klasterNodeHost,
    loadBicoV2Account,
} from "klaster-sdk";
import { ERC20_ABI } from './abi'
import { mainnet, optimism, step } from 'viem/chains'
import { createWalletClient, custom, http, encodeFunctionData } from "viem";


export const liFiBrigePlugin: BridgePlugin = async (data) => {

    const routesRequest: RoutesRequest = {
        fromChainId: data.sourceChainId,
        toChainId: data.destinationChainId,
        fromTokenAddress: data.sourceToken,
        toTokenAddress: data.destinationToken,
        fromAmount: data.amount.toString(),
        options: {
            order: "FASTEST",
        },
    };

    const result = await getRoutes(routesRequest);
    const route = result.routes.at(0)

    if (!route) {
        throw Error('...');
    }

    const routeSteps = route.steps.map(step => {
        if (!step.transactionRequest) { throw Error('...') }
        const { to, gasLimit, data, value } = step.transactionRequest
        if (!to || !gasLimit || !data || !value) { throw Error('...') }
        return rawTx({
            to: to as Address,
            gasLimit: BigInt(gasLimit),
            data: data as Hex,
            value: BigInt(value)
        })
    })

    return {
        receivedOnDestination: BigInt(route.toAmountMin),
        txBatch: batchTx(data.sourceChainId, routeSteps)
    }
};


export const bootStrapKlaster = async (provider: any) => {

    const klasterSigner = createWalletClient({
        transport: custom(provider),
    });

    const [address] = await klasterSigner.getAddresses();


    const klaster = await initKlaster({
        accountInitData: loadBicoV2Account({
            owner: address, // Fetch
        }),
        nodeUrl: klasterNodeHost.default,
    });



    return {
        klaster,
        klasterSigner,
        address
    }
}


export const constructRawKlasterErc20Transfer = (tokenAddress: `0x${string}`, address: string, amount: number, gasLimit: bigint) => {
    const sendERC20Op = rawTx({
        gasLimit: gasLimit,
        to: tokenAddress,
        data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "transfer",
            args: [address, amount],
        }),
    });
    return sendERC20Op
}


export const constructRawKlasterTxData = (toAddress: `0x${string}`, data: Hex, value: bigint, gasLimit: bigint) => {
    const tx = rawTx({
        gasLimit: gasLimit,
        to: toAddress,
        data: data,
        value: value || BigInt(0)
    });
    return tx
}


export const buildTransaction = async (provider: any, steps: TransactionBatch[], chain: number = mainnet.id) => {

    const { klaster } = await bootStrapKlaster(provider)

    const iTx = buildItx({
        // BridgingOPs + Execution on the destination chain
        // added as steps to the iTx
        steps: steps,
        // Klaster works with cross-chain gas abstraction. This instructs the Klaster
        // nodes to take USDC on Optimism as tx fee payment.
        feeTx: klaster.encodePaymentFee(chain, "USDC"),
    });

    return iTx
}

type AIAction = {
    txData: {
        gas: string;
        data: string | Hex;
        value: string | number | bigint;
        to: string;
        from: string;
        chainId: string | undefined;
        [x: string]: any
    };
    [x: string]: any
}

export const convertActionsToKlasterRawSteps = (actions: AIAction[], chain: string) => {
    let steps: TransactionBatch[] = []
    for (const action of actions) {
        const chainId = Number(action.txData.chainId || chain)

        let lastIndex = 0
        let step = steps.find((s, i) => { lastIndex = i; return s.chainId == chainId })

        if (step) {
            const tx = constructRawKlasterTxData(action.txData.to as `0x${string}`, action.txData.data as Hex, BigInt(action.txData.value), BigInt(action.txData.gas))
            step.txs.push(tx)
            steps[lastIndex] = step
        } else {
            const tx = constructRawKlasterTxData(action.txData.to as `0x${string}`, action.txData.data as Hex, BigInt(action.txData.value), BigInt(action.txData.gas))
            steps.push({ chainId: chainId, txs: [tx] })
        }
    }
    return steps
}
