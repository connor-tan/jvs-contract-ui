<template>
  <v-container class="text-center container">
    <v-row>
      <v-col cols="11" class="d-flex justify-start align-center">
        <v-text-field
            v-model="contractAddress"
            hint="Enter your jetton contract address"
            label="contract address"
            type="input"
        ></v-text-field>
      </v-col>
      <v-col cols="1" class="d-flex justify-start align-center">
        <v-btn width="100%" @click="connect">connect</v-btn>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <div class="qrcode-container">
          <qrcode-vue :value="qrCodeValue" :size="400" v-if="qrCodeValue"></qrcode-vue>
        </div>
      </v-col>
    </v-row>
    <LockerData v-if="lockerData"
                :lockDict="lockerData.lockDict"
                :jettonMasterAddress="lockerData.jettonMasterAddress"
                :adminAccount="lockerData.adminAccount"
                :lockedAccount="lockerData.lockedAccount"
                :count="lockerData.count"
                :isConfirmed="lockerData.isConfirmed"
                :actualAmount="lockerData.actualAmount"
                :deployTime="lockerData.deployTime"
                :loginSender="loginSender"
                :contractAddress="contractAddress"
                @confirm="confirm"
                @withdraw="withdraw"
                @refund="refund"
                @updateContract="updateContract"
    />

    <v-dialog max-width="500" v-model="dialog">
      <template v-slot:default="{ isActive }">
        <v-card title="Dialog">
          <v-card-text>
            The balance in the current contract's jetton wallet does not match the balance agreed upon at the time of contract deployment. Please click the confirm button to synchronize your balance.Attention This action will affect your refund.
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>

            <v-btn
                text="Close"
                @click="dialog = false"
            ></v-btn>
            <v-btn
                text="Confirm"
                @click="confirmUpdateAmount"
            ></v-btn>
          </v-card-actions>
        </v-card>
      </template>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import {ref,onMounted} from "vue";
import {ex11} from "@/status/store";
import QrcodeVue from 'qrcode.vue';
import { TonConnectProvider } from '@/network/send/TonConnectProvider';
import {LocalStorage} from "@/network/storage/LocalStorage";
import {TonClient4} from "@ton/ton";
import {getHttpV4Endpoint} from "@orbs-network/ton-access";
import {type Network, NetworkProviderImpl, SendProviderSender} from "@/network/createNetworkProvider";
import type {NetworkProvider} from "@/network/NetworkProvider";
import {Locker} from "@/wrappers/Locker";
import {Address, beginCell, type Cell, Dictionary, type OpenedContract, type Sender, toNano} from "@ton/core";
import LockerData, {type ItemType} from "@/components/LockerData.vue";
import type { WalletInfoRemote} from "@tonconnect/sdk";
import {JettonMinter} from "@/wrappers/JettonMinter";
import {JettonWallet} from "@/wrappers/JettonWallet";
import {fromNano} from "ton";



let provider = new TonConnectProvider(new LocalStorage());

let locker: OpenedContract<Locker>;

let networkProvider: NetworkProvider;

const loginSender = ref<Address>();

const lockerData = ref<{
  jettonMasterAddress: Address,
  jettonWalletCode: Buffer,
  adminAccount: Address,
  lockedAccount: Address,
  count: number,
  isConfirmed: number,
  actualAmount: number,
  lockDict: Cell,
  deployTime: number,
  refunded: number

}>();

let getNetworkProvider = async function (sender : Sender) : Promise<NetworkProvider> {
  let tc = new TonClient4({
    endpoint: await getHttpV4Endpoint({network:ex11.network as Network}),
  });

  return new NetworkProviderImpl(tc, sender, ex11.network as Network);
}


const contractAddress = ref<string>("");
const qrCodeValue = ref<string>("");

const _actualAmount = ref<number>();

const dialog = ref<boolean>(false);

let walletInfo:WalletInfoRemote;

let confirmUpdateAmount = function () {
  locker.sendUpdateActualAmountMsg(networkProvider.sender(),toNano('0.008'),BigInt(_actualAmount.value as number)).then(() => {
    let value = lockerData.value;
    if (value) {
      value.actualAmount = _actualAmount.value as number;
    }
  });
  dialog.value = false;

}

const connect = async () => {
  if(!contractAddress.value && contractAddress.value.trim().length == 0){
    return;
  }
  qrCodeValue.value = await provider.connectWallet(walletInfo)
}

onMounted(() => {
  provider.getWalletInfo().then(walletInfos => {
    walletInfo = walletInfos.filter(item => item.name == 'Tonkeeper')[0];
  })
})


provider.waitForConnection().then(async () => {
  const sender = new SendProviderSender(provider);
  networkProvider = await getNetworkProvider(sender);
  loginSender.value = sender.address;
  locker = networkProvider.open(Locker.createFromAddress(Address.parse(contractAddress.value)))
  //refreshLockerData();
  qrCodeValue.value = '';
  fetchLockerData();

})

function fetchLockerData () {
  locker.getLockerData().then((resp) => {
    lockerData.value = resp;
    //获取jetton钱包地址
    let jettonMinter = networkProvider.open(JettonMinter.createFromAddress(Address.parse(ex11.network == "maintest" ? "EQCokMOmdSegGCOlpWoO_DA7EKU_f3fAuZeNJfWFFzIytNSr" : "kQBWi1DHY0CG1HgwMzGXUSlcbo6LJyJq3wCSWJDBAYbG4WlM")))

    let walletAddress = jettonMinter.getWalletAddress(Address.parse(contractAddress.value));

    walletAddress.then((address) => {
      //打开jetton钱包
      let jettonWallet = networkProvider.open(JettonWallet.createFromAddress(address))
      jettonWallet.getJettonBalance().then(balance => {
        _actualAmount.value = Number(fromNano(balance));
        //如果合约部署时，取款金额的总数和查询的结果不一致，那么就更新，这里需要确认是否需要用户确认后再更新

        if (Number(balance) !=0 &&  (lockerData.value?.actualAmount as number) != _actualAmount.value) {
          dialog.value = true;
        }
        console.log(balance);
      })
    })
  });
}

const confirm = function (){
  if(locker){
    locker.sendInternalMsg(networkProvider.sender(),toNano('0.008'),'c').then(() => {
      alert("success")
    });
  }
}
const withdraw = function (){
  if(locker && _actualAmount.value && lockerData.value?.isConfirmed == 1) {
    locker.sendInternalMsg(networkProvider.sender(), toNano('0.08'), 'w').then(() => {
      alert("success")
    });
  }else {
    alert("please check the actual amount or insure confirm action has been done");
  }
}
const refund = function (){
  if(locker && _actualAmount.value){
    locker.sendRefundMsg(networkProvider.sender(),toNano('0.05'),BigInt(_actualAmount.value as number)).then(() => {
      alert("success")
    });
  }
}
const updateContract = function (editedItem : ItemType[]){
  if(locker && editedItem){
    const key = Dictionary.Keys.Uint(32);
    const value =Dictionary.Values.Cell();
    let dictionary = Dictionary.empty(key,value);
    editedItem.forEach((item,index) => {
      const lockedAmount = item.lockedAmount;
      const unlockPeriod = item.unlockPeriod; // 锁定2分钟
      let cell = beginCell().storeUint(lockedAmount,32).storeUint(0,1).endCell();
      dictionary.set(unlockPeriod,cell)
    })
    locker.sendUpdateDictMsg(networkProvider.sender(),toNano('0.08'),dictionary).then(() => {
      alert("success")
      fetchLockerData();
    });
  }
}

</script>
<style>
.container{
  max-width: 90vw;
}
</style>
