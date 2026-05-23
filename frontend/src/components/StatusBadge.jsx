export default function StatusBadge({ status }) {
  const styles = {
    'Shipped': 'bg-green-100 text-green-700 border-green-200',
    'Error': 'bg-red-100 text-red-700 border-red-200',
    'Pending Sync': 'bg-orange-100 text-orange-700 border-orange-200 animate-pulse',
    'default': 'bg-slate-100 text-slate-700 border-slate-200'
  };

  const activeStyle = styles[status] || styles['default'];

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${activeStyle}`}>
      {status}
    </span>
  );
}