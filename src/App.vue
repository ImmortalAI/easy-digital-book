<script setup lang="ts">
import WelcomeView from "@/views/WelcomeView.vue";
import EditorView from "@/views/EditorView.vue";
import { useProjectStore } from "@/stores/project";

const project = useProjectStore();
</script>

<template>
  <EditorView v-if="project.book" />
  <WelcomeView v-else />
</template>
