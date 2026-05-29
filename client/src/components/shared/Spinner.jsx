export default function Spinner({ fullScreen = false, size = 'md' }) {
  const sz = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }[size];
  const spinner = (
    <div className={`animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600 ${sz}`} />
  );
  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 z-50">
        {spinner}
      </div>
    );
  }
  return <div className="flex justify-center py-8">{spinner}</div>;
}
