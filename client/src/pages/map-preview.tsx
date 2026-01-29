import React, { useEffect } from 'react';
import { EnhancedGeoFilterMap } from '@/components/maps';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGeoFilter } from '@/contexts/GeoFilterContext';
import Header from '@/components/dashboard/header';
import Sidebar from '@/components/dashboard/sidebar';

export default function MapPreviewPage() {
  const { 
    filter, 
    setRegion, 
    setDivision, 
    setSubDivision, 
    setCircle, 
    setBlock, 
    setVillage,
    clearFilters,
    currentFilterLevel
  } = useGeoFilter();

  // Log filter changes for debugging
  useEffect(() => {
    console.log('Current geographic filters:', filter);
    console.log('Current filter level:', currentFilterLevel);
  }, [filter, currentFilterLevel]);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Geographic Filter Map Preview</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Interactive Maharashtra Map</CardTitle>
                    <CardDescription>
                      Zoom or click on regions to filter data. The map automatically detects the appropriate geographic level based on zoom.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="min-h-[500px]">
                    <EnhancedGeoFilterMap 
                      containerClassName="h-[500px] w-full rounded-lg overflow-hidden shadow-md"
                      onRegionChange={setRegion}
                      onDivisionChange={setDivision}
                      onSubDivisionChange={setSubDivision}
                      onCircleChange={setCircle}
                      onBlockChange={setBlock}
                      onVillageChange={setVillage}
                      selectedRegion={filter.region}
                      mapTitle="Maharashtra Water Infrastructure Filter Map"
                    />
                  </CardContent>
                  <CardFooter>
                    <p className="text-sm text-muted-foreground">
                      Zoom levels: Region (≤7), Division (8), Sub-Division (9), Circle (10), Block (11), Village (≥12)
                    </p>
                  </CardFooter>
                </Card>
              </div>
              
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Current Geographic Filters</CardTitle>
                    <CardDescription>
                      This panel shows the active geographic filters based on map interaction.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div className="font-medium">Region:</div>
                      <div className={filter.region !== 'all' ? 'font-bold text-blue-600' : ''}>
                        {filter.region !== 'all' ? filter.region : 'All Regions'}
                      </div>
                      
                      <div className="font-medium">Division:</div>
                      <div className={filter.division !== 'all' ? 'font-bold text-blue-600' : ''}>
                        {filter.division !== 'all' ? filter.division : 'All Divisions'}
                      </div>
                      
                      <div className="font-medium">Sub-Division:</div>
                      <div className={filter.subDivision !== 'all' ? 'font-bold text-blue-600' : ''}>
                        {filter.subDivision !== 'all' ? filter.subDivision : 'All Sub-Divisions'}
                      </div>
                      
                      <div className="font-medium">Circle:</div>
                      <div className={filter.circle !== 'all' ? 'font-bold text-blue-600' : ''}>
                        {filter.circle !== 'all' ? filter.circle : 'All Circles'}
                      </div>
                      
                      <div className="font-medium">Block:</div>
                      <div className={filter.block !== 'all' ? 'font-bold text-blue-600' : ''}>
                        {filter.block !== 'all' ? filter.block : 'All Blocks'}
                      </div>
                      
                      <div className="font-medium">Village:</div>
                      <div className={filter.village !== 'all' ? 'font-bold text-blue-600' : ''}>
                        {filter.village !== 'all' ? filter.village : 'All Villages'}
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <p className="text-sm mb-2">Current Filter Level: <span className="font-semibold">{currentFilterLevel.charAt(0).toUpperCase() + currentFilterLevel.slice(1)}</span></p>
                      <Button 
                        variant="outline" 
                        onClick={clearFilters}
                        className="w-full"
                      >
                        Clear All Filters
                      </Button>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <p className="text-xs text-muted-foreground">
                      Use this panel to see which geographic filters are currently applied. Active filters are shown in blue.
                    </p>
                  </CardFooter>
                </Card>
                
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>How to Use</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc pl-5 space-y-2 text-sm">
                      <li>Click directly on a region to select it</li>
                      <li>Zoom in to see more detailed geographic levels</li>
                      <li>The map will automatically adjust filters based on your zoom level</li>
                      <li>More detailed locations will appear as you zoom in</li>
                      <li>Use the clear button to reset all geographic filters</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}