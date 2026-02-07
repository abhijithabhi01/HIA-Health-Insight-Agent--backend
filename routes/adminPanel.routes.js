const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const HCApplication = require('../models/HCApplication');

/**
 * Admin Panel Login Page
 */
router.get('/login', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Login - HIA</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .login-container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 40px;
      width: 100%;
      max-width: 400px;
    }
    
    .logo {
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      font-weight: bold;
      margin: 0 auto 24px;
    }
    
    h1 {
      text-align: center;
      color: #1a202c;
      margin-bottom: 8px;
      font-size: 28px;
    }
    
    .subtitle {
      text-align: center;
      color: #718096;
      margin-bottom: 32px;
      font-size: 14px;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    label {
      display: block;
      color: #4a5568;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 15px;
      transition: all 0.3s;
    }
    
    input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    
    button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }
    
    button:hover {
      transform: translateY(-2px);
    }
    
    button:active {
      transform: translateY(0);
    }
    
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    
    .error {
      background: #fed7d7;
      color: #c53030;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
      display: none;
    }
    
    .error.show {
      display: block;
    }
    
    .footer {
      margin-top: 24px;
      text-align: center;
      color: #a0aec0;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <div class="logo">🔐</div>
    <h1>Admin Login</h1>
    <p class="subtitle">Health Insight Agent - Admin Panel</p>
    
    <div class="error" id="error"></div>
    
    <form id="loginForm">
      <div class="form-group">
        <label for="email">Email Address</label>
        <input 
          type="email" 
          id="email" 
          name="email" 
          required 
          placeholder="admin@hia.com"
          autocomplete="email"
        >
      </div>
      
      <div class="form-group">
        <label for="password">Password</label>
        <input 
          type="password" 
          id="password" 
          name="password" 
          required 
          placeholder="Enter your password"
          autocomplete="current-password"
        >
      </div>
      
      <button type="submit" id="loginBtn">Sign In</button>
    </form>
    
    <div class="footer">
      © 2026 Health Insight Agent<br>
      Admin Access Only
    </div>
  </div>
  
  <script>
    const form = document.getElementById('loginForm');
    const errorDiv = document.getElementById('error');
    const loginBtn = document.getElementById('loginBtn');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      errorDiv.classList.remove('show');
      loginBtn.disabled = true;
      loginBtn.textContent = 'Signing in...';
      
      try {
        const response = await fetch('/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // Store token
          localStorage.setItem('adminToken', data.token);
          
          // Check if user is admin
          const profileResponse = await fetch('/auth/profile', {
            headers: {
              'Authorization': 'Bearer ' + data.token
            }
          });
          
          const profile = await profileResponse.json();
          
          if (profile.role === 'ADMIN') {
            // Redirect to dashboard
            window.location.href = '/admin-panel/dashboard';
          } else {
            throw new Error('Access denied. Admin privileges required.');
          }
        } else {
          throw new Error(data.error || 'Login failed');
        }
      } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.add('show');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
      }
    });
  </script>
</body>
</html>
  `);
});

/**
 * Admin Dashboard
 */
router.get('/dashboard', async (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Dashboard - HIA</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f7fafc;
      color: #2d3748;
    }
    
    .navbar {
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .navbar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 20px;
      font-weight: 600;
      color: #1a202c;
    }
    
    .logo-small {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 16px;
    }
    
    .navbar-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    
    .btn-logout {
      padding: 8px 16px;
      background: #e53e3e;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }
    
    .btn-logout:hover {
      background: #c53030;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }
    
    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .tab {
      padding: 12px 24px;
      background: none;
      border: none;
      border-bottom: 3px solid transparent;
      cursor: pointer;
      font-size: 15px;
      font-weight: 600;
      color: #718096;
      transition: all 0.3s;
    }
    
    .tab.active {
      color: #667eea;
      border-bottom-color: #667eea;
    }
    
    .tab:hover {
      color: #4c51bf;
    }
    
    .tab-content {
      display: none;
    }
    
    .tab-content.active {
      display: block;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }
    
    .stat-card {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .stat-label {
      color: #718096;
      font-size: 14px;
      margin-bottom: 8px;
    }
    
    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #1a202c;
    }
    
    .stat-sub {
      color: #a0aec0;
      font-size: 12px;
      margin-top: 4px;
    }
    
    .card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    
    .card-header {
      padding: 20px 24px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .card-title {
      font-size: 18px;
      font-weight: 600;
    }
    
    .filters {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    
    select, input {
      padding: 8px 12px;
      border: 2px solid #e2e8f0;
      border-radius: 6px;
      font-size: 14px;
    }
    
    select:focus, input:focus {
      outline: none;
      border-color: #667eea;
    }
    
    .table-container {
      overflow-x: auto;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    th {
      text-align: left;
      padding: 16px 24px;
      background: #f7fafc;
      color: #4a5568;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    td {
      padding: 16px 24px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    tr:hover {
      background: #f7fafc;
    }
    
    .badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      display: inline-block;
    }
    
    .badge-pending {
      background: #fef5e7;
      color: #d69e2e;
    }
    
    .badge-approved {
      background: #c6f6d5;
      color: #2f855a;
    }
    
    .badge-rejected {
      background: #fed7d7;
      color: #c53030;
    }
    
    .badge-admin {
      background: #667eea;
      color: white;
    }
    
    .badge-hc {
      background: #48bb78;
      color: white;
    }
    
    .badge-user {
      background: #cbd5e0;
      color: #2d3748;
    }
    
    .btn {
      padding: 6px 14px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
    }
    
    .btn-sm {
      padding: 4px 10px;
      font-size: 12px;
    }
    
    .btn-primary {
      background: #667eea;
      color: white;
    }
    
    .btn-primary:hover {
      background: #5a67d8;
    }
    
    .btn-success {
      background: #48bb78;
      color: white;
    }
    
    .btn-success:hover {
      background: #38a169;
    }
    
    .btn-danger {
      background: #f56565;
      color: white;
    }
    
    .btn-danger:hover {
      background: #e53e3e;
    }
    
    .btn-group {
      display: flex;
      gap: 8px;
    }
    
    .loading {
      text-align: center;
      padding: 40px;
      color: #a0aec0;
    }
    
    .empty {
      text-align: center;
      padding: 40px;
      color: #a0aec0;
    }
    
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }
    
    .modal.show {
      display: flex;
    }
    
    .modal-content {
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 600px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .modal-title {
      font-size: 20px;
      font-weight: 600;
    }
    
    .btn-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #a0aec0;
    }
    
    .detail-row {
      display: flex;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .image-center{
     display: flex;
    justify-content: center;
    }
    .dp-row{
    display: flex;
    justify-content: center;
    align-items:center;
    }
    .profile-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  margin-top: 8px;
}
    .detail-label {
      width: 40%;
      color: #718096;
      font-weight: 600;
      font-size: 14px;
    }
    
    .detail-value {
      width: 60%;
      color: #2d3748;
    }
    
    .file-preview {
      margin-top: 8px;
      padding: 12px;
      background: #f7fafc;
      border-radius: 6px;
      font-size: 13px;
    }
    
    .file-link {
      color: #667eea;
      text-decoration: none;
    }
    
    .file-link:hover {
      text-decoration: underline;
    }
    
    textarea {
      width: 100%;
      padding: 12px;
      border: 2px solid #e2e8f0;
      border-radius: 6px;
      font-family: inherit;
      font-size: 14px;
      resize: vertical;
      min-height: 100px;
    }
    
    textarea:focus {
      outline: none;
      border-color: #667eea;
    }
  </style>
</head>
<body>
  <div class="navbar">
    <div class="navbar-brand">
      <div class="logo-small">🔐</div>
      <span>Admin Dashboard</span>
    </div>
    <div class="navbar-actions">
      <span id="adminName" style="color: #718096; font-size: 14px;"></span>
      <button class="btn-logout" onclick="logout()">Logout</button>
    </div>
  </div>
  
  <div class="container">
    <div class="tabs">
      <button class="tab active" onclick="switchTab('overview')">📊 Overview</button>
      <button class="tab" onclick="switchTab('applications')">📋 Applications</button>
      <button class="tab" onclick="switchTab('users')">👥 Users</button>
    </div>
    
    <!-- Overview Tab -->
    <div class="tab-content active" id="overview">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Users</div>
          <div class="stat-value" id="totalUsers">-</div>
          <div class="stat-sub">All registered users</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Healthcare Assistants</div>
          <div class="stat-value" id="totalHC">-</div>
          <div class="stat-sub">Approved HC accounts</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Pending Applications</div>
          <div class="stat-value" id="pendingApps">-</div>
          <div class="stat-sub">Awaiting review</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Applications</div>
          <div class="stat-value" id="totalApps">-</div>
          <div class="stat-sub">All time applications</div>
        </div>
      </div>
    </div>
    
    <!-- Applications Tab -->
    <div class="tab-content" id="applications">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">HC Applications</h2>
          <div class="filters">
            <select id="statusFilter" onchange="loadApplications()">
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <input 
              type="text" 
              id="appSearch" 
              placeholder="Search..." 
              onkeyup="loadApplications()"
            >
          </div>
        </div>
        <div class="table-container">
          <div id="applicationsLoading" class="loading">Loading applications...</div>
          <table id="applicationsTable" style="display: none;">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Qualification</th>
                <th>Company</th>
                <th>Status</th>
                <th>Applied</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="applicationsBody"></tbody>
          </table>
          <div id="applicationsEmpty" class="empty" style="display: none;">
            No applications found
          </div>
        </div>
      </div>
    </div>
    
    <!-- Users Tab -->
    <div class="tab-content" id="users">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">All Users</h2>
          <div class="filters">
            <select id="roleFilter" onchange="loadUsers()">
              <option value="">All Roles</option>
              <option value="USER">User</option>
              <option value="HC">HC</option>
              <option value="ADMIN">Admin</option>
            </select>
            <input 
              type="text" 
              id="userSearch" 
              placeholder="Search..." 
              onkeyup="loadUsers()"
            >
          </div>
        </div>
        <div class="table-container">
          <div id="usersLoading" class="loading">Loading users...</div>
          <table id="usersTable" style="display: none;">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="usersBody"></tbody>
          </table>
          <div id="usersEmpty" class="empty" style="display: none;">
            No users found
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Application Detail Modal -->
  <div class="modal" id="appModal">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">Application Details</h3>
        <button class="btn-close" onclick="closeModal('appModal')">&times;</button>
      </div>
      <div id="appDetails"></div>
    </div>
  </div>
  
  <!-- Reject Modal -->
  <div class="modal" id="rejectModal">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">Reject Application</h3>
        <button class="btn-close" onclick="closeModal('rejectModal')">&times;</button>
      </div>
      <div>
        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Rejection Reason:</label>
        <textarea id="rejectionReason" placeholder="Enter reason for rejection..."></textarea>
        <div style="margin-top: 16px; display: flex; gap: 12px; justify-content: flex-end;">
          <button class="btn" onclick="closeModal('rejectModal')">Cancel</button>
          <button class="btn btn-danger" onclick="confirmReject()">Reject Application</button>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    let token = localStorage.getItem('adminToken');
    let currentAppId = null;
    
    if (!token) {
      window.location.href = '/admin-panel/login';
    }
    
    // Load data on page load
    document.addEventListener('DOMContentLoaded', () => {
      checkAuth();
      loadStats();
      loadApplications();
    });
    
    async function checkAuth() {
      try {
        const response = await fetch('/auth/profile', {
          headers: {
            'Authorization': 'Bearer ' + token
          }
        });
        
        if (!response.ok) {
          throw new Error('Not authenticated');
        }
        
        const user = await response.json();
        
        if (user.role !== 'ADMIN') {
          alert('Access denied. Admin privileges required.');
          logout();
          return;
        }
        
        document.getElementById('adminName').textContent = user.name;
      } catch (error) {
        console.error('Auth check failed:', error);
        logout();
      }
    }
    
    function logout() {
      localStorage.removeItem('adminToken');
      window.location.href = '/admin-panel/login';
    }
    
    function switchTab(tab) {
      // Update tabs
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      event.target.classList.add('active');
      
      // Update content
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(tab).classList.add('active');
      
      // Load data for tab
      if (tab === 'applications') {
        loadApplications();
      } else if (tab === 'users') {
        loadUsers();
      }
    }
    
    async function loadStats() {
      try {
        const [userStats, appStats] = await Promise.all([
          fetch('/admin/users/stats', {
            headers: { 'Authorization': 'Bearer ' + token }
          }).then(r => r.json()),
          fetch('/admin/applications/stats', {
            headers: { 'Authorization': 'Bearer ' + token }
          }).then(r => r.json())
        ]);
        
        document.getElementById('totalUsers').textContent = userStats.total;
        document.getElementById('totalHC').textContent = userStats.byRole.hc;
        document.getElementById('pendingApps').textContent = appStats.byStatus.pending;
        document.getElementById('totalApps').textContent = appStats.total;
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    }
    
    async function loadApplications() {
      const status = document.getElementById('statusFilter').value;
      const search = document.getElementById('appSearch').value;
      
      document.getElementById('applicationsLoading').style.display = 'block';
      document.getElementById('applicationsTable').style.display = 'none';
      document.getElementById('applicationsEmpty').style.display = 'none';
      
      try {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (search) params.append('search', search);
        params.append('limit', '100');
        
        const response = await fetch('/admin/applications?' + params, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const data = await response.json();
        
        document.getElementById('applicationsLoading').style.display = 'none';
        
        if (data.applications.length === 0) {
          document.getElementById('applicationsEmpty').style.display = 'block';
          return;
        }
        
        document.getElementById('applicationsTable').style.display = 'table';
        
        const tbody = document.getElementById('applicationsBody');
        tbody.innerHTML = data.applications.map(app => \`
          <tr>
            <td>\${app.fullName}</td>
            <td>\${app.email}</td>
            <td>\${app.qualification}</td>
            <td>\${app.companyName}</td>
            <td><span class="badge badge-\${app.status.toLowerCase()}">\${app.status}</span></td>
            <td>\${new Date(app.appliedAt).toLocaleDateString()}</td>
            <td>
              <div class="btn-group">
                <button class="btn btn-sm btn-primary" onclick="viewApplication('\${app.id}')">
                  View
                </button>
                \${app.status === 'PENDING' ? \`
                  <button class="btn btn-sm btn-success" onclick="approveApplication('\${app.id}')">
                    Approve
                  </button>
                  <button class="btn btn-sm btn-danger" onclick="rejectApplication('\${app.id}')">
                    Reject
                  </button>
                \` : ''}
              </div>
            </td>
          </tr>
        \`).join('');
      } catch (error) {
        console.error('Failed to load applications:', error);
        document.getElementById('applicationsLoading').textContent = 'Failed to load applications';
      }
    }
    
    async function loadUsers() {
      const role = document.getElementById('roleFilter').value;
      const search = document.getElementById('userSearch').value;
      
      document.getElementById('usersLoading').style.display = 'block';
      document.getElementById('usersTable').style.display = 'none';
      document.getElementById('usersEmpty').style.display = 'none';
      
      try {
        const params = new URLSearchParams();
        if (role) params.append('role', role);
        if (search) params.append('search', search);
        params.append('limit', '100');
        
        const response = await fetch('/admin/users?' + params, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const data = await response.json();
        
        document.getElementById('usersLoading').style.display = 'none';
        
        if (data.users.length === 0) {
          document.getElementById('usersEmpty').style.display = 'block';
          return;
        }
        
        document.getElementById('usersTable').style.display = 'table';
        
        const tbody = document.getElementById('usersBody');
        tbody.innerHTML = data.users.map(user => \`
          <tr>
            <td>\${user.name}</td>
            <td>\${user.email}</td>
            <td><span class="badge badge-\${user.role.toLowerCase()}">\${user.role}</span></td>
            <td>\${user.isActive ? '✅ Active' : '❌ Inactive'}</td>
            <td>\${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>
              \${user.role !== 'ADMIN' ? \`
                <button 
                  class="btn btn-sm \${user.isActive ? 'btn-danger' : 'btn-success'}" 
                  onclick="toggleUserStatus('\${user.id}', \${!user.isActive})"
                >
                  \${user.isActive ? 'Deactivate' : 'Activate'}
                </button>
              \` : ''}
            </td>
          </tr>
        \`).join('');
      } catch (error) {
        console.error('Failed to load users:', error);
        document.getElementById('usersLoading').textContent = 'Failed to load users';
      }
    }
    
    async function viewApplication(id) {
      try {
        const response = await fetch('/admin/applications/' + id, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const app = await response.json();
        
        document.getElementById('appDetails').innerHTML = \`


<div class="dp-row"> 
<div class="detail-value image-center"> 
<img src="data:\${app.profilePicture.contentType};base64,\${app.profilePicture.data}" alt="Profile Picture" class="profile-image" > 
</div> 
</div>

          <div class="detail-row">
            <div class="detail-label">Full Name:</div>
            <div class="detail-value">\${app.fullName}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Email:</div>
            <div class="detail-value">\${app.email}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Qualification:</div>
            <div class="detail-value">\${app.qualification}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Company:</div>
            <div class="detail-value">\${app.companyName}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Status:</div>
            <div class="detail-value">
              <span class="badge badge-\${app.status.toLowerCase()}">\${app.status}</span>
            </div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Applied:</div>
            <div class="detail-value">\${new Date(app.appliedAt).toLocaleString()}</div>
          </div>
          \${app.processedAt ? \`
            <div class="detail-row">
              <div class="detail-label">Processed:</div>
              <div class="detail-value">\${new Date(app.processedAt).toLocaleString()}</div>
            </div>
          \` : ''}
          \${app.rejectionReason ? \`
            <div class="detail-row">
              <div class="detail-label">Rejection Reason:</div>
              <div class="detail-value">\${app.rejectionReason}</div>
            </div>
          \` : ''}

          <div class="detail-row">
            <div class="detail-label">Aadhaar Document:</div>
            <div class="detail-value">
              <div class="file-preview">
                📄 <button onclick="viewDocument('\${app.aadhaarDocument.contentType}', '\${app.aadhaarDocument.data}')" class="btn btn-sm" style="background: #3b82f6; color: white;">View Aadhaar Document</button>
              </div>
            </div>
          </div>
          \${app.status === 'PENDING' ? \`
            <div style="margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end;">
              <button class="btn btn-success" onclick="closeModal('appModal'); approveApplication('\${app.id}')">
                ✓ Approve
              </button>
              <button class="btn btn-danger" onclick="closeModal('appModal'); rejectApplication('\${app.id}')">
                ✗ Reject
              </button>
            </div>
          \` : ''}
        \`;
        
        document.getElementById('appModal').classList.add('show');
      } catch (error) {
        console.error('Failed to load application details:', error);
        alert('Failed to load application details');
      }
    }
    
    async function approveApplication(id) {
      if (!confirm('Are you sure you want to approve this application?')) {
        return;
      }
      
      try {
        const response = await fetch('/admin/applications/' + id + '/approve', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
          alert('Application approved successfully!');
          loadStats();
          loadApplications();
          closeModal('appModal');
        } else {
          const error = await response.json();
          alert('Failed to approve: ' + error.error);
        }
      } catch (error) {
        console.error('Failed to approve application:', error);
        alert('Failed to approve application');
      }
    }
    
    function rejectApplication(id) {
      currentAppId = id;
      document.getElementById('rejectionReason').value = '';
      document.getElementById('rejectModal').classList.add('show');
    }
    
    async function confirmReject() {
      const reason = document.getElementById('rejectionReason').value.trim();
      
      if (!reason) {
        alert('Please enter a rejection reason');
        return;
      }
      
      try {
        const response = await fetch('/admin/applications/' + currentAppId + '/reject', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ reason })
        });
        
        if (response.ok) {
          alert('Application rejected successfully!');
          loadStats();
          loadApplications();
          closeModal('rejectModal');
          closeModal('appModal');
        } else {
          const error = await response.json();
          alert('Failed to reject: ' + error.error);
        }
      } catch (error) {
        console.error('Failed to reject application:', error);
        alert('Failed to reject application');
      }
    }
    
    async function toggleUserStatus(userId, isActive) {
      const action = isActive ? 'activate' : 'deactivate';
      
      if (!confirm(\`Are you sure you want to \${action} this user?\`)) {
        return;
      }
      
      try {
        const response = await fetch('/admin/users/' + userId + '/status', {
          method: 'PATCH',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ isActive })
        });
        
        if (response.ok) {
          alert(\`User \${action}d successfully!\`);
          loadUsers();
          loadStats();
        } else {
          const error = await response.json();
          alert('Failed to update user: ' + error.error);
        }
      } catch (error) {
        console.error('Failed to update user:', error);
        alert('Failed to update user');
      }
    }
    
    
    function closeModal(modalId) {
      document.getElementById(modalId).classList.remove('show');
    }
    
    function viewDocument(contentType, base64Data) {
      const newWindow = window.open('', '_blank');
      if (contentType.includes('pdf')) {
        newWindow.document.write('<!DOCTYPE html><html><head><title>Aadhaar Document</title></head><body style="margin:0;"><embed src="data:' + contentType + ';base64,' + base64Data + '" width="100%" height="100%" type="application/pdf"></body></html>');
      } else {
        newWindow.document.write('<!DOCTYPE html><html><head><title>Aadhaar Document</title></head><body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#000;"><img src="data:' + contentType + ';base64,' + base64Data + '" style="max-width:100%; max-height:100vh;"></body></html>');
      }
    }
    
    
    // Close modal on background click
    window.onclick = function(event) {
      if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
      }
    };
  </script>
</body>
</html>
  `);
});

module.exports = router;