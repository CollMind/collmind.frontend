import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useBudgetEnvelopes,
  useCreateBudgetEnvelope,
} from '@/services/budget.service';
import { useMe } from '@/services/users.service';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  BudgetDashboard,
  BudgetEnvelopeList,
  ReserveBudgetDialog,
  BudgetEnvelopeForm,
} from '@/components/budget';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BudgetEnvelope, CreateBudgetEnvelopeDto } from '@/types/budget.types';
import { Wallet, Plus } from 'lucide-react';

type BudgetView = 'dashboard' | 'list';

export function BudgetPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view');
  const [view, setView] = useState<BudgetView>(
    viewParam === 'list' ? 'list' : 'dashboard'
  );

  useEffect(() => {
    if (viewParam === 'list') {
      setView('list');
    } else {
      setView('dashboard');
    }
  }, [viewParam]);

  const handleViewChange = (newView: BudgetView) => {
    setView(newView);
    if (newView === 'list') {
      setSearchParams({ view: 'list' });
    } else {
      setSearchParams({});
    }
  };
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
  const [selectedEnvelope, setSelectedEnvelope] =
    useState<BudgetEnvelope | null>(null);
  const { data: envelopes, isLoading, error } = useBudgetEnvelopes();
  const createMutation = useCreateBudgetEnvelope();
  const { data: user } = useMe();
  const isPlanner = user?.role === 'PLANNER';

  if (isLoading) return <LoadingSpinner />;
  if (error) {
    console.error('Error loading budget envelopes:', error);
    return (
      <div className="text-red-600 p-4">
        Error loading budget envelopes:{' '}
        {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  const envelopesArray = Array.isArray(envelopes) ? envelopes : [];

  const handleCreate = async (data: CreateBudgetEnvelopeDto) => {
    try {
      await createMutation.mutateAsync(data);
      setIsCreateDialogOpen(false);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleReserveClick = (envelope: BudgetEnvelope) => {
    setSelectedEnvelope(envelope);
    setReserveDialogOpen(true);
  };

  const handleReserveClose = () => {
    setReserveDialogOpen(false);
    setSelectedEnvelope(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Wallet className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold">Bütçe Yönetimi</h1>
            <p className="text-gray-500 mt-1">
              On-Invoice ve Off-Invoice bütçe takibi ve analizi
            </p>
          </div>
        </div>
        {!isPlanner && (
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Yeni Envelope
          </Button>
        )}
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <Button
          variant={view === 'dashboard' ? 'default' : 'ghost'}
          onClick={() => handleViewChange('dashboard')}
          className="rounded-b-none"
        >
          Dashboard
        </Button>
        <Button
          variant={view === 'list' ? 'default' : 'ghost'}
          onClick={() => handleViewChange('list')}
          className="rounded-b-none"
        >
          Envelope Listesi
        </Button>
      </div>

      {/* Create Budget Envelope Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Bütçe Envelope</DialogTitle>
            <DialogDescription>
              Yeni bir budget envelope oluşturun
            </DialogDescription>
          </DialogHeader>
          <BudgetEnvelopeForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Reserve Budget Dialog */}
      {selectedEnvelope && (
        <ReserveBudgetDialog
          envelope={selectedEnvelope}
          isOpen={reserveDialogOpen}
          onClose={handleReserveClose}
        />
      )}

      {/* Content */}
      {view === 'dashboard' ? (
        <BudgetDashboard onCreateEnvelope={() => setIsCreateDialogOpen(true)} />
      ) : (
        <BudgetEnvelopeList
          envelopes={envelopesArray}
          isLoading={isLoading}
          onReserveClick={handleReserveClick}
        />
      )}
    </div>
  );
}
