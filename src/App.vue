<script setup lang="ts">
import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";

const greetMsg = ref("");
const name = ref("");

async function greet() {
  // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
  greetMsg.value = await invoke("greet", { name: name.value });
}
</script>

<template>
  <main >
    <h1 class="font-bold">Welcome to Tauri + Vue</h1>

    <div >
      <a href="https://vite.dev" target="_blank">
        <img src="/vite.svg"  />
      </a>
      <a href="https://tauri.app" target="_blank">
        <img src="/tauri.svg"  />
      </a>
      <a href="https://vuejs.org/" target="_blank">
        <img src="./assets/vue.svg"  />
      </a>
    </div>
    <p>Click on the Tauri, Vite, and Vue logos to learn more.</p>

    <form @submit.prevent="greet">
      <input id="greet-input" v-model="name" placeholder="Enter a name..." />
      <button type="submit">Greet</button>
    </form>
    <p>{{ greetMsg }}</p>
  </main>
</template>
