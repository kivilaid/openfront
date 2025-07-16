'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  SearchX,
  CirclePlus,
  Triangle,
  Square,
  Circle,
  Search
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { PageContainer } from '../../../dashboard/components/PageContainer';
import { PlatformFilterBar } from '../../components/PlatformFilterBar';
import { StatusTabs } from '../../components/StatusTabs';
import { InventoryDetailsComponent } from '../components/InventoryDetailsComponent';
import { Pagination } from '../../../dashboard/components/Pagination';
import { FilterList } from '../../../dashboard/components/FilterList';
import { CreateItemDrawerClientWrapper } from '@/features/platform/components/CreateItemDrawerClientWrapper';
import { useDashboard } from '../../../dashboard/context/DashboardProvider';

interface InventoryListPageClientProps {
  list: any;
  initialData: { items: any[], count: number };
  initialError: string | null;
  initialSearchParams: {
    page: number;
    pageSize: number;
    search: string;
  };
  statusCounts: {
    all: number;
    in_stock: number;
    low_stock: number;
    out_of_stock: number;
    backordered: number;
  } | null;
}

const statusConfig = {
  in_stock: { label: "In Stock", color: "emerald" },
  low_stock: { label: "Low Stock", color: "yellow" },
  out_of_stock: { label: "Out of Stock", color: "red" },
  backordered: { label: "Backordered", color: "purple" }
};

function EmptyStateDefault() {
  return (
    <EmptyState
      title="No Inventory Created"
      description="You can create a new inventory item to get started."
      icons={[Triangle, Square, Circle]}
    />
  );
}

function EmptyStateSearch({ onResetFilters }: { onResetFilters: () => void }) {
  return (
    <EmptyState
      title="No Results Found"
      description="Try adjusting your search filters."
      icons={[Search]}
      action={{
        label: "Reset Filters",
        onClick: onResetFilters
      }}
    />
  );
}

export function InventoryListPageClient({ 
  list, 
  initialData, 
  initialError, 
  initialSearchParams,
  statusCounts
}: InventoryListPageClientProps) {
  const router = useRouter();
  const { basePath } = useDashboard();
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  // Extract data from props
  const data = initialData;
  const error = initialError;
  const currentPage = initialSearchParams.page;
  const pageSize = initialSearchParams.pageSize;
  const searchString = initialSearchParams.search;

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    const params = new URLSearchParams(window.location.search);
    
    if (newPage && newPage > 1) {
      params.set('page', newPage.toString());
    } else {
      params.delete('page');
    }
    
    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.push(newUrl);
  }, [router]);

  // Handle reset filters
  const handleResetFilters = useCallback(() => {
    router.push(window.location.pathname);
  }, [router]);

  if (!list) {
    return (
      <PageContainer title="List not found">
        <Alert variant="destructive">
          <AlertDescription>
            The requested list was not found.
          </AlertDescription>
        </Alert>
      </PageContainer>
    );
  }

  const breadcrumbs = [
    { type: 'link' as const, label: 'Dashboard', href: basePath },
    { type: 'page' as const, label: 'Platform' },
    { type: 'page' as const, label: 'Inventory' }
  ];

  const header = (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
        Inventory
      </h1>
      <p className="text-muted-foreground">
        Manage inventory levels and stock tracking
      </p>
    </div>
  );

  // Check if we have any active filters
  const hasFilters = !!searchString;
  const isFiltered = hasFilters;
  const isEmpty = data?.count === 0 && !isFiltered;

  return (
    <PageContainer title="Inventory" header={header} breadcrumbs={breadcrumbs}>
      {/* Filter Bar with custom create button */}
      <div className="px-4 md:px-6">
        <PlatformFilterBar 
          list={list}
          customCreateButton={
            <Button 
              onClick={() => setIsCreateDrawerOpen(true)}
              size="icon"
              className="lg:px-4 lg:py-2 lg:w-auto rounded-lg"
            >
              <CirclePlus />
              <span className="hidden lg:inline">Create {list.singular}</span>
            </Button>
          }
        />
      </div>

      {/* Status Tabs */}
      {statusCounts && (
        <div className="border-b">
          <StatusTabs 
            statusCounts={statusCounts}
            statusConfig={statusConfig}
            entityName="Items"
          />
        </div>
      )}

      {/* Active Filters */}
      <div className="px-4 md:px-6 border-b">
        <FilterList list={list} />
      </div>

      {/* Inventory list */}
      {error ? (
        <div className="px-4 md:px-6">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load inventory: {error}
            </AlertDescription>
          </Alert>
        </div>
      ) : isEmpty ? (
        <div className="px-4 md:px-6">
          <EmptyStateDefault />
        </div>
      ) : data?.count === 0 ? (
        <div className="px-4 md:px-6">
          <EmptyStateSearch onResetFilters={handleResetFilters} />
        </div>
      ) : (
        <>
          {/* Data grid */}
          <div className="grid grid-cols-1 divide-y">
            {data?.items?.map((item: any) => (
              <InventoryDetailsComponent key={item.id} inventory={item} list={list} />
            ))}
          </div>
          
          {/* Pagination */}
          {data && data.count > pageSize && (
            <div className="px-4 md:px-6 py-4">
              <Pagination
                currentPage={currentPage}
                total={data.count}
                pageSize={pageSize}
                list={{ singular: 'item', plural: 'items' }}
              />
            </div>
          )}
        </>
      )}

      {/* Create Item Drawer */}
      <CreateItemDrawerClientWrapper
        listKey="inventory"
        open={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        onCreate={() => {
          window.location.reload();
        }}
      />
    </PageContainer>
  );
}