// app/routes/backlog.tsx
import { BacklogView } from "@/components/backlog";

export default function BacklogPage() {
  return (
    <div className="h-full overflow-auto">
      <BacklogView />
    </div>
  );
}