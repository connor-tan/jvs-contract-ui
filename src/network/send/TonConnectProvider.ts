import TonConnect, {type IStorage,type WalletInfo,type WalletInfoRemote } from '@tonconnect/sdk';
import { Address, beginCell, Cell,type StateInit, storeStateInit } from '@ton/core';
import {type SendProvider } from './SendProvider';
import {type Storage } from '../storage/Storage';

class TonConnectStorage implements IStorage {
    #inner: Storage;

    constructor(inner: Storage) {
        this.#inner = inner;
    }

    async setItem(key: string, value: string): Promise<void> {
        return await this.#inner._setItem(key, value);
    }
    async getItem(key: string): Promise<string | null> {
        return await this.#inner._getItem(key);
    }
    async removeItem(key: string): Promise<void> {
        return await this.#inner._removeItem(key);
    }
}

function isRemote(walletInfo: WalletInfo): walletInfo is WalletInfoRemote {
    return 'universalLink' in walletInfo && 'bridgeUrl' in walletInfo;
}

export class TonConnectProvider implements SendProvider {
    #connector: TonConnect;

    constructor(storage: Storage) {
        this.#connector = new TonConnect({
            storage: new TonConnectStorage(storage),
            manifestUrl:
                'https://raw.githubusercontent.com/ton-org/blueprint/main/tonconnect/manifest.json',
        });
    }

    async getWalletInfo(): Promise<WalletInfoRemote[]> {
        return (await this.#connector.getWallets()).filter(isRemote);
    }

    async connect(walletInfo : WalletInfoRemote): Promise<void> {
        await this.connectWallet(walletInfo);
        console.log(
            `Connected to wallet at address: ${Address.parse(this.#connector.wallet!.account.address).toString()}\n`,
        );
    }

    address(): Address | undefined {
        if (!this.#connector.wallet) return undefined;

        return Address.parse(this.#connector.wallet.account.address);
    }



    async connectWallet(wallet : WalletInfoRemote)  {

        await this.#connector.restoreConnection();

        if (this.#connector.wallet) {
            return "";
        }

        console.log('Connecting to wallet...');

        const url = this.#connector.connect({
            universalLink: wallet.universalLink,
            bridgeUrl: wallet.bridgeUrl,
        }) as string;

        console.log('Scan the QR code in your wallet or open the link...' + url);

        return url;
    }

    waitForConnection(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.#connector.onStatusChange((w) => {
                if (w) {
                    resolve();
                } else {
                    reject('Wallet is not connected');
                }
            }, (error) => {
                reject(error);
            });
        });
    }
    async sendTransaction(address: Address, amount: bigint, payload?: Cell, stateInit?: StateInit) {
        console.log('Sending transaction. Approve in your wallet...');

        const result = await this.#connector.sendTransaction({
            validUntil: Date.now() + 5 * 60 * 1000,
            messages: [
                {
                    address: address.toString(),
                    amount: amount.toString(),
                    payload: payload?.toBoc().toString('base64'),
                    stateInit: stateInit
                        ? beginCell().storeWritable(storeStateInit(stateInit)).endCell().toBoc().toString('base64')
                        : undefined,
                },
            ],
        });

        console.log('Sent transaction');

        return result;
    }
}
