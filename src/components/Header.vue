<script setup lang="ts">
  import {ex11} from "@/status/store";

  const clearSession = function () {
    localStorage.clear();
    location. reload()
  }
</script>
<template>
  <v-container class="header">
    <v-row justify="end" >
      <v-col cols="1" class="d-flex justify-end align-center">
        <v-switch
            v-model="ex11.network"
            color="primary"
            :label="ex11.network"
            false-value="testnet"
            true-value="mainnet"
            hide-details
        ></v-switch>
      </v-col>
      <v-col cols="2" class="d-flex justify-end align-center">
        <v-btn @click = "clearSession">clear session</v-btn>
      </v-col>
    </v-row>
  </v-container>

</template>

<style scoped>
.header {
  max-width: 90vw;
}
</style>