export default function Loading() {
  return (
    <div className="animate-fade space-y-8">
      <div className="space-y-3">
        <div className="skeleton h-9 w-36" />
        <div className="skeleton h-4 w-72 max-w-full" />
      </div>
      <div className="skeleton h-72 w-full rounded-[1.5rem]" />
    </div>
  );
}
