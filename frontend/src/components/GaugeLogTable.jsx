import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
} from "@mui/material";
import ImageIcon from "@mui/icons-material/Image";

const GaugeLogTable = ({ gaugeSnapshots = [], disabled }) => {
  const [selectedImage, setSelectedImage] = useState(null);

  if (disabled) {
    return (
      <Card>
        <CardHeader title="Gauge log" subheader="Configure a tank to view readings." />
        <CardContent>
          <Typography color="text.secondary">
            Once your tank is configured, new gauge snapshots will appear here as a detailed log.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (gaugeSnapshots.length === 0) {
    return (
      <Card>
        <CardHeader title="Gauge log" subheader="Table of manual or auto-detected readings." />
        <CardContent>
          <Typography color="text.secondary">
            No snapshots yet. Capture a reading from the Home tab to populate this view.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Gauge log"
        subheader="Every reading captured from manual selections or uploaded images."
      />
      <CardContent>
        <TableContainer component={Box} sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Level</TableCell>
                <TableCell>Percent</TableCell>
                <TableCell>Gallons</TableCell>
                <TableCell>Recorded</TableCell>
                <TableCell>Source</TableCell>
                <TableCell align="right">Confidence</TableCell>
                <TableCell align="center">Snapshot</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {gaugeSnapshots.map((snapshot) => (
                <TableRow key={snapshot.id}>
                  <TableCell>{formatGaugeLabel(snapshot.level)}</TableCell>
                  <TableCell>{Math.round((snapshot.ratio ?? 0) * 100)}%</TableCell>
                  <TableCell>{snapshot.estimatedGallons ?? "—"}</TableCell>
                  <TableCell>{formatDate(snapshot.recordedAt)}</TableCell>
                  <TableCell>{formatSource(snapshot.source)}</TableCell>
                  <TableCell align="right">
                    {typeof snapshot.confidence === "number"
                      ? `${Math.round(snapshot.confidence * 100)}%`
                      : "—"}
                  </TableCell>
                  <TableCell align="center">
                    {snapshot.imageData ? (
                      <IconButton
                        size="small"
                        aria-label="View snapshot"
                        onClick={() => setSelectedImage(snapshot.imageData)}
                      >
                        <ImageIcon fontSize="inherit" />
                      </IconButton>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
      <Dialog
        open={Boolean(selectedImage)}
        onClose={() => setSelectedImage(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent>
          {selectedImage && (
            <Box
              component="img"
              src={selectedImage}
              alt="Gauge snapshot"
              sx={{ width: "100%", borderRadius: 2 }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

const formatGaugeLabel = (level) =>
  level
    ?.toLowerCase()
    .replace(/_/g, " ")
    .replace(/(^\w|\s\w)/g, (match) => match.toUpperCase()) ?? "Unknown";

const formatDate = (value) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const formatSource = (source) =>
  source === "vision"
    ? "Auto-detected"
    : source === "manual"
    ? "Manual entry"
    : "Unknown";

export default GaugeLogTable;
