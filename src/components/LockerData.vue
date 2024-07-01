<template>
  <v-row>
    <v-col cols="10">
      <v-card>

        <v-card-title class="text-overline">
          <!--      Progress-->
          <div class="text-green-darken-3 text-h3 font-weight-bold"> CONTRACT : {{total}} JVS | BALANCE : {{actualAmount}} JVS</div>
          <!--      <div class="text-h6 text-medium-emphasis font-weight-regular">
                  {{remain}} JVS remaining
                </div>-->
          <!--      <div class="text-h4 text-medium-emphasis font-weight-regular">{{progress}}%</div>-->
          <div class="text-h4 text-medium-emphasis font-weight-regular"></div>
          <div class="text-h6 text-medium-emphasis font-weight-regular">admin account: {{adminAccount}}</div>
          <div class="text-h6 text-medium-emphasis font-weight-regular">locked account: {{lockedAccount}}</div>
        </v-card-title>
        <br>
        <v-card-text>

          <div v-for="(node,index) in withdrawNode"
               :style="`left: calc(${node.position}% - ${index === withdrawNode.length - 1 ? 156 : 56}px)`"
               class="position-absolute mt-n8 text-caption text-white-darken-3"
          >
            {{node.date}}
          </div>
          <v-progress-linear
              color="green-darken-3"
              height="22"
              :model-value="progress"
              rounded="lg"
          >
            <v-badge v-for="(node,index) in withdrawNode"
                     :style="`left: calc(${node.position}% - ${index === withdrawNode.length - 1 ? 20 : 0}px`"
                     class="position-absolute"
                     color="white"
                     dot
                     inline
            ></v-badge>
          </v-progress-linear>

          <div class="d-flex justify-space-between py-3">
          <span class="text-green-darken-3 font-weight-medium">
            JVS:{{ remitted }} remitted
          </span>
            <span class="text-medium-emphasis"> JVS: {{ total}} total </span>
          </div>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
          <v-btn
              color="green-lighten-2"
              text="UPDATE"
              @click="editItem()"
              v-if="adminAccount?.equals(loginSender as Address)"
          ></v-btn>
          <v-spacer></v-spacer>
          <v-btn
              color="blue-lighten-2"
              text="CONFIRM"
              @click="$emit('confirm')"
              v-if="adminAccount?.equals(loginSender as Address)"
          ></v-btn>
          <v-spacer></v-spacer>
          <v-btn
              color="orange-lighten-2"
              text="REFUND"
              @click="$emit('refund')"
              v-if="adminAccount?.equals(loginSender as Address)"
          ></v-btn>
          <v-spacer></v-spacer>
          <v-btn
              color="pink-lighten-2"
              text="WITHDRAW"
              @click="$emit('withdraw')"
              v-if="loginSender?.equals(lockedAccount as Address)"
          ></v-btn>
          <v-spacer></v-spacer>
          <v-label>MORE</v-label>
          <v-btn
              :icon="show ? 'mdi-chevron-up' : 'mdi-chevron-down'"
              @click="show = !show"
          ></v-btn>
        </v-card-actions>

        <v-expand-transition>
          <div v-show="show">
            <v-divider></v-divider>
            <v-data-table :headers="headers" :items="tableData">
              <template v-slot:top>
                <v-toolbar flat>
                  <v-dialog v-model="dialog" max-width="500px">
                    <v-card>
                      <v-card-title>
                        <span class="text-h5">UPDATE CONTRACT</span>
                      </v-card-title>

                      <v-card-text>
                        <v-container>
                          <v-row v-for="(item, index) in editedItem" :key="index">
                            <v-col cols="6" md="6" sm="6">
                              <v-text-field v-model="item.lockedAmount" :index="index" label="the money locked"></v-text-field>
                            </v-col>
                            <v-col cols="6" md="6" sm="6">
                              <v-text-field v-model="item.formatedUnlockPeriod" :index="index" label="unlock period" @click = "openDatePicker(index)"></v-text-field>
                            </v-col>
                            <v-col cols="4" md="4" sm="4" hidden="hidden">
                              <v-text-field v-model="item.unlockPeriod" :index="index" label="unlock period"></v-text-field>
                            </v-col>
                          </v-row>
                          <v-icon icon="mdi-plus" @click="addItem"/>
                          <v-date-picker show-adjacent-months v-if="showDatePicker" v-model="pickedTime" @click= "updateUnlockPeriod"></v-date-picker>
                        </v-container>
                      </v-card-text>

                      <v-card-actions>
                        <v-spacer></v-spacer>
                        <v-btn color="blue-darken-1" variant="text" @click="close">
                          Cancel
                        </v-btn>
                        <v-btn color="blue-darken-1" variant="text" @click="save">
                          Save
                        </v-btn>
                      </v-card-actions>
                    </v-card>
                  </v-dialog>
                </v-toolbar>
              </template>
            </v-data-table>
            <!--        <v-card-text>-->
            <!--          I'm a thing. But, like most politicians, he promised more than he could deliver. You won't have time for sleeping, soldier, not with all the bed making you'll be doing. Then we'll go with that data file! Hey, you add a one and two zeros to that or we walk! You're going to do his laundry? I've got to find a way to escape.-->
            <!--        </v-card-text>-->
          </div>
        </v-expand-transition>

      </v-card>
    </v-col>
    <v-col cols="2">
      <v-card
          class="mx-auto"
          max-width="344"
      >
        <v-card-text>
          <div>contract address qrcode</div>


          <div class="text-medium-emphasis">
            <qrcode-vue :value="qrcodeAddress" :size="240" v-if="qrcodeAddress"></qrcode-vue>
          </div>
        </v-card-text>

      </v-card>


    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import {computed, ref} from "vue";
import {Address, Cell, Dictionary,type Sender} from "@ton/core";
import QrcodeVue from "qrcode.vue";

const emit = defineEmits(['updateContract','refund','confirm','withdraw'])
const withdrawNode = ref<Array<{date:String,position:number}>>([])
const pickedTime = ref<Date>(new Date());
const remain = ref<number>();
const remitted = ref<number>();
const total = ref<number>();
const show = ref<boolean>(false);
const tableData = ref<Array<any>>([]);
const dialog = ref(false);
const showDatePicker = ref(false);
const currentEditingIndex = ref(0);

export interface ItemType {
  lockedAmount: number;
  unlockPeriod: number;
  formatedUnlockPeriod: string;
  withdraw:number;
}
const defaultItem:ItemType  = {
  lockedAmount: 0,
  unlockPeriod: 0,
  formatedUnlockPeriod: '',
  withdraw: 0
};

const totalLockedAmount = ref(0);

const editedItem = ref<ItemType[]>([]);

const editedIndex = ref(-1);

const headers = ref([
  {title: 'Amount', key:'lockedAmount', value: 'lockedAmount' ,align: 'center'},
  {title: 'Withdrawal Date',key: 'formatedUnlockPeriod' , value: 'formatedUnlockPeriod' ,align: 'center'},
  {title: 'Withdrawn (Yes/No)',key: 'withdrawable', value: 'withdrawable' ,align: 'center'},
] as const);

const props = defineProps({
  jettonMasterAddress: Address,
  jettonWalletCode: Buffer,
  adminAccount: Address,
  lockedAccount: Address,
  count: Number,
  isConfirmed: Number,
  actualAmount: Number,
  lockDict: Cell,
  deployTime: Number,
  refunded: Number,
  loginSender: Address,
  contractAddress: String
})

function openDatePicker(index : number){
  currentEditingIndex.value = index;
  showDatePicker.value = true;
}

function formatTimestamp(unixTimestamp: number): string {
  const date = new Date(unixTimestamp * 1000); // Unix时间戳是以秒为单位的，所以乘以1000转换为毫秒

  const year = date.getFullYear();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始，所以要加1
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

const addItem = () => {
  editedItem.value.push({...defaultItem});
}

let calcProgress = function () {
  console.log("------"+props.loginSender)
  let deployTime = props.deployTime as number;
  let refunded = props.refunded as number;
  let dictData = props.lockDict as Cell;
  let dict : Dictionary<number, Cell> = dictData.asSlice().loadDictDirect(Dictionary.Keys.Uint(32),Dictionary.Values.Cell());
  let withdrawAmount = 0;
  let totalAmount = 0;
  let maxValue = findMaxValue( dict.keys());
  dict.keys().forEach((key) => {
    let cell = dict.get(key) as Cell;
    let slice = cell.asSlice();
    let money = slice.loadUint(32);
    let _withdraw = slice.loadUint(1);
    totalAmount += money
    if (_withdraw == 1) {
      withdrawNode.value.push({date:formatTimestamp(key),position:Math.round((key - deployTime) * 100 / (maxValue - deployTime))})
      withdrawAmount += money;
    }
    tableData.value.push({
      lockedAmount: money,
      unlockPeriod: key,
      formatedUnlockPeriod: formatTimestamp(key),
      withdrawable: _withdraw == 1 ? 'YES' : 'NO',
      refunded: refunded == 1 ? 'YES' : 'NO'
    })

    editedItem.value.push({
      lockedAmount: money,
      unlockPeriod: key,
      formatedUnlockPeriod: formatTimestamp(key),
      withdraw: _withdraw
    })

  })
  totalLockedAmount.value = totalAmount - withdrawAmount;
  remitted.value = withdrawAmount;
  total.value = totalAmount;
  remain.value = totalAmount - withdrawAmount;
  return Math.round(withdrawAmount * 100 / totalAmount) ;
}
const progress = ref(calcProgress());

function updateUnlockPeriod(){
  console.log(pickedTime.value)
  console.log(pickedTime.value.getTime())
  editedItem.value[currentEditingIndex.value].unlockPeriod = Math.floor(pickedTime.value.getTime()  / 1000);
  editedItem.value[currentEditingIndex.value].formatedUnlockPeriod = formatTimestamp(pickedTime.value.getTime() / 1000);
  showDatePicker.value = false;
  currentEditingIndex.value = 0;
}

function findMaxValue(numbers: number[]): number {
  if (numbers.length === 0) {
    throw new Error("Array is empty");
  }

  return Math.max(...numbers);
}

function editItem () {
  let existItem = editedItem.value.find( item => item.withdraw === 1);
  if (existItem || props.refunded == 1) {
    alert("contract has been executed or refunded!")
    return ;
  }
  dialog.value = true
}
function close() {
  dialog.value = false
  editedItem.value = editedItem.value.filter(item => item.lockedAmount !== 0 && item.unlockPeriod !== 0);
  // nextTick(() => {
  //   editedItem.value = Object.assign([], defaultItem.value)
  //   editedIndex.value = -1
  // })
}
//fake now
function save() {



  let existEmptyItem = editedItem.value.find( item => item.unlockPeriod == 0 || item.lockedAmount == 0);

  if (existEmptyItem) {
    alert("error! please check the form , there must be have a empty input!")
    return ;
  }

  emit('updateContract',editedItem.value);
  // if (editedIndex.value > -1) {
  //   Object.assign(tableData.value[editedIndex.value], editedItem.value)
  // } else {
  //   tableData.value.push(editedItem.value)
  // }
  close()
}

const qrcodeAddress = computed(() => {
  return "ton://transfer/"+props.contractAddress
})
</script>


<style scoped>

</style>