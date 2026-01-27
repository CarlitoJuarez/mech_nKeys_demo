<template>
  <div class="max-w-2xl mx-auto py-16 px-6">
    <div class="mb-12 text-center">
      <h1 class="text-4xl font-semibold mb-2">Help & Support</h1>
      <p class="text-gray-500 dark:text-gray-400">
        If you are stuck or need assistance, send a message or contact us directly.
      </p>
    </div>

    <n-card class="mb-10 p-6">
      <n-form @submit.prevent="submitForm">
        <n-form-item label="Your Name">
          <n-input v-model:value="form.name" placeholder="Enter your name" />
        </n-form-item>

        <n-form-item label="Email">
          <n-input v-model:value="form.email" type="email" placeholder="example@email.com" />
        </n-form-item>

        <n-form-item label="Message">
          <n-input
            v-model:value="form.message"
            type="textarea"
            placeholder="Describe your issue or question..."
            :autosize="{ minRows: 4, maxRows: 10 }"
          />
        </n-form-item>

        <n-button type="primary" attr-type="submit" class="mt-4 w-full">
          Send Request
        </n-button>
      </n-form>
    </n-card>

    <n-card class="p-6">
      <h2 class="text-2xl font-semibold mb-4">Contact</h2>

      <div class="mb-3">
        <p class="text-gray-600 dark:text-gray-300">Email:</p>
        <a :href="`mailto:${contact_email}`" class="text-primary-500 hover:underline">
          {{ contact_email }}
        </a>
      </div>

      <div>
        <p class="text-gray-600 dark:text-gray-300">Discord:</p>
        <span class="text-primary-500">{{contact_discord}}</span>
      </div>
    </n-card>
  </div>
</template>

<script setup>
import { reactive } from "vue";
import { NCard, NForm, NFormItem, NInput, NButton } from "naive-ui";

function clearServerErrors () {
  const error_div = document.querySelector('#error_div');
  if (!error_div) return;
  error_div.innerHTML = '';
  error_div.classList.remove('show');
  error_div.classList.add('hide');
};

function showErrorBanner (msg) {
  const error_div = document.querySelector('#error_div');
  error_div.classList.remove('hide');
  error_div.classList.add('show');
  error_div.classList.add('fade_in');
  let error = document.createElement('p');
  error.textContent = msg;
  error.style.opacity = 0;
  error.classList.add('fade_in');
  error_div.appendChild(error);
  requestAnimationFrame(() => {
      error.classList.add('show');
    });
}

const csrftoken = document.cookie
  .split("; ")
  .find((r) => r.startsWith("csrftoken="))
  ?.split("=")[1];

const form = reactive({
  name: "",
  email: "",
  message: "",
});

let contact_email = import.meta.env.CONTACT_EMAIL;
if (!contact_email) {
  contact_email = "contact@example.com";
}

let contact_discord = import.meta.env.CONTACT_DISCORD;
if (!contact_discord) {
  contact_discord = "NAME#0000";
}

async function safeRead(res) {
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.toLowerCase().includes("application/json");

  // Some responses may be empty (204) or have no body.
  if (res.status === 204) return { data: null, text: "" };

  if (isJson) {
    try {
      return { data: await res.json(), text: "" };
    } catch {
      // Content-Type said JSON but body wasn't parseable
      const text = await res.text().catch(() => "");
      return { data: null, text };
    }
  }

  // Non-JSON (e.g., Django 403 HTML page)
  const text = await res.text().catch(() => "");
  return { data: null, text };
}

async function submitForm() {
  const body = new FormData();
  body.append("name", form.name);
  body.append("email", form.email);
  body.append("message", form.message);

  clearServerErrors();
  let res;
  try {
    res = await fetch("/help", {
      method: "POST",
      credentials: 'same-origin',
      headers: {
        Accept: "application/json",
        ...(csrftoken ? { "X-CSRFToken": csrftoken } : {}),
      },
      body,
    });
  } catch (e) {
    showErrorBanner("Network error.")
    return;
  }

  const { data, text } = await safeRead(res);

  if (!res.ok) {
    // Prefer a JSON error payload if present
    const msgFromJson =
      (data && (data.error || data.detail || data.message)) || null;

    // If server returned HTML/text, avoid dumping a whole page into alert
    const msgFromText =
      text && text.trim()
        ? `Request failed (${res.status}).`
        : null;

    const msg =
      msgFromJson ||
      msgFromText ||
      (res.status === 403 ? "Too many requests. Please wait and try again." : "Failed to send message.");

    showErrorBanner(msg);
    return;
  }

  showErrorBanner("Email sent.");
  form.name = '';
  form.email = '';
  form.message = '';
}
</script>
