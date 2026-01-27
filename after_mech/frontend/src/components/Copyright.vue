<template>
  <div class="max-w-2xl mx-auto py-16 px-6">
    <div class="mb-12 text-center">
      <h1 class="text-4xl font-semibold mb-2">Copyright</h1>
      <p class="text-gray-500 dark:text-gray-400">
        Information about ownership, rights, and usage of this website.
      </p>
    </div>

    <!-- Source Code -->
    <n-card class="mb-10 p-6">
      <h2 class="text-2xl font-semibold mb-4">Source Code</h2>
      <p class="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
        The source code of this project is licensed under the Apache License, Version 2.0, unless explicitly stated otherwise.
        A copy of the license is available at:
        https://www.apache.org/licenses/LICENSE-2.0
      </p>
      <p class="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mt-3">
        Use, modification, and distribution of the source code are permitted in accordance with the terms of the Apache License, Version 2.0.
      </p>
    </n-card>

    <!-- Ownership -->
    <n-card class="mb-10 p-6">
      <h2 class="text-2xl font-semibold mb-4">Ownership</h2>
      <p class="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
        Unless otherwise stated, all content created and published by the operator on this website, including text, design
        elements, logos, and non-code media is protected by copyright law and owned by the operator.
      </p>
      <p class="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mt-3">
        Content submitted by users (such as images, text, or other materials) remains the intellectual property of the
        respective users.
      </p>
    </n-card>

    <!-- Usage Rights -->
    <n-card class="mb-10 p-6">
      <h2 class="text-2xl font-semibold mb-4">Usage Rights</h2>
      <p class="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
        Operator-owned website content may not be copied, reproduced, distributed, or modified without prior permission, except
        where such use is permitted by applicable copyright law.
      </p>
      <p class="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mt-3">
        Non-commercial use for personal purposes is permitted provided that:
      </p>
      <ul class="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
        <li>The content remains unmodified</li>
        <li>The source is clearly attributed</li>
      </ul>
    </n-card>

    <!-- User-Generated Content -->
    <n-card class="mb-10 p-6">
      <h2 class="text-2xl font-semibold mb-4">User-Generated Content</h2>
      <p class="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
        The use of user-generated content is governed by the <strong>Terms &amp; Conditions</strong>. Any rights granted to
        the operator are limited to what is necessary to operate and provide the platform.
      </p>
    </n-card>

    <!-- Third-Party Material -->
    <n-card class="mb-10 p-6">
      <h2 class="text-2xl font-semibold mb-4">Third-Party Material</h2>
      <p class="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
        This website may contain content licensed from third parties. Such content remains the property of the respective
        rights holders and is used in accordance with the applicable license terms.
      </p>
    </n-card>

    <!-- Last Updated -->
    <n-card class="mb-10 p-6">
      <h2 class="text-2xl font-semibold mb-4">Last Updated</h2>
      <p class="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
        {{ lastUpdated }} 
      </p>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { NCard } from "naive-ui"

const lastUpdated = "January 2026"
</script>
