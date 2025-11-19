import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import RefreshIcon from "@mui/icons-material/Refresh";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import HomeIcon from "@mui/icons-material/Home";
import SettingsIcon from "@mui/icons-material/Settings";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import ListAltIcon from "@mui/icons-material/ListAlt";
import MenuIcon from "@mui/icons-material/Menu";
import TankForm from "./components/TankForm.jsx";
import FillForm from "./components/FillForm.jsx";
import GaugeForm from "./components/GaugeForm.jsx";
import GaugeMeter from "./components/GaugeMeter.jsx";
import StatsPanel from "./components/StatsPanel.jsx";
import GaugeQuickActions from "./components/GaugeQuickActions.jsx";
import GaugeLogTable from "./components/GaugeLogTable.jsx";
import FillLogTable from "./components/FillLogTable.jsx";

const API_BASE = "/api";
const emptyPayload = {
  tank: null,
  usageEntries: [],
  fillEvents: [],
  gaugeSnapshots: [],
  stats: {
    totals: null,
    averages: null,
    forecast: null,
    lastFill: null,
    lastGauge: null,
  },
};

const postJson = async (path, payload) => {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.error || "Request failed";
    throw new Error(message);
  }
  return response.json();
};

const drawerWidth = 260;

const theme = createTheme({
  palette: {
    primary: {
      main: "#1d4ed8",
    },
    background: {
      default: "#f5f6fb",
    },
  },
  shape: {
    borderRadius: 12,
  },
});

function App() {
  const [data, setData] = useState(emptyPayload);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("home");
  const [drawerOpen, setDrawerOpen] = useState(true);
  const isSmallScreen = useMediaQuery("(max-width:599px)");
  const hasTankConfigured = Boolean(data.tank);

  const fetchState = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/state`, {
        cache: "no-store",
      });
      if (response.status === 304) {
        return;
      }
      if (!response.ok) {
        const raw = await response.text();
        let message = "Failed to load state";
        try {
          const body = JSON.parse(raw);
          message = body.error || message;
        } catch {
          if (raw) {
            message = raw;
          }
        }
        throw new Error(message);
      }
      const payload = await response.json();
      setData(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  useEffect(() => {
    if (isSmallScreen) {
      setDrawerOpen(false);
    }
  }, [isSmallScreen]);

  const submitAndRefresh = useCallback(
    async (path, payload) => {
      setBusy(true);
      setError("");
      try {
        const updated = await postJson(path, payload);
        setData(updated);
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const resetAll = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/state`, {
        method: "DELETE",
      });
      const payload = await response.json();
      setData(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const lastFillSummary = useMemo(() => {
    if (!data.stats.lastFill) {
      return null;
    }
    const lastFill = data.stats.lastFill;
    return `${formatDate(lastFill.recordedAt)} — ${lastFill.gallonsAdded} gal @ $${lastFill.pricePerGallon?.toFixed(
      2
    )}/gal`;
  }, [data.stats.lastFill]);

  const handleGaugeSubmit = useCallback(
    (payload) => submitAndRefresh("/gauge", payload),
    [submitAndRefresh]
  );

  const handleQuickGauge = useCallback(
    (level) =>
      handleGaugeSubmit({
        autoDetect: false,
        level,
        recordedAt: new Date().toISOString(),
      }),
    [handleGaugeSubmit]
  );

  const navItems = [
    {
      key: "home",
      label: "Home",
      icon: <HomeIcon />,
      description: "Overview and quick gauge actions.",
    },
    {
      key: "config",
      label: "Configuration",
      icon: <SettingsIcon />,
      description: "Manage tank details and gauge history.",
    },
    {
      key: "fill",
      label: "Fill",
      icon: <LocalGasStationIcon />,
      description: "Track deliveries and spending history.",
    },
    {
      key: "log",
      label: "Log",
      icon: <ListAltIcon />,
      description: "Review gauge snapshots and detection details.",
    },
  ];

  const drawerContent = (
    <>
      <Toolbar />
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <List>
          {navItems.map((item) => (
            <ListItem disablePadding key={item.key}>
              <ListItemButton
                selected={activeView === item.key}
                onClick={() => {
                  setActiveView(item.key);
                  if (isSmallScreen) {
                    setDrawerOpen(false);
                  }
                }}
                alignItems="flex-start"
              >
                <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} secondary={item.description} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider />
        <Box sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Choose a panel to focus on configuration, fills, or logs.
          </Typography>
        </Box>
      </Box>
    </>
  );

  const renderContent = () => {
    if (activeView === "config") {
      return (
        <Stack spacing={3}>
          <TankForm
            tank={data.tank}
            disabled={busy}
            layout="column"
            onSubmit={(payload) => submitAndRefresh("/tank", payload)}
          />
        </Stack>
      );
    }

    if (activeView === "fill") {
      return (
        <Stack spacing={3}>
          <FillForm
            disabled={!hasTankConfigured || busy}
            onSubmit={(payload) => submitAndRefresh("/fill", payload)}
          />
        </Stack>
      );
    }

    if (activeView === "log") {
      return (
        <Stack spacing={3}>
          <FillLogTable
            fillEvents={data.fillEvents}
            disabled={!hasTankConfigured}
          />
          <GaugeLogTable
            gaugeSnapshots={data.gaugeSnapshots}
            disabled={!hasTankConfigured}
          />
        </Stack>
      );
    }

    return (
      <Stack spacing={3}>
        <StatsPanel stats={data.stats} lastFillSummary={lastFillSummary} />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1.2fr 0.8fr" },
            gap: 3,
          }}
        >
          <GaugeMeter
            tank={data.tank}
            lastGauge={data.stats.lastGauge}
            disabled={!hasTankConfigured}
          />
          <Stack spacing={3}>
            <GaugeQuickActions
              disabled={!hasTankConfigured || busy}
              onQuickSelect={handleQuickGauge}
            />
            <GaugeForm
              disabled={!hasTankConfigured || busy}
              onSubmit={handleGaugeSubmit}
            />
          </Stack>
        </Box>
      </Stack>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        <AppBar
          position="fixed"
          color="primary"
          enableColorOnDark
          sx={{
            zIndex: (themeArg) => themeArg.zIndex.drawer + 1,
            width: { sm: drawerOpen ? `calc(100% - ${drawerWidth}px)` : "100%" },
            ml: { sm: drawerOpen ? `${drawerWidth}px` : 0 },
          }}
        >
          <Toolbar sx={{ gap: 2, flexWrap: "wrap" }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setDrawerOpen((prev) => !prev)}
              sx={{ mr: 1 }}
              aria-label="Toggle navigation menu"
            >
              <MenuIcon />
            </IconButton>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" component="h1">
                Heating Oil Tracker
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<RefreshIcon />}
                disabled={busy || loading}
                onClick={fetchState}
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<RestartAltIcon />}
                disabled={busy || loading}
                onClick={resetAll}
              >
                Reset Data
              </Button>
            </Stack>
          </Toolbar>
        </AppBar>

        <Drawer
          variant="persistent"
          anchor="left"
          open={drawerOpen}
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            display: { xs: "none", sm: "block" },
            [`& .MuiDrawer-paper`]: {
              width: drawerWidth,
              boxSizing: "border-box",
              borderRight: "1px solid",
              borderColor: "divider",
            },
          }}
        >
          {drawerContent}
        </Drawer>

        <Drawer
          variant="temporary"
          anchor="left"
          open={drawerOpen && isSmallScreen}
          onClose={() => setDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            [`& .MuiDrawer-paper`]: {
              width: drawerWidth,
              boxSizing: "border-box",
              borderRight: "1px solid",
              borderColor: "divider",
            },
          }}
        >
          {drawerContent}
        </Drawer>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            bgcolor: "background.default",
            px: { xs: 2, md: 4 },
            py: 3,
            width: {
              sm: drawerOpen ? `calc(100% - ${drawerWidth}px)` : "100%",
            },
          }}
        >
          <Toolbar />
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {busy && <Alert severity="info" sx={{ mb: 2 }}>Saving…</Alert>}

          {loading ? (
            <Box
              sx={{
                minHeight: 280,
                bgcolor: "background.paper",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <CircularProgress />
              <Typography variant="body1">Loading dashboard…</Typography>
            </Box>
          ) : (
            <Container maxWidth="lg" disableGutters>
              {renderContent()}
            </Container>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

const formatDate = (value) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

export default App;
