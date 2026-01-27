
<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import {
  NAlert,
  NForm,
  NFormItem,
  NInput,
  NButton,
  NCard,
  NTabs,
  NTabPane,
  NUpload,
  NMessageProvider,
  NModal
} from 'naive-ui'

const tab = ref('account')
const form = reactive({ email: '', profile_picture: null })
const cur_picture = ref(null)
const saved = ref(false)
const error = ref('')

// Track the last known persisted email (loaded from backend / after save)
const initialEmail = ref('')

// EMAIL VERIFICATION
const verifyInProgress = ref(false)
const verifySaved = ref(false)
const verifyError = ref('')

const pw = reactive({ current: '', n1: '', n2: '' })
const pwSaved = ref(false)
const pwError = ref('')

const showDeleteModal = ref(false)
const deleteConfirm = ref('')
const deleteError = ref('')
const deleteInProgress = ref(false)

// --- REAUTH MODAL STATE ---
const showReauthModal = ref(false)
const reauthPassword = ref('')
const reauthError = ref('')
const reauthInProgress = ref(false)
let reauthPromiseResolve = null
let reauthPromiseReject = null

const csrftoken = document.cookie.split('; ').find(r => r.startsWith('csrftoken='))?.split('=')[1]

function isValidEmail(value) {
  const email = (value ?? '').trim()
  if (!email || email.length > 254) return false
  if (/\s/.test(email)) return false
  const re = /^(?=.{1,254}$)(?=.{1,64}@)[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}$/i
  return re.test(email)
}

const emailTrimmed = computed(() => (form.email ?? '').trim())
const emailChangedFromInitial = computed(() => emailTrimmed.value !== (initialEmail.value ?? '').trim())
const emailLooksValid = computed(() => isValidEmail(emailTrimmed.value))
const canSendVerification = computed(() => emailChangedFromInitial.value && emailLooksValid.value && !verifyInProgress.value)

// -------------------- REAUTH HELPERS --------------------
function openReauthModal() {
  showReauthModal.value = true
  reauthPassword.value = ''
  reauthError.value = ''
  reauthInProgress.value = false

  return new Promise((resolve, reject) => {
    reauthPromiseResolve = resolve
    reauthPromiseReject = reject
  })
}

function cancelReauthModal() {
  showReauthModal.value = false
  reauthPassword.value = ''
  reauthError.value = ''
  reauthInProgress.value = false

  if (reauthPromiseReject) reauthPromiseReject(new Error('reauth_cancelled'))
  reauthPromiseResolve = null
  reauthPromiseReject = null
}

async function doReauth() {
  reauthError.value = ''
  reauthInProgress.value = true

  try {
    const res = await fetch('/settings/reauth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrftoken || ''
      },
      credentials: 'same-origin',
      body: JSON.stringify({ password: reauthPassword.value })
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      reauthError.value = data?.error || 'Incorrect password'
      reauthInProgress.value = false
      return false
    }

    // success / ok
    showReauthModal.value = false
    reauthInProgress.value = false
    reauthPassword.value = ''
    reauthError.value = ''

    if (reauthPromiseResolve) reauthPromiseResolve(true)
    reauthPromiseResolve = null
    reauthPromiseReject = null
    return true
  } catch (e) {
    reauthError.value = 'Network error'
    reauthInProgress.value = false
    return false
  }
}

/**
 * Runs requestFn() once; if backend returns 403 {code:"reauth_required"},
 * prompts for password, calls /settings/reauth, then retries once.
 *
 * requestFn must be a function that returns fetch(...) so it can be re-run.
 */
async function fetchWithReauth(requestFn) {
  const first = await requestFn()

  if (first.status !== 403) return first

  const data = await first.json().catch(() => null)
  if (data?.code !== 'reauth_required') return first

  try {
    await openReauthModal()
  } catch {
    // user cancelled; return the original 403 response semantics to caller
    return new Response(JSON.stringify(data ?? { ok: false, code: 'reauth_required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Retry once after successful reauth
  return await requestFn()
}

// -------------------- DATA LOAD/SAVE --------------------
async function load() {
  const res = await fetch('/settings', {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
    },
  })
  if (res.ok) {
    const data = await res.json()
    form.email = data.email ?? ''
    initialEmail.value = data.email ?? ''
    cur_picture.value = data.profile_picture ?? null
  } else {
    error.value = 'Failed to load'
  }
}

async function save() {
  error.value = ''
  saved.value = false
  form.email = emailTrimmed.value

  const body = new FormData()
  body.append('email', form.email)
  if (form.profile_picture) body.append('profile_picture', form.profile_picture)

  const res = await fetchWithReauth(() =>
    fetch('/settings', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json', 'X-CSRFToken': csrftoken || '' },
      body
    })
  )

  if (res.ok) {
    const data = await res.json().catch(() => ({}))
    saved.value = true
    cur_picture.value = data.profile_picture ?? cur_picture.value

    initialEmail.value = data.email ?? form.email
    form.email = data.email ?? form.email
  } else {
    const data = await res.json().catch(() => null)
    if (res.status === 403 && data?.code === 'reauth_required') {
      error.value = 'Password confirmation required.'
    } else {
      error.value = data?.error || 'Failed to save'
    }
  }
}

// -------------------- EMAIL VERIFICATION --------------------
async function sendVerificationEmail() {
  verifyError.value = ''
  verifySaved.value = false

  const email = emailTrimmed.value

  if (!emailChangedFromInitial.value) {
    verifyError.value = 'Email is unchanged. Update the email first, then request verification.'
    return
  }
  if (!isValidEmail(email)) {
    verifyError.value = 'Please enter a valid email address.'
    return
  }

  verifyInProgress.value = true
  try {
    const res = await fetchWithReauth(() =>
      fetch('/settings/send_verification_email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken || ''
        },
        credentials: 'same-origin',
        body: JSON.stringify({ email })
      })
    )

    if (res.ok) {
      verifySaved.value = true
    } else {
      const data = await res.json().catch(() => null)
      if (res.status === 403 && data?.code === 'reauth_required') {
        verifyError.value = 'Password confirmation required.'
      } else {
        verifyError.value = data?.error || data?.message || 'Failed to send verification email'
      }
    }
  } catch (e) {
    verifyError.value = 'Network error'
  } finally {
    verifyInProgress.value = false
  }
}

// -------------------- PASSWORD CHANGE --------------------
async function changePassword() {
  pwError.value = ''
  pwSaved.value = false

  const res = await fetch('/settings/password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrftoken || ''
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        current_password: pw.current,
        new_password1: pw.n1,
        new_password2: pw.n2
      })
  })

  if (res.ok) {
    pwSaved.value = true
    pw.current = ''
    pw.n1 = ''
    pw.n2 = ''
  } else {
    const data = await res.clone().json().catch(() => null)
    if (res.status === 403 && data?.code === 'reauth_required') {
      pwError.value = 'Password confirmation required.'
    } else {
      pwError.value = data?.errors ? JSON.stringify(data.errors) : (data?.error || 'Failed to change password')
      if (res.status === 403 && data?.code === "account_locked") {
        setTimeout(() => {
          window.location.assign('/?code=account_locked');
        }, 2000)
      }
    }
  }
}

function change_picture(file_data) {
  const file = file_data.file.file
  form.profile_picture = file
  cur_picture.value = URL.createObjectURL(file)
}

// -------------------- DELETE ACCOUNT --------------------
async function deleteAccount() {
  deleteError.value = ''
  deleteInProgress.value = true

  if (deleteConfirm.value.toLowerCase() !== 'delete') {
    deleteError.value = 'Please type "delete" to confirm'
    deleteInProgress.value = false
    return
  }

  try {
    const res = await fetchWithReauth(() =>
      fetch('/settings/delete_account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken || ''
        },
        credentials: 'same-origin'
      })
    )

    if (res.ok) {
      window.location.href = '/'
      return
    }

    const data = await res.json().catch(() => null)
    if (res.status === 403 && data?.code === 'reauth_required') {
      deleteError.value = 'Password confirmation required.'
    } else {
      deleteError.value = data?.error || data?.message || 'Failed to delete account'
    }
    deleteInProgress.value = false
  } catch (err) {
    deleteError.value = 'Network error'
    deleteInProgress.value = false
  }
}

function openDeleteModal() {
  showDeleteModal.value = true
  deleteConfirm.value = ''
  deleteError.value = ''
}

function closeDeleteModal() {
  showDeleteModal.value = false
  deleteConfirm.value = ''
  deleteError.value = ''
}

onMounted(load)
</script>

<template>
  <n-message-provider>
    <n-card id="settings_main" title="Settings">
      <n-tabs v-model:value="tab" type="line">
        <n-tab-pane id="tab_pane" name="account" tab="Account">
          <n-form id="settings_form" @submit.prevent="save">
            <n-form-item label="Email">
              <div class="stack">
                <n-input
                  v-model:value="form.email"
                  class="email_input"
                  type="email"
                  required
                  :placeholder="initialEmail || 'you@example.com'"
                />

                <div class="verify_row">
                  <n-button
                    type="info"
                    attr-type="button"
                    :disabled="!canSendVerification"
                    :loading="verifyInProgress"
                    @click="sendVerificationEmail"
                  >
                    Verify email
                  </n-button>

                  <small v-if="!emailLooksValid && emailTrimmed" class="hint_error">Invalid email format.</small>
                  <small v-else-if="!emailChangedFromInitial" class="hint_muted">Change email to enable verification.</small>
                </div>

                <div class="alerts_stack" v-if="verifyError || verifySaved">
                  <n-alert v-if="verifyError" type="error">{{ verifyError }}</n-alert>
                  <n-alert v-if="verifySaved" type="ok">Verification email sent. Check your inbox.</n-alert>
                </div>
              </div>
            </n-form-item>

            <n-form-item label="Profile Picture">
              <div class="stack center">
                <img id="profile_picture" :src="cur_picture" objectFit="cover" :lazy="false" preview-disabled />

                <n-upload :default-upload="false" :max="1" :multiple="false" @change="change_picture">
                  <n-button>Upload</n-button>
                </n-upload>

                <small class="hint_muted">PNG/JPG recommended.</small>
              </div>
            </n-form-item>

            <n-button type="primary" attr-type="submit">Save</n-button>
          </n-form>

          <n-button type="error" class="mt-4" @click="openDeleteModal">
            Delete Account
          </n-button>

          <div class="alerts_stack" v-if="error || saved">
            <n-alert v-if="error" type="error">{{ error }}</n-alert>
            <n-alert v-if="saved" type="ok">Saved</n-alert>
          </div>
        </n-tab-pane>

        <n-tab-pane name="security" tab="Security">
          <n-form id="settings_form" @submit.prevent="changePassword">
            <n-form-item label="Current password">
              <n-input v-model:value="pw.current" type="password" required />
            </n-form-item>
            <n-form-item label="New password">
              <n-input v-model:value="pw.n1" type="password" required />
            </n-form-item>
            <n-form-item label="Confirm new password">
              <n-input v-model:value="pw.n2" type="password" required />
            </n-form-item>
            <n-button type="primary" attr-type="submit">Change password</n-button>
          </n-form>

          <div class="alerts_stack" v-if="pwError || pwSaved">
            <n-alert v-if="pwError" type="error">{{ pwError }}</n-alert>
            <n-alert v-if="pwSaved" type="ok">Password updated</n-alert>
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <!-- DELETE MODAL -->
    <n-modal
      v-model:show="showDeleteModal"
      preset="dialog"
      title="Delete Account"
      positive-text="Delete"
      negative-text="Cancel"
      :loading="deleteInProgress"
      @positive-click="deleteAccount"
      @negative-click="closeDeleteModal"
    >
      <div style="padding: 1rem 0;">
        <n-alert type="error" title="Warning: This action cannot be undone" class="mb-4">
          All your data will be permanently deleted. This includes your profile, settings, and any associated content.
        </n-alert>

        <p class="mb-2">To confirm deletion, please type <strong>"delete"</strong> in the box below:</p>

        <n-input
          v-model:value="deleteConfirm"
          placeholder="Type 'delete' to confirm"
          class="mb-4"
          :disabled="deleteInProgress"
        />

        <n-alert v-if="deleteError" type="error" class="mb-4">
          {{ deleteError }}
        </n-alert>
      </div>
    </n-modal>

    <!-- REAUTH MODAL -->
    <n-modal
      v-model:show="showReauthModal"
      preset="dialog"
      title="Confirm password"
      positive-text="Continue"
      negative-text="Cancel"
      :loading="reauthInProgress"
      :mask-closable="false"
      :close-on-esc="false"
      @positive-click="doReauth"
      @negative-click="cancelReauthModal"
    >
      <div style="padding: 1rem 0;">
        <p class="mb-2">Enter your password to continue.</p>

        <n-input
          v-model:value="reauthPassword"
          type="password"
          placeholder="Password"
          class="mb-4"
          :disabled="reauthInProgress"
          @keydown.enter.prevent="doReauth"
        />

        <n-alert v-if="reauthError" type="error">
          {{ reauthError }}
        </n-alert>
      </div>
    </n-modal>
  </n-message-provider>
</template>

<style scoped lang="scss">
#settings_main {
  position: relative;
  top: 12vh;
  width: 40vw;
  min-width: 22rem;
  padding: 4vw;
  border-radius: 10px;
  background: var(--background_2);
  max-width: 600px;
  margin: 2rem auto;
}

#tab_pane {
  display: flex;
  flex-direction: column;
  align-items: center;
}

#settings_form {
  margin-bottom: 2rem;
  width: 100%;

  > * {
    max-width: 60%;
  }
}

#profile_picture {
  display: block;
  border-radius: 50%;
  margin-bottom: 0.5rem;
  object-fit: cover;
  width: 4rem;
  height: 4rem;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  width: 100%;
}

.center {
  align-items: center;
  text-align: center;
}

.email_input {
  width: 100%;
  max-width: 28rem;
}

.verify_row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  align-items: flex-start;
}

.alerts_stack {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.hint_error {
  color: #d03050;
}

.hint_muted {
  opacity: 0.7;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.mt-4 {
  margin-top: 1rem;
}
</style>
