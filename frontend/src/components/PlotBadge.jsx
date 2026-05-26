export default function PlotBadge({ status }) {
  if (status === 'sold') {
    return <span className="badge-sold">Sold</span>;
  }
  return <span className="badge-available">Available</span>;
}
