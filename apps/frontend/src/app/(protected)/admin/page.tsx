import { apiFetchServer } from "@/lib/api.server";
import AdminAccountsManager from "@/components/AdminAccountsManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Admin | AegisHire",
};

export default async function AdminPage() {
  const response = await apiFetchServer("/admin/accounts");
  const accounts = response.ok ? await response.json() : [];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Admin portal</h1>
        <p className="mt-2 text-muted-foreground">
          Create and manage developers, company accounts, and archiving in one place.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>
            Use this panel to create new accounts, edit portal permissions, and archive inactive records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminAccountsManager initialAccounts={accounts} />
        </CardContent>
      </Card>
    </div>
  );
}