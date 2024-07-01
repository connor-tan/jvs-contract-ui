import { type CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    targets: ['contracts/JettonMinterDiscoverable.fc','ft/params.fc','ft/op-codes.fc','ft/discovery-params.fc','ft/jetton-utils.fc'],
};
