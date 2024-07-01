import { Address, Cell, type StateInit } from '@ton/core';
import type {WalletInfo} from "@tonconnect/sdk";

export interface SendProvider {
    connect(walletInfo : WalletInfo): Promise<void>;
    sendTransaction(address: Address, amount: bigint, payload?: Cell, stateInit?: StateInit): Promise<any>;
    address(): Address | undefined;
}
