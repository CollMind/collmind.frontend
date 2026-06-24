import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircle2,
  AlertTriangle,
  Wallet,
  Plus,
  Loader2,
  Info,
  Shield,
  ArrowRight,
} from 'lucide-react';
import {
  planEndpoints,
  BudgetCheckResult,
} from '@/api/endpoints/plans.endpoints';

interface BudgetApprovalModalProps {
  isOpen: boolean;
  planId: string;
  planName: string;
  planCode: string;
  onClose: () => void;
  onApprove: (data: {
    comments?: string;
    autoCreateBudget?: boolean;
    budgetAmount?: number;
  }) => void;
  isApproving: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function BudgetApprovalModal({
  isOpen,
  planId,
  planName,
  planCode,
  onClose,
  onApprove,
  isApproving,
}: BudgetApprovalModalProps) {
  const [comments, setComments] = useState('');
  const [budgetAmount, setBudgetAmount] = useState<number>(0);
  const [step, setStep] = useState<'checking' | 'budget-found' | 'no-budget'>(
    'checking'
  );

  const { data: budgetCheck, isLoading } = useQuery({
    queryKey: ['budget-check', planId],
    queryFn: () => planEndpoints.checkBudget(planId).then((res) => res.data),
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen) {
      setComments('');
      setBudgetAmount(0);
      setStep('checking');
    }
  }, [isOpen]);

  useEffect(() => {
    if (budgetCheck) {
      if (budgetCheck.hasBudget) {
        setStep('budget-found');
      } else {
        setStep('no-budget');
        // Default budget amount: plan's total spend * 2
        setBudgetAmount(Math.max(budgetCheck.planTotalSpend * 2, 100000));
      }
    }
  }, [budgetCheck]);

  const handleApproveWithExistingBudget = () => {
    onApprove({ comments: comments || undefined });
  };

  const handleApproveWithAutoCreate = () => {
    onApprove({
      comments: comments || undefined,
      autoCreateBudget: true,
      budgetAmount: budgetAmount,
    });
  };

  const renderChecking = () => (
    <div className="flex flex-col items-center justify-center py-8">
      <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
      <p className="text-sm text-gray-600">Bütçe durumu kontrol ediliyor...</p>
    </div>
  );

  const renderBudgetFound = (budget: BudgetCheckResult) => (
    <div className="space-y-4">
      {/* Budget Info Card */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-green-800 mb-1">
                Bütçe Mevcut
              </h4>
              <p className="text-xs text-green-700">
                Bu plan için uygun bütçe zarfı bulundu.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Details */}
      <div className="border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">
            Bütçe Detayları
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500 block text-xs">Bütçe Zarfı</span>
            <span className="font-medium">{budget.envelope?.name}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs">Kod</span>
            <span className="font-medium">{budget.envelope?.code}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs">Toplam Bütçe</span>
            <span className="font-medium">
              {formatCurrency(budget.envelope?.allocatedAmount || 0)}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs">Kullanılabilir</span>
            <span
              className={`font-medium ${budget.sufficient ? 'text-green-600' : 'text-red-600'}`}
            >
              {formatCurrency(budget.envelope?.availableAmount || 0)}
            </span>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Plan Toplam Harcama</span>
            <span className="font-bold text-gray-900">
              {formatCurrency(budget.planTotalSpend)}
            </span>
          </div>
        </div>

        {!budget.sufficient && (
          <div className="bg-red-50 border border-red-200 rounded p-2 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <span className="text-xs text-red-700">
              Kullanılabilir bütçe (
              {formatCurrency(budget.envelope?.availableAmount || 0)}) plan
              harcamasından ({formatCurrency(budget.planTotalSpend)}) düşük.
              Yine de onaylayabilirsiniz.
            </span>
          </div>
        )}

        {budget.sufficient && (
          <div className="flex items-center gap-2 text-xs text-green-600">
            <Shield className="h-3 w-3" />
            <span>
              Bütçe yeterli. Onay sonrası{' '}
              {formatCurrency(budget.planTotalSpend)} commit edilecektir.
            </span>
          </div>
        )}
      </div>

      {/* Comments */}
      <div>
        <Label htmlFor="approval-comments" className="text-sm">
          Onay Notu (opsiyonel)
        </Label>
        <Textarea
          id="approval-comments"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Onay notunuzu yazın..."
          className="mt-1.5 min-h-[60px]"
        />
      </div>
    </div>
  );

  const renderNoBudget = (budget: BudgetCheckResult) => (
    <div className="space-y-4">
      {/* Warning Card */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-800 mb-1">
                Bütçe Bulunamadı
              </h4>
              <p className="text-xs text-amber-700">
                <strong>{budget.channelName}</strong> kanalı ve{' '}
                <strong>{budget.period}</strong> dönemi için aktif bütçe zarfı
                tanımlı değil.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-create option */}
      <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-800">
            Otomatik Bütçe Oluştur
          </span>
        </div>
        <p className="text-xs text-blue-700">
          Aşağıdaki bilgilerle otomatik bütçe zarfı oluşturulacak ve plan
          onaylanacaktır.
        </p>

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-blue-600 block text-xs">Kanal</span>
              <span className="font-medium text-gray-900">
                {budget.channelName}
              </span>
            </div>
            <div>
              <span className="text-blue-600 block text-xs">Dönem</span>
              <span className="font-medium text-gray-900">{budget.period}</span>
            </div>
          </div>

          <div>
            <span className="text-blue-600 block text-xs mb-1">
              Plan Toplam Harcama
            </span>
            <span className="font-bold text-gray-900">
              {formatCurrency(budget.planTotalSpend)}
            </span>
          </div>

          <div>
            <Label htmlFor="budget-amount" className="text-xs text-blue-600">
              Bütçe Miktarı (TRY)
            </Label>
            <Input
              id="budget-amount"
              type="number"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(Number(e.target.value))}
              className="mt-1"
              min={budget.planTotalSpend}
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum: {formatCurrency(budget.planTotalSpend)} (plan harcaması)
            </p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 text-xs text-gray-500">
        <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
        <span>
          Bütçe zarfı{' '}
          <strong>
            {budget.channel}/{budget.period}
          </strong>{' '}
          kodu ile oluşturulacak ve otomatik olarak aktif duruma getirilecektir.
        </span>
      </div>

      {/* Comments */}
      <div>
        <Label htmlFor="approval-comments-create" className="text-sm">
          Onay Notu (opsiyonel)
        </Label>
        <Textarea
          id="approval-comments-create"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Onay notunuzu yazın..."
          className="mt-1.5 min-h-[60px]"
        />
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Plan Onayı
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            <span className="font-medium">{planCode}</span> — {planName}
          </DialogDescription>
        </DialogHeader>

        {(isLoading || step === 'checking') && renderChecking()}

        {step === 'budget-found' &&
          budgetCheck &&
          renderBudgetFound(budgetCheck)}

        {step === 'no-budget' && budgetCheck && renderNoBudget(budgetCheck)}

        {step !== 'checking' && !isLoading && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={onClose} disabled={isApproving}>
              İptal
            </Button>

            {step === 'budget-found' && (
              <Button
                onClick={handleApproveWithExistingBudget}
                disabled={isApproving}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Onaylanıyor...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Onayla
                  </>
                )}
              </Button>
            )}

            {step === 'no-budget' && (
              <Button
                onClick={handleApproveWithAutoCreate}
                disabled={
                  isApproving ||
                  budgetAmount < (budgetCheck?.planTotalSpend || 0)
                }
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Bütçe Oluştur ve Onayla
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
