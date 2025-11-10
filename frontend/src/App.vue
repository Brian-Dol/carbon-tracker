<template>
  <div style="max-width:720px;margin:24px auto;font-family:system-ui,Arial">
    <h1>🌍 Carbon Tracker</h1>

    <div v-if="!token">
      <h3>Login / Register</h3>
      <input v-model="username" placeholder="Username" />
      <input v-model="password" placeholder="Password" type="password" />
      <div style="margin-top:8px">
        <button @click="register">Register</button>
        <button @click="login">Login</button>
      </div>
      <p style="color:gray;margin-top:8px">Use any username/password to register then login.</p>
    </div>

    <div v-else>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h3>Welcome, {{ user }}</h3>
        <div>
          <button @click="logout">Logout</button>
        </div>
      </div>

      <section style="margin-top:12px">
        <h4>Add Energy Usage</h4>
        <input v-model="date" type="date" />
        <input v-model.number="energy_kwh" placeholder="kWh" />
        <button @click="addLog">Add</button>
      </section>

      <section style="margin-top:18px">
        <h4>Your Logs</h4>
        <table border="1" cellpadding="6" style="width:100%;background:white">
          <thead><tr><th>Date</th><th>kWh</th></tr></thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id">
              <td>{{ log.date }}</td>
              <td>{{ log.energy_kwh }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
const API = (import.meta.env.VITE_API_URL) || 'http://localhost:4000'
export default {
  data() {
    return {
      username: '',
      password: '',
      date: '',
      energy_kwh: null,
      logs: [],
      token: localStorage.getItem('token') || null
    }
  },
  computed: {
    user() {
      return this.username || 'user'
    }
  },
  methods: {
    async register() {
      try {
        await axios.post(`${API}/register`, { username: this.username, password: this.password })
        alert('Registered — now login')
      } catch (e) {
        alert(e.response?.data?.error || 'Register failed')
      }
    },
    async login() {
      try {
        const res = await axios.post(`${API}/login`, { username: this.username, password: this.password })
        this.token = res.data.token
        localStorage.setItem('token', this.token)
        await this.getLogs()
      } catch (e) {
        alert(e.response?.data?.error || 'Login failed')
      }
    },
    logout() {
      this.token = null
      localStorage.removeItem('token')
      this.logs = []
    },
    async addLog() {
      if (!this.token) return alert('Login first')
      try {
        await axios.post(`${API}/logs`, { date: this.date, energy_kwh: this.energy_kwh }, {
          headers: { Authorization: `Bearer ${this.token}` }
        })
        this.date = ''
        this.energy_kwh = null
        await this.getLogs()
      } catch (e) {
        alert(e.response?.data?.error || 'Add log failed')
      }
    },
    async getLogs() {
      if (!this.token) return
      try {
        const res = await axios.get(`${API}/logs`, {
          headers: { Authorization: `Bearer ${this.token}` }
        })
        this.logs = res.data
      } catch (e) {
        console.error(e)
        alert('Failed to load logs')
      }
    }
  },
  mounted() {
    if (this.token) this.getLogs()
  }
}
</script>

<style>
input { margin:4px; padding:6px; }
button { margin:4px; padding:6px 12px; }
body { background:#f3f4f6; }
</style>
