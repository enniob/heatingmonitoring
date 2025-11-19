import {
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

const FillLogTable = ({ fillEvents = [], disabled }) => {
  if (disabled) {
    return (
      <Card>
        <CardHeader title="Fill log" subheader="Configure a tank to track deliveries." />
        <CardContent>
          <Typography color="text.secondary">
            Once your tank data is set up, deliveries recorded on the Fill page will appear
            here as a detailed log.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (fillEvents.length === 0) {
    return (
      <Card>
        <CardHeader title="Fill log" subheader="Deliveries, prices, and totals." />
        <CardContent>
          <Typography color="text.secondary">
            No deliveries logged yet. Add a fill to view pricing and cost history.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Fill log" subheader="Each recorded delivery and associated costs." />
      <CardContent>
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Gallons</TableCell>
                <TableCell>Price/gal</TableCell>
                <TableCell>Total cost</TableCell>
                <TableCell>Recorded</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fillEvents.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.gallonsAdded}</TableCell>
                  <TableCell>
                    {typeof entry.pricePerGallon === "number"
                      ? `$${entry.pricePerGallon.toFixed(2)}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {typeof entry.totalCost === "number"
                      ? `$${entry.totalCost.toFixed(2)}`
                      : "—"}
                  </TableCell>
                  <TableCell>{formatDate(entry.recordedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

const formatDate = (value) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

export default FillLogTable;
