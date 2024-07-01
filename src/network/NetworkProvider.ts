import { TonClient, TonClient4 } from '@ton/ton';
import { Address, Cell, type Contract,type ContractProvider,type OpenedContract,type Sender } from '@ton/core';

export interface NetworkProvider {
    network(): 'mainnet' | 'testnet' | 'custom';
    sender(): Sender;
    api(): TonClient4 | TonClient;
    provider(address: Address, init?: { code?: Cell; data?: Cell }): ContractProvider;
    open<T extends Contract>(contract: T): OpenedContract<T>;
}
