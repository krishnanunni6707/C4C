// Phase 2 — job action buttons (verify payment, start printing, etc.)
// Stubbed for Phase 1 to avoid referencing unbuilt API routes.

interface JobActionsProps {
  jobId: string;
  status: string;
  paymentStatus: string;
}

export default function JobActions(_props: JobActionsProps) {
  return (
    <p className="text-sm text-gray-400">Actions available in Phase 2.</p>
  );
}
