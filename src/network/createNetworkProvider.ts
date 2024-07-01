import arg from 'arg';
import {
    Address,
    Cell,
    comment,
    type Contract,
    type ContractProvider,
    openContract,
    type OpenedContract,
    type Sender,
    type SenderArguments,
    SendMode, type StateInit,
    toNano, type Transaction,
    type TupleItem,
} from '@ton/core';
import { TonClient, TonClient4 } from '@ton/ton';
import { getHttpV4Endpoint } from '@orbs-network/ton-access';
import { type NetworkProvider } from './NetworkProvider';
import { type SendProvider } from './send/SendProvider';
import { FSStorage } from './storage/FSStorage';
import path from 'path';
import {type Config } from '@/config/Config';
import { mnemonicToPrivateKey } from '@ton/crypto';

export const argSpec = {
    '--mainnet': Boolean,
    '--testnet': Boolean,
    '--custom': String,
    '--custom-type': String,
    '--custom-version': String,
    '--custom-key': String,

    '--tonconnect': Boolean,
    '--deeplink': Boolean,
    '--tonhub': Boolean,
    '--mnemonic': Boolean,

    '--tonscan': Boolean,
    '--tonviewer': Boolean,
    '--toncx': Boolean,
    '--dton': Boolean,
};

export type Args = arg.Result<typeof argSpec>;

export type Network = 'mainnet' | 'testnet';


type ContractProviderFactory = (params: { address: Address, init?: StateInit | null }) => ContractProvider;

export class SendProviderSender implements Sender {
    #provider: SendProvider;
    readonly address?: Address;

    constructor(provider: SendProvider) {
        this.#provider = provider;
        this.address = provider.address();
    }

    async send(args: SenderArguments): Promise<void> {
        if (args.bounce !== undefined) {
            console.warn(
                "Warning: blueprint's Sender does not support `bounce` flag, because it is ignored by all used Sender APIs",
            );
            console.warn('To silence this warning, change your `bounce` flags passed to Senders to unset or undefined');
        }

        if (!(args.sendMode === undefined || args.sendMode === SendMode.PAY_GAS_SEPARATELY)) {
            throw new Error('Deployer sender does not support `sendMode` other than `PAY_GAS_SEPARATELY`');
        }

        await this.#provider.sendTransaction(args.to, args.value, args.body ?? undefined, args.init ?? undefined);
    }
}

export class WrappedContractProvider implements ContractProvider {
    #address: Address;
    #provider: ContractProvider;
    #init?: StateInit | null;
    #factory: ContractProviderFactory;

    constructor(address: Address, factory: ContractProviderFactory, init?: StateInit | null) {
        this.#address = address;
        this.#provider = factory({ address, init });
        this.#init = init;
        this.#factory = factory;
    }

    async getState() {
        return await this.#provider.getState();
    }

    async get(name: string, args: TupleItem[]) {
        return await this.#provider.get(name, args);
    }

    async external(message: Cell) {
        return await this.#provider.external(message);
    }

    async internal(
        via: Sender,
        args: {
            value: string | bigint;
            bounce: boolean | undefined | null;
            sendMode?: SendMode;
            body: string | Cell | undefined | null;
        },
    ) {
        const init = this.#init && (await this.getState()).state.type !== 'active' ? this.#init : undefined;

        return await via.send({
            to: this.#address,
            value: typeof args.value === 'string' ? toNano(args.value) : args.value,
            sendMode: args.sendMode,
            bounce: args.bounce,
            init,
            body: typeof args.body === 'string' ? comment(args.body) : args.body,
        });
    }

    open<T extends Contract>(contract: T): OpenedContract<T> {
        return openContract(contract, (params) => new WrappedContractProvider(params.address, this.#factory, params.init));
    }

    getTransactions(address: Address, lt: bigint, hash: Buffer, limit?: number): Promise<Transaction[]> {
        return this.#provider.getTransactions(address, lt, hash, limit);
    }
}

export class NetworkProviderImpl implements NetworkProvider {
    #tc: TonClient4 | TonClient;
    #sender: Sender;
    #network: Network;

    constructor(tc: TonClient4 | TonClient, sender: Sender, network: Network) {
        this.#tc = tc;
        this.#sender = sender;
        this.#network = network;
    }

    network(): 'mainnet' | 'testnet' | 'custom' {
        return this.#network;
    }

    sender(): Sender {
        return this.#sender;
    }

    api(): TonClient4 | TonClient {
        return this.#tc;
    }

    provider(address: Address, init?: StateInit | null): ContractProvider {
        const factory = (params: { address: Address, init?: StateInit | null }) => this.#tc.provider(params.address, params.init);
        return new WrappedContractProvider(address, factory, init);
    }

    async isContractDeployed(address: Address): Promise<boolean> {
        if (this.#tc instanceof TonClient4) {
            return this.#tc.isContractDeployed((await this.#tc.getLastBlock()).last.seqno, address);
        } else {
            return (await this.#tc.getContractState(address)).state === 'active';
        }
    }



    open<T extends Contract>(contract: T): OpenedContract<T> {
        return openContract(contract, (params) => this.provider(params.address, params.init ?? null));
    }

}


