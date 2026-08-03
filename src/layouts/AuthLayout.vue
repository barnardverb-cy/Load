<script setup lang="ts">
import BrandMark from '@/components/BrandMark.vue'
</script>

<template>
  <main class="auth-layout">
    <section class="auth-intro">
      <BrandMark />
      <div>
        <p class="eyebrow">Train with intention</p>
        <h1>Your next target,<br />already worked out.</h1>
        <p class="auth-intro__copy">
          Log each set and let Load remember when it is time to add another rep or increase the
          weight.
        </p>
      </div>
      <p class="auth-intro__foot">Automatic progressive overload, without the spreadsheet.</p>
    </section>

    <section class="auth-panel">
      <div class="auth-card">
        <slot />
      </div>
    </section>
  </main>
</template>
