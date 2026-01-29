import PopulationDashboard from "@/components/PopulationDashboard";

export default function PopulationPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Population Coverage</h1>
        <p className="text-muted-foreground">
          Track total population covered by Maharashtra water infrastructure with daily change calculations
        </p>
      </div>
      <PopulationDashboard />
    </div>
  );
}