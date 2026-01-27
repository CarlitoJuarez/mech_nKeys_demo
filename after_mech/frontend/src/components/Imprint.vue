<template>
  <div class="max-w-2xl mx-auto py-16 px-6">
    <!-- Header -->
    <div class="mb-12 text-center">
      <h1 class="text-4xl font-semibold mb-2">Imprint</h1>
      <p class="text-gray-500 dark:text-gray-400">
        Legal disclosure and contact information.
      </p>
    </div>

    <!-- Site Operator -->
    <n-card class="mb-10 p-6">
      <h2 class="text-2xl font-semibold mb-4">Site Operator</h2>
      <div class="space-y-1 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
        <p>Carlito Juarez</p>
        <p>Türkenstrasse 33/4</p>
        <p>1090 Vienna</p>
        <p>Austria</p>
      </div>
    </n-card>

    <!-- Contact -->
    <n-card class="mb-10 p-6">
      <h2 class="text-2xl font-semibold mb-4">Contact</h2>

      <div class="mb-3">
        <p class="text-gray-600 dark:text-gray-300">Email:</p>
        <a :href="`mailto:${contact_email}`" class="text-primary-500 hover:underline">
          {{contact_email}}
        </a>
      </div>

      <div>
        <p class="text-gray-600 dark:text-gray-300">Discord:</p>
        <span class="text-primary-500">{{contact_discord}}</span>
      </div>
    </n-card>

    <!-- Legal Notice -->
    <n-card class="p-6">
      <h2 class="text-2xl font-semibold mb-4">Legal Notice</h2>

      <div class="space-y-3 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
        <p>
          All content on this site has been created with care. However, no
          guarantee is given for accuracy, completeness, or timeliness.
        </p>
        <p>
          Unless otherwise stated, all text, images, and code on this site are
          protected by copyright. Any use beyond statutory allowances requires
          prior written permission.
        </p>
      </div>

      <p class="mt-4 text-xs text-gray-500 dark:text-gray-500">
        Last updated: {{ lastUpdated }}
      </p>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { NCard } from "naive-ui";

let contact_email = import.meta.env.CONTACT_EMAIL;
if (!contact_email) {
  contact_email = "contact@example.com";
}

let contact_discord = import.meta.env.CONTACT_DISCORD;
if (!contact_discord) {
  contact_discord = "NAME#0000";
}

const lastUpdated = "January 2026";
</script>
