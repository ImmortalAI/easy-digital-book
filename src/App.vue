<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { useCounterStore } from "@/stores/counter";

const counter = useCounterStore();
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-muted/30 p-6">
    <section class="w-full max-w-md space-y-6 rounded-xl border bg-background p-8 shadow-sm">
      <div class="space-y-2">
        <h1 class="text-3xl font-semibold tracking-tight">Счётчик</h1>
        <p class="text-muted-foreground">Нажмите кнопку, чтобы увеличить текущее значение.</p>
      </div>

      <p class="text-5xl font-semibold tabular-nums">{{ counter.count }}</p>

      <Button type="button" @click="counter.increment">Увеличить</Button>
    </section>
  </main>
</template>
