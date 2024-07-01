<template>
  <Header></Header>
  <Logo></Logo>
  <RouterView />
</template>
<script setup lang="ts">
import { RouterView } from 'vue-router'
import Logo from "@/components/Logo.vue";
import Header from "@/components/Header.vue";
</script>


