import { Card } from "@/components/ui/card";
import { NewGroupForm } from "@/components/new-group-form";

export default function NewGroupPage() {
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">New group</h1>
      <Card>
        <NewGroupForm />
      </Card>
    </div>
  );
}
