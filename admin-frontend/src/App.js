import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link
} from 'react-router-dom';
import axios from 'axios';
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Container,
  CssBaseline,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  IconButton
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Chat as ChatIcon,
  BarChart as BarChartIcon,
  Settings as SettingsIcon,
  Api as ApiIcon,
  Person as UserIcon,
  Feedback as FeedbackIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// Set the base URL for API calls
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

// Axios configuration for admin API
const adminAxios = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Admin-Token': process.env.REACT_APP_ADMIN_TOKEN || ''
  }
});

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [conversationStats, setConversationStats] = useState([]);
  const [performanceStats, setPerformanceStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
    fetchConversationStats();
    fetchPerformanceStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await adminAxios.get('/admin/stats/system');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const fetchConversationStats = async () => {
    try {
      const response = await adminAxios.get('/admin/stats/conversations');
      setConversationStats(response.data.dailyMetrics || []);
    } catch (error) {
      console.error('Error fetching conversation stats:', error);
    }
  };

  const fetchPerformanceStats = async () => {
    try {
      const response = await adminAxios.get('/admin/stats/performance');
      setPerformanceStats(response.data);
    } catch (error) {
      console.error('Error fetching performance stats:', error);
    }
  };

  // Prepare data for charts
  const dailyConversationData = conversationStats.map(day => ({
    date: day.date,
    conversations: parseInt(day.total),
    avgResponseLength: Math.round(parseFloat(day.avg_response_length))
  }));

  // Prepare pie chart data for model usage
  const modelUsageData = [
    { name: 'Gemini', value: stats?.modelUsage?.gemini || 25 },
    { name: 'OpenRouter', value: stats?.modelUsage?.openrouter || 35 },
    { name: 'HuggingFace', value: stats?.modelUsage?.huggingface || 15 },
    { name: 'Fallback', value: stats?.modelUsage?.fallback || 25 }
  ];

  // Prepare bar chart data for response times
  const responseTimeData = (performanceStats?.responseTimeHistory || []).map((item, index) => ({
    date: item.date || `Day ${index + 1}`,
    avgResponseTime: parseFloat(item.avg_response_time) || 0
  }));

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading dashboard...</div>;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        System Analytics Dashboard
      </Typography>

      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Total Conversations Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Conversations
              </Typography>
              <Typography variant="h4" color="primary">
                {stats?.totalConversations || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Conversations Last 24h Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Conversations (24h)
              </Typography>
              <Typography variant="h4" color="secondary">
                {stats?.conversationsLast24h || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Users Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Users (24h)
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats?.activeUsers || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* System Health Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                System Health
              </Typography>
              <Typography variant="h4" color={stats?.systemHealth?.status === 'healthy' ? 'success.main' : 'error.main'}>
                {stats?.systemHealth?.status || 'unknown'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3}>
        {/* Daily Conversations Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Daily Conversations Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyConversationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="conversations" stroke="#8884d8" fill="#8884d8" name="Conversations" />
                  <Area type="monotone" dataKey="avgResponseLength" stroke="#82ca9d" fill="#82ca9d" name="Avg Response Length" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Model Usage Pie Chart */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                AI Model Usage Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={modelUsageData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {modelUsageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Response Time Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Average Response Time
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={responseTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgResponseTime" fill="#ff7300" name="Avg Response Time (seconds)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Metrics
              </Typography>
              {performanceStats ? (
                <Box>
                  <Typography variant="body2">Avg Response Time: {performanceStats.avgResponseTime}s</Typography>
                  <Typography variant="body2">API Success Rate: {performanceStats.successRate || 'N/A'}</Typography>
                  <Typography variant="body2">Error Count: {performanceStats.errorCount || 0}</Typography>
                  <Typography variant="body2">Active Connections: {performanceStats.activeConnections || 0}</Typography>
                  <Typography variant="body2">CPU Usage: {performanceStats.cpuUsage || 'N/A'}</Typography>
                  <Typography variant="body2">Memory Usage: {performanceStats.memoryUsage || 'N/A'}</Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">Loading performance data...</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

// Conversations Component
const Conversations = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 50 });

  useEffect(() => {
    fetchConversations();
  }, [pagination.page]);

  const fetchConversations = async () => {
    try {
      const response = await adminAxios.get(`/admin/conversations?page=${pagination.page}&limit=${pagination.limit}`);
      setConversations(response.data.conversations);
      setPagination(response.data.pagination);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading conversations...</div>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Recent Conversations
        </Typography>
        <Box>
          {conversations.map((conv) => (
            <Box key={conv.id} sx={{ borderBottom: '1px solid #eee', p: 2 }}>
              <Typography variant="subtitle2">User: {conv.facebook_user_id}</Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>User:</strong> {conv.user_request}
              </Typography>
              <Typography variant="body2" color="primary">
                <strong>Bot:</strong> {conv.chatbot_response}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                {new Date(conv.created_at).toLocaleString()}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    </Container>
  );
};

// Models Management Component
const Models = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await adminAxios.get('/admin/models');
      setModels(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching models:', error);
      setError('Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const toggleModelStatus = async (modelId, newStatus) => {
    try {
      if (newStatus === 'active') {
        await adminAxios.post(`/admin/models/${modelId}/activate`);
      } else {
        await adminAxios.post(`/admin/models/${modelId}/deactivate`);
      }
      // Refresh the list
      fetchModels();
    } catch (error) {
      console.error('Error updating model status:', error);
      setError('Failed to update model status');
    }
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading models...</div>;
  }

  if (error && !models.length) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            AI Models Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage and configure your AI models
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {models.map((model) => (
            <Grid item xs={12} md={6} key={model.id}>
              <Paper
                sx={{
                  p: 2,
                  height: '100%',
                  border: model.status === 'active' ? '2px solid #4caf50' : '2px solid #f44336',
                  backgroundColor: model.status === 'active' ? '#f1f8e9' : '#ffebee'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h6">{model.name}</Typography>
                    <Typography variant="body2" color="text.secondary">Provider: {model.provider}</Typography>
                    <Typography variant="body2">Model: {model.config.model}</Typography>
                    <Typography variant="body2">Temperature: {model.config.temperature}</Typography>
                    <Typography
                      variant="body2"
                      color={model.status === 'active' ? 'success.main' : 'error.main'}
                      sx={{ mt: 1 }}
                    >
                      Status: <strong>{model.status}</strong>
                    </Typography>
                    {model.usageCount !== undefined && (
                      <Typography variant="body2" color="text.secondary">
                        Usage: {model.usageCount} requests
                      </Typography>
                    )}
                    {model.lastUsed && (
                      <Typography variant="body2" color="text.secondary">
                        Last used: {new Date(model.lastUsed).toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                  <Box>
                    <button
                      onClick={() => toggleModelStatus(model.id, model.status === 'active' ? 'inactive' : 'active')}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: model.status === 'active' ? '#f44336' : '#4caf50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      {model.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Container>
  );
};

// API Keys Management Component
const APIKeys = () => {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState({
    name: '',
    provider: '',
    value: ''
  });

  useEffect(() => {
    fetchAPIKeys();
  }, []);

  const fetchAPIKeys = async () => {
    try {
      setLoading(true);
      const response = await adminAxios.get('/admin/api-keys');
      setApiKeys(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      setError('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleAddKeyChange = (e) => {
    setNewKey({
      ...newKey,
      [e.target.name]: e.target.value
    });
  };

  const handleAddKeySubmit = async (e) => {
    e.preventDefault();
    try {
      await adminAxios.post('/admin/api-keys', newKey);
      setNewKey({ name: '', provider: '', value: '' });
      setShowAddForm(false);
      fetchAPIKeys(); // Refresh the list
    } catch (error) {
      console.error('Error adding API key:', error);
      setError('Failed to add API key');
    }
  };

  const toggleApiKeyStatus = async (keyId, newStatus) => {
    try {
      await adminAxios.put(`/admin/api-keys/${keyId}`, {
        status: newStatus
      });
      fetchAPIKeys(); // Refresh the list
    } catch (error) {
      console.error('Error updating API key status:', error);
      setError('Failed to update API key status');
    }
  };

  const deleteApiKey = async (keyId) => {
    if (window.confirm('Are you sure you want to delete this API key?')) {
      try {
        await adminAxios.delete(`/admin/api-keys/${keyId}`);
        fetchAPIKeys(); // Refresh the list
      } catch (error) {
        console.error('Error deleting API key:', error);
        setError('Failed to delete API key');
      }
    }
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading API keys...</div>;
  }

  if (error && !apiKeys.length) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            API Keys Management
          </Typography>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showAddForm ? 'Cancel' : 'Add New Key'}
          </button>
        </Box>

        {showAddForm && (
          <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
            <Typography variant="h6" gutterBottom>
              Add New API Key
            </Typography>
            <form onSubmit={handleAddKeySubmit}>
              <div style={{ marginBottom: '10px' }}>
                <label>Name:</label>
                <input
                  type="text"
                  name="name"
                  value={newKey.name}
                  onChange={handleAddKeyChange}
                  required
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label>Provider:</label>
                <select
                  name="provider"
                  value={newKey.provider}
                  onChange={handleAddKeyChange}
                  required
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                >
                  <option value="">Select Provider</option>
                  <option value="Google">Google</option>
                  <option value="OpenRouter">OpenRouter</option>
                  <option value="HuggingFace">HuggingFace</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label>Key Value:</label>
                <input
                  type="password"
                  name="value"
                  value={newKey.value}
                  onChange={handleAddKeyChange}
                  required
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Add Key
              </button>
            </form>
          </Paper>
        )}

        <Grid container spacing={2}>
          {apiKeys.map((key) => (
            <Grid item xs={12} md={6} key={key.id}>
              <Paper
                sx={{
                  p: 2,
                  height: '100%',
                  border: key.status === 'active' ? '2px solid #4caf50' : '2px solid #f44336',
                  backgroundColor: key.status === 'active' ? '#e8f5e9' : '#ffebee'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h6">{key.name}</Typography>
                    <Typography variant="body2" color="text.secondary">Provider: {key.provider}</Typography>
                    <Typography variant="body2">Key: {key.value}</Typography>
                    <Typography
                      variant="body2"
                      color={key.status === 'active' ? 'success.main' : 'error.main'}
                      sx={{ mt: 1 }}
                    >
                      Status: <strong>{key.status}</strong>
                    </Typography>
                    {key.usageCount !== undefined && (
                      <Typography variant="body2" color="text.secondary">
                        Usage: {key.usageCount} requests
                      </Typography>
                    )}
                    {key.lastUsed && (
                      <Typography variant="body2" color="text.secondary">
                        Last used: {new Date(key.lastUsed).toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                  <Box>
                    <button
                      onClick={() => toggleApiKeyStatus(key.id, key.status === 'active' ? 'inactive' : 'active')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: key.status === 'active' ? '#f44336' : '#4caf50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginBottom: '5px'
                      }}
                    >
                      {key.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => deleteApiKey(key.id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#ff9800',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Container>
  );
};

// Feedback Component
const Feedback = () => {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      const response = await adminAxios.get('/admin/feedback');
      setFeedback(response.data.feedback);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading feedback...</div>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          User Feedback
        </Typography>
        <Box>
          {feedback.map((item) => (
            <Box key={item.id} sx={{ borderBottom: '1px solid #eee', p: 2 }}>
              <Typography variant="subtitle2">User: {item.user_id}</Typography>
              <Typography variant="body2">Rating: {item.rating}</Typography>
              {item.feedback_text && (
                <Typography variant="body2" color="text.secondary">
                  Comment: {item.feedback_text}
                </Typography>
              )}
              <Typography variant="caption" color="text.disabled">
                {new Date(item.created_at).toLocaleString()}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    </Container>
  );
};

// Settings Component
const Settings = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          System Settings
        </Typography>
        <Typography variant="body1">
          System configuration and settings will be available here.
        </Typography>
      </Paper>
    </Container>
  );
};

// Main App Component
const App = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <div>
      <Toolbar />
      <List>
        <ListItem button component={Link} to="/dashboard">
          <ListItemIcon><DashboardIcon /></ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem button component={Link} to="/conversations">
          <ListItemIcon><ChatIcon /></ListItemIcon>
          <ListItemText primary="Conversations" />
        </ListItem>
        <ListItem button component={Link} to="/models">
          <ListItemIcon><BarChartIcon /></ListItemIcon>
          <ListItemText primary="Models" />
        </ListItem>
        <ListItem button component={Link} to="/api-keys">
          <ListItemIcon><ApiIcon /></ListItemIcon>
          <ListItemText primary="API Keys" />
        </ListItem>
        <ListItem button component={Link} to="/feedback">
          <ListItemIcon><FeedbackIcon /></ListItemIcon>
          <ListItemText primary="Feedback" />
        </ListItem>
        <ListItem button component={Link} to="/settings">
          <ListItemIcon><SettingsIcon /></ListItemIcon>
          <ListItemText primary="Settings" />
        </ListItem>
      </List>
    </div>
  );

  return (
    <Router>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              Chatbot Admin Dashboard
            </Typography>
          </Toolbar>
        </AppBar>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
          }}
          open
        >
          {drawer}
        </Drawer>
        <Box
          component="main"
          sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - 240px)` } }}
        >
          <Toolbar />
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/conversations" element={<Conversations />} />
            <Route path="/models" element={<Models />} />
            <Route path="/api-keys" element={<APIKeys />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Box>
      </Box>
    </Router>
  );
};

export default App;