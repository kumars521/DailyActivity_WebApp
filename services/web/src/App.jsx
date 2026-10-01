import { useEffect, useState } from 'react'
import { BrowserRouter, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import {
  AppBar,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  CssBaseline,
  FormControl,
  Grid,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableFooter,
  TableRow,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from '@mui/material'
import {
  AddCircleRounded,
  DashboardRounded,
  LibraryBooksRounded,
} from '@mui/icons-material'
import api from './api'
import './App.css'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2563eb' },
    secondary: { main: '#14b8a6' },
    background: { default: '#f8fafc' },
    text: { primary: '#0f172a', secondary: '#64748b' },
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    button: { textTransform: 'none' },
  },
})

function StatusChip({ label }) {
  const colors = {
    Completed: 'success',
    Pending: 'warning',
    'In Progress': 'warning',
    Submitted: 'info',
    Draft: 'secondary',
    Approved: 'success',
  }

  return <Chip label={label} color={colors[label] || 'default'} size="small" />
}

function OverviewPage() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getActivitySummary().then(setSummary).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="overline" color="text.secondary">Overview</Typography>
              <Typography variant="h4">Daily activity summary</Typography>
            </Box>
            <Button variant="contained" startIcon={<AddCircleRounded />} href="/new-activity">
              New activity
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">Total minutes</Typography>
              <Typography variant="h4">{summary?.totalMinutes ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">Active days</Typography>
              <Typography variant="h4">{summary?.activeDays ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">Recent focus</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {(summary?.recentCategories ?? []).map((category) => (
                  <Chip key={category} label={category} color="secondary" />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 2 }}>Recent entries</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Minutes</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(summary?.entries ?? []).map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.date}</TableCell>
                    <TableCell>{entry.category}</TableCell>
                    <TableCell>{entry.durationMinutes}</TableCell>
                    <TableCell><StatusChip label={entry.status || 'Draft'} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Stack>
  )
}

function NewActivityPage() {
  const navigate = useNavigate()
  const params = new URLSearchParams(window.location.search)
  const editId = params.get('editId')

  const [form, setForm] = useState({
    date: '2026-10-01',
    category: 'Deep Work',
    durationMinutes: 60,
    description: 'Team workshop and planning session',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!editId) return

    let active = true
    api.getActivities().then((entries) => {
      if (!active) return
      const entry = entries.find((item) => item.id === editId)
      if (!entry) return

      setForm({
        date: entry.date || '2026-10-01',
        category: entry.category || 'Deep Work',
        durationMinutes: entry.durationMinutes ?? entry.duration ?? 60,
        description: entry.notes || entry.description || '',
      })
    })

    return () => {
      active = false
    }
  }, [editId])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)

    try {
      if (editId) {
        await api.updateActivity(editId, form)
      } else {
        await api.createActivity(form)
      }
      navigate('/entries')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h4" sx={{ mb: 3 }}>{editId ? 'Edit activity' : 'New activity'}</Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
          <TextField
            label="Date"
            type="date"
            value={form.date}
            onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Category"
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
          />
          <TextField
            label="Minutes"
            type="number"
            value={form.durationMinutes}
            onChange={(event) => setForm((current) => ({ ...current, durationMinutes: Number(event.target.value) }))}
          />
          <TextField
            label="Description"
            multiline
            minRows={3}
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
          <Stack direction="row" spacing={2}>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? (editId ? 'Updating…' : 'Saving…') : (editId ? 'Update activity' : 'Save activity')}
            </Button>
            <Button type="button" variant="outlined" onClick={() => navigate('/entries')}>
              Cancel
            </Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  )
}

function ActivityLogPage() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getActivities().then(setEntries).finally(() => setLoading(false))
  }, [])

  const handleStatusChange = async (entry, status) => {
    setUpdatingId(entry.id)
    setError('')

    try {
      const updated = await api.updateActivityStatus(entry.id, status)
      setEntries((current) => current.map((item) => (
        item.id === entry.id ? { ...item, ...updated, status } : item
      )))
    } catch {
      setError('Could not update activity status. Please try again.')
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return (
      <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Card>
      <CardContent>
        <Box component="header" sx={{ mb: 2 }}>
          <Typography variant="h4">Activity log</Typography>
          <Typography color="text.secondary">Review and update your daily activity.</Typography>
        </Box>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Topic</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.user || 'Alex Morgan'}</TableCell>
                  <TableCell>{entry.notes || entry.category}</TableCell>
                  <TableCell>{entry.category}</TableCell>
                  <TableCell>{entry.durationMinutes ?? entry.duration ?? 0} min</TableCell>
                  <TableCell><StatusChip label={entry.status || 'Draft'} /></TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <FormControl size="small" sx={{ minWidth: 130 }}>
                        <Select
                          value={entry.status || 'Draft'}
                          inputProps={{ 'aria-label': `Change status for ${entry.category} activity` }}
                          disabled={updatingId === entry.id}
                          onChange={(event) => handleStatusChange(entry, event.target.value)}
                        >
                          <MenuItem value="Pending">Pending</MenuItem>
                          <MenuItem value="Draft">Draft</MenuItem>
                          <MenuItem value="Completed">Completed</MenuItem>
                        </Select>
                      </FormControl>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => window.location.href = `/new-activity?editId=${encodeURIComponent(entry.id)}`}
                      >
                        Edit
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={6}>{entries.length} activities</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  )
}

function AppShell() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid rgba(15, 23, 42, 0.08)', backdropFilter: 'blur(12px)' }}>
        <Toolbar sx={{ maxWidth: 1200, width: '100%', mx: 'auto' }}>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, color: 'text.primary' }}>
            Daily Activity
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button component={NavLink} to="/" end sx={{ color: 'text.primary' }} startIcon={<DashboardRounded />}>
              Overview
            </Button>
            <Button component={NavLink} to="/new-activity" sx={{ color: 'text.primary' }} startIcon={<AddCircleRounded />}>
              New Activity
            </Button>
            <Button component={NavLink} to="/entries" sx={{ color: 'text.primary' }} startIcon={<LibraryBooksRounded />}>
              Activity Log
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container component="main" maxWidth="lg" sx={{ py: 4, flex: 1 }}>
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/new-activity" element={<NewActivityPage />} />
          <Route path="/entries" element={<ActivityLogPage />} />
        </Routes>
      </Container>
      <Box component="footer" sx={{ borderTop: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <Container maxWidth="lg" sx={{ py: 2 }}>
          <Typography variant="body2" color="text.secondary">Daily Activity</Typography>
        </Container>
      </Box>
    </Box>
  )
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </ThemeProvider>
  )
}
