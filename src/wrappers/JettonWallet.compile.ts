import { type CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    targets: ['contracts/JettonWallet.fc','ft/params.fc','ft/op-codes.fc','ft/jetton-utils.fc','ft/error-codes.fc']
};
