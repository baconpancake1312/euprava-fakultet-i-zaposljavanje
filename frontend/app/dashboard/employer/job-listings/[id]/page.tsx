import { notFound } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EmployerJobListingDetailPage({ params }: { params: { id: string } }) {
  // Fetch job listing by ID
  let job: any = null;
  try {
    job = await apiClient.getJobListing(params.id);
  } catch (e) {
    return notFound();
  }
  if (!job) return notFound();

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>{job.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p><b>Description:</b> {job.description}</p>
          <p><b>Location:</b> {job.location}</p>
          <p><b>Salary:</b> {job.salary}</p>
          <p><b>Posted by:</b> {job.employerName}</p>
        </CardContent>
      </Card>
    </div>
  );
}
