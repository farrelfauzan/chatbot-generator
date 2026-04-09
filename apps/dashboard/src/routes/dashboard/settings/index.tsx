import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCompanyInfo, useUpdateCompanyInfo } from "@/hooks/use-settings";

export const Route = createFileRoute("/dashboard/settings/")({
  component: CompanyInfoPage,
});

const fields = [
  { key: "name", label: "Company Name", type: "input" },
  { key: "phone", label: "Phone Number", type: "input" },
  { key: "email", label: "Email", type: "input" },
  { key: "address", label: "Address", type: "textarea" },
  { key: "description", label: "Description", type: "textarea" },
] as const;

function CompanyInfoPage() {
  const { data, isLoading } = useCompanyInfo();
  const updateMutation = useUpdateCompanyInfo();
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) setForm({ ...data });
  }, [data]);

  function handleChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate(form);
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      {fields.map((field) => (
        <div key={field.key} className="space-y-2">
          <Label htmlFor={field.key}>{field.label}</Label>
          {field.type === "textarea" ? (
            <Textarea
              id={field.key}
              value={form[field.key] ?? ""}
              onChange={(e) => handleChange(field.key, e.target.value)}
              rows={3}
            />
          ) : (
            <Input
              id={field.key}
              value={form[field.key] ?? ""}
              onChange={(e) => handleChange(field.key, e.target.value)}
            />
          )}
        </div>
      ))}
      <Button type="submit" disabled={updateMutation.isPending}>
        {updateMutation.isPending ? "Saving..." : "Save Changes"}
      </Button>
      {updateMutation.isSuccess && (
        <p className="text-sm text-green-600">Saved successfully!</p>
      )}
    </form>
  );
}
