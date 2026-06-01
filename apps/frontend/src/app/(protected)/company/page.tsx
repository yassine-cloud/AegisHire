import { apiFetchServer } from "@/lib/api.server";
import CompanyForm from "@/components/CompanyForm";
import CompanyJobsManager from "@/components/CompanyJobsManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Company | AegisHire",
};

export default async function CompanyPage() {
  const companyResponse = await apiFetchServer("/companies/me");

  const company = companyResponse.ok ? await companyResponse.json() : null;
  const jobsResponse = company ? await apiFetchServer("/companies/me/jobs") : null;
  const jobs = jobsResponse?.ok ? await jobsResponse.json() : [];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Company portal</h1>
        <p className="mt-2 text-muted-foreground">
          Manage the public company information shown to candidates and recruiters.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Company record</CardTitle>
            <CardDescription>Linked to your Supabase user id.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm font-medium">
            {company?.name || "Not configured yet"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Values</CardTitle>
            <CardDescription>Displayed as company culture tags.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm font-medium">
            {Array.isArray(company?.values) && company.values.length > 0 ? company.values.join(", ") : "No values set"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company information</CardTitle>
          <CardDescription>Update your company details, values, and contact information.</CardDescription>
        </CardHeader>
        <CardContent>
          <CompanyForm
            initialData={{
              name: company?.name,
              industry: company?.industry,
              size: company?.size,
              values: company?.values,
              websiteUrl: company?.websiteUrl,
              description: company?.description,
              contactEmail: company?.contactEmail,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Job board</CardTitle>
          <CardDescription>Post openings, update them, and archive positions when they close.</CardDescription>
        </CardHeader>
        <CardContent>
          {company ? (
            <CompanyJobsManager initialJobs={jobs} />
          ) : (
            <p className="text-sm text-muted-foreground">Create your company record first to start posting jobs.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}