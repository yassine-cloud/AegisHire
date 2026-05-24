import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import GapReportTester from "@/components/GapReportTester";

export const metadata = {
  title: "Test Gap Report | AegisHire",
};

export default function TestGapReportPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Gap Report Tester
        </h1>
        <p className="mt-2 text-muted-foreground">
          A developer tool to seed test data and exercise the LLM-powered gap report generation
          end-to-end. Run both steps in order.
        </p>
      </div>

      <GapReportTester />
    </div>
  );
}
