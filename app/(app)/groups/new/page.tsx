import Link from "next/link";
import { createGroup } from "@/app/actions/groups";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export default function NewGroupPage() {
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">New group</h1>
      <Card>
        <form action={createGroup} className="space-y-4">
          <div>
            <Label htmlFor="name">Group name</Label>
            <Input id="name" name="name" placeholder="Goa Trip" required />
          </div>
          <div>
            <Label htmlFor="type">Type</Label>
            <Select id="type" name="type" defaultValue="other">
              <option value="trip">Trip</option>
              <option value="home">Home</option>
              <option value="couple">Couple</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="currency">Default currency</Label>
            <Select id="currency" name="currency" defaultValue="INR">
              <option value="INR">INR — Indian Rupee</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit">Create group</Button>
            <Link href="/groups">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
