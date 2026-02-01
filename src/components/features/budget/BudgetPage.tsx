import { useState } from 'react';
import { useBudgetEnvelopes, useCreateBudgetEnvelope } from '@/services/budget.service';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { BudgetEnvelopeCard, ReserveBudgetDialog } from '@/components/budget';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BudgetEnvelope, BudgetEnvelopeStatus, CreateBudgetEnvelopeDto } from '@/types/budget.types';
import { Wallet, Plus } from 'lucide-react';

export function BudgetPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
  const [selectedEnvelope, setSelectedEnvelope] = useState<BudgetEnvelope | null>(null);
  const { data: envelopes, isLoading, error } = useBudgetEnvelopes();
  const createMutation = useCreateBudgetEnvelope();

  const [formData, setFormData] = useState<CreateBudgetEnvelopeDto>({
    code: '',
    name: '',
    fiscalYear: new Date().getFullYear().toString(),
    period: 'Q1',
    allocatedAmount: 0,
    status: BudgetEnvelopeStatus.DRAFT,
    currency: 'TRY',
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) {
    console.error('Error loading budget envelopes:', error);
    return (
      <div className="text-red-600 p-4">
        Error loading budget envelopes: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  const envelopesArray = Array.isArray(envelopes) ? envelopes : [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      setFormData({
        code: '',
        name: '',
        fiscalYear: new Date().getFullYear().toString(),
        period: 'Q1',
        allocatedAmount: 0,
        status: BudgetEnvelopeStatus.DRAFT,
        currency: 'TRY',
      });
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
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Wallet className="h-8 w-8 text-primary-600" />
          <h1 className="text-3xl font-bold">Budget Yönetimi</h1>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Yeni Budget Envelope
        </Button>
      </div>

      {/* Create Budget Envelope Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Budget Envelope Oluştur</DialogTitle>
            <DialogDescription>
              Yeni bir budget envelope oluşturun
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Kod *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="name">İsim *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="fiscalYear">Mali Yıl *</Label>
                <Input
                  id="fiscalYear"
                  type="number"
                  value={formData.fiscalYear}
                  onChange={(e) => setFormData({ ...formData, fiscalYear: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="period">Dönem *</Label>
                <Select
                  value={formData.period}
                  onValueChange={(value) => setFormData({ ...formData, period: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Q1">Q1</SelectItem>
                    <SelectItem value="Q2">Q2</SelectItem>
                    <SelectItem value="Q3">Q3</SelectItem>
                    <SelectItem value="Q4">Q4</SelectItem>
                    <SelectItem value="YEAR">Yıl</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="currency">Para Birimi *</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">TRY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="allocatedAmount">Ayrılan Tutar *</Label>
              <Input
                id="allocatedAmount"
                type="number"
                step="0.01"
                min="0"
                value={formData.allocatedAmount}
                onChange={(e) =>
                  setFormData({ ...formData, allocatedAmount: parseFloat(e.target.value) || 0 })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="status">Durum</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value as BudgetEnvelopeStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BudgetEnvelopeStatus.DRAFT}>Taslak</SelectItem>
                  <SelectItem value={BudgetEnvelopeStatus.ACTIVE}>Aktif</SelectItem>
                  <SelectItem value={BudgetEnvelopeStatus.CLOSED}>Kapatıldı</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                İptal
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
              </Button>
            </div>
          </form>
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

      {envelopesArray.length === 0 ? (
        <EmptyState message="Henüz budget envelope oluşturulmamış" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {envelopesArray.map((envelope) => (
            <BudgetEnvelopeCard
              key={envelope.id}
              envelope={envelope}
              onClick={() => handleReserveClick(envelope)}
            />
          ))}
        </div>
      )}
    </div>
  );
}


