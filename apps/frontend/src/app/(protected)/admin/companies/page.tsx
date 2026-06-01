import { apiFetchServer } from "@/lib/api.server";
import AdminCompanyManager from "@/components/AdminCompanyManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Admin Companies | AegisHire",
};

export default async function AdminCompaniesPage() {
  const response = await apiFetchServer("/companies/admin");
  const companies = response.ok ? await response.json() : [];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Admin company portal</h1>
        <p className="mt-2 text-muted-foreground">
          Provision company accounts and review the organizations registered in the platform.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provisioning</CardTitle>
          <CardDescription>Admin-only workflow for creating company login credentials.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminCompanyManager initialCompanies={companies} />
        </CardContent>
      </Card>
    </div>
  );
}