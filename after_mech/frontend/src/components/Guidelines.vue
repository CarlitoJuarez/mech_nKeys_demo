
<template>
  <div class="max-w-2xl mx-auto py-16 px-6">
    <div class="mb-12 text-center">
      <h1 class="text-4xl font-semibold mb-2">Community Guidelines</h1>
      <p class="text-gray-500 dark:text-gray-400">
        Rules and expectations for participating respectfully.
      </p>
    </div>

    <n-card class="p-6 mb-10">
      <h2 class="text-2xl font-semibold mb-4">Respect Others</h2>
      <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
        Treat all members of the community with respect. Harassment, discrimination,
        or abusive language is not tolerated under any circumstances.
      </p>
    </n-card>

    <n-card class="p-6 mb-10">
      <h2 class="text-2xl font-semibold mb-4">Keep It Safe</h2>
      <p class="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
        Do not share personal information, private data, or anything that may put
        you or others at risk.
      </p>
      <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
        Avoid posting harmful, threatening, or dangerous content.
      </p>
    </n-card>

    <n-card class="p-6 mb-10">
      <h2 class="text-2xl font-semibold mb-4">Stay On Topic</h2>
      <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
        Keep discussions relevant and constructive. Off-topic or disruptive messages
        may be removed to maintain a productive environment.
      </p>
    </n-card>

    <n-card class="p-6 mb-10">
      <h2 class="text-2xl font-semibold mb-4">No Spam</h2>
      <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
        Unsolicited advertising, repeated messages, or promotional content is not
        allowed. Genuine contributions only.
      </p>
    </n-card>

    <n-card class="p-6 mb-10">
      <h2 class="text-2xl font-semibold mb-4">Report Issues</h2>
      <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
        If you encounter inappropriate behavior, unsafe content, or violations of
        these guidelines, report it to the team as soon as possible.
      </p>
    </n-card>

    <n-card class="p-6">
      <h2 class="text-2xl font-semibold mb-4">Last Updated</h2>
      <p class="text-gray-600 dark:text-gray-400 text-sm">
        {{ lastUpdated }}
      </p>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { NCard } from "naive-ui"

const lastUpdated = "January 2026"
</script>
