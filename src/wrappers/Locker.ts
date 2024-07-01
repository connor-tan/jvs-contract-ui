import {
    Address,
    toNano,
    beginCell,
    Cell,
    type Contract,
    contractAddress,
    type ContractProvider,
    type Sender,
    SendMode,
    storeMessage,
    Builder,
    Dictionary,
} from '@ton/core';

export type LockerConfig = {
    jettonMasterAddress: Address;
    jettonWalletCode: Cell;
    adminAccount: Address;
    lockedAccount: Address;
    count: number;
    isConfirmed: number;
    actualAmount: number;
    refunded: number;
    lockDict: Dictionary<any, any>;
    deployTime: number;
}

export function lockerConfigToCell(lockConfig: LockerConfig): Cell {
    return beginCell()
        .storeAddress(lockConfig.jettonMasterAddress)
        .storeRef(lockConfig.jettonWalletCode)
        .storeAddress(lockConfig.adminAccount)
        .storeAddress(lockConfig.lockedAccount)
        .storeUint(lockConfig.count,10)
        .storeUint(lockConfig.isConfirmed,1)
        .storeUint(lockConfig.actualAmount,32)
        .storeUint(lockConfig.deployTime,32)
        .storeUint(lockConfig.refunded,1)
        .storeDict(lockConfig.lockDict)
        .endCell();
}

export class Locker implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) { }

    static createFromAddress(address: Address) {
        return new Locker(address);
    }
    static createFromConfig(lockConfig: LockerConfig, code: Cell, workchain = 0) {
        const data = lockerConfigToCell(lockConfig);
        const init = { code, data };
        return new Locker(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendUpdateActualAmountMsg(provider: ContractProvider, via: Sender, value: bigint, actualAmount: bigint) {
        const amountMessage = beginCell().storeUint(0x820dd216, 32) .storeUint(actualAmount,32).endCell();
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: amountMessage
        });
    }

    async sendUpdateDictMsg(provider: ContractProvider, via: Sender, value: bigint, dict: Dictionary<number,Cell>) {
        const refundMessage = beginCell().storeUint(0x216dd820, 32) .storeDict(dict).endCell();

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: refundMessage
        });
    }

    async sendRefundMsg(provider: ContractProvider, via: Sender, value: bigint, actualAmount: bigint) {
        const refundMessage = beginCell().storeUint(0x320dd211, 32) .storeUint(actualAmount,32).endCell();
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: refundMessage
        });
    }

    /**
     * 用于发送tonkeeper类型的消息,带comment消息体
     * @param provider
     * @param via
     * @param sendAmount
     * @param msg
     */
    async sendInternalMsg(provider: ContractProvider, via: Sender,sendAmount: bigint, msg: string) {
        const withdrawMessage = beginCell().storeUint(0, 32) .storeStringTail(msg).endCell();
        await provider.internal(via, {
            value: sendAmount, // Small fee for the transaction
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: withdrawMessage
        });
    }


    async getLockerData(provider: ContractProvider) {
        const { stack } = await provider.get('get_locker_data', []);
        return {
            jettonMasterAddress: stack.readAddress(),
            jettonWalletCode: stack.readCell().toBoc(),
            adminAccount: stack.readAddress(),
            lockedAccount: stack.readAddress(),
            count: stack.readNumber(),
            isConfirmed:stack.readNumber(),
            actualAmount: stack.readNumber(),
            deployTime: stack.readNumber(),
            refunded: stack.readNumber(),
            lockDict: stack.readCell()
        };
    }
}