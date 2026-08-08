import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAgreements } from '@/services/agreements.service';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { AgreementList } from '@/components/agreements';
import {
  AgreementForm,
  LTAAgreementForm,
  STAAgreementForm,
} from '@/components/agreements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMe } from '@/services/users.service';
import { isReadOnly } from '@/utils/roleUtils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CreateAgreementDto,
  AgreementType,
  AgreementFilterDto,
  AgreementStatus,
} from '@/types/agreement.types';
import {
  useCreateAgreement,
  useSubmitAgreement,
} from '@/services/agreements.service';
import { FileText, Plus, Download, ChevronDown } from 'lucide-react';
import { toNumber, toNumberOrZero } from '@/utils/numberUtils';

const formatCurrency = (amount: number, currency: string = 'TRY') => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function AgreementsPage() {
  const { data: user } = useMe();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [agreementType, setAgreementType] = useState<AgreementType | null>(
    null
  );

  // Query parametrelerinden filtreleri al
  const filters = useMemo<AgreementFilterDto>(() => {
    const typeParam = searchParams.get('type');
    return {
      agreementType:
        typeParam === 'STA' || typeParam === 'LTA'
          ? (typeParam as AgreementType)
          : undefined,
    };
  }, [searchParams]);

  const { data: agreements, isLoading, error } = useAgreements(filters);
  const createMutation = useCreateAgreement();
  const submitMutation = useSubmitAgreement();

  const agreementsArray = Array.isArray(agreements) ? agreements : [];

  // Summary hesaplamaları - Hook'lar her zaman aynı sırada çağrılmalı
  const summary = useMemo(() => {
    const totalAgreements = agreementsArray.length;
    const staCount = agreementsArray.filter(
      (a) => a.agreementType === AgreementType.STA
    ).length;
    const ltaCount = agreementsArray.filter(
      (a) => a.agreementType === AgreementType.LTA
    ).length;
    const activeCount = agreementsArray.filter(
      (a) => a.status === AgreementStatus.ACTIVE
    ).length;
    const pendingCount = agreementsArray.filter(
      (a) => a.status === AgreementStatus.PENDING
    ).length;

    // Backend'den gelen decimal değerleri number'a dönüştür
    // TypeORM decimal değerleri string olarak döndürebilir
    const totalCap = agreementsArray.reduce((sum, a) => {
      let cap = 0;
      if (a.capTotalAmount != null) {
        cap = toNumberOrZero(a.capTotalAmount);
      }
      return sum + cap;
    }, 0);

    return {
      totalAgreements,
      staCount,
      ltaCount,
      activeCount,
      pendingCount,
      totalCap,
    };
  }, [agreementsArray]);

  // Erken return'ler hook'lardan sonra olmalı
  if (isLoading) return <LoadingSpinner />;
  if (error) {
    console.error('Error loading agreements:', error);
    return (
      <div className="text-red-600 p-4">
        Error loading agreements:{' '}
        {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  const handleCreate = async (
    data: CreateAgreementDto,
    saveAsDraft: boolean = true
  ) => {
    try {
      // Create agreement
      const result = await createMutation.mutateAsync(data);

      // If saveAsDraft is false, submit for approval after creation
      if (!saveAsDraft && result?.id) {
        try {
          await submitMutation.mutateAsync(result.id);
        } catch (submitError) {
          console.error('Error submitting agreement:', submitError);
          // Don't close dialog if submit fails, so user can retry
          return;
        }
      }

      setIsCreateDialogOpen(false);
      setAgreementType(null);
      // Navigate to detail page
      if (result?.id) {
        navigate(`/agreements/${result.id}`);
      }
    } catch (error) {
      // Error is handled by the hook
      console.error('Error creating agreement:', error);
    }
  };

  const handleDownloadExcel = () => {
    // TODO: Implement Excel export
    console.log('Download Excel');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Anlaşmalar</h1>
          <p className="text-gray-500 mt-1">STA ve LTA anlaşmalarını yönetin</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadExcel}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download Excel
          </Button>
          {!isReadOnly(user?.role) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Yeni Anlaşma
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => {
                    setAgreementType(AgreementType.STA);
                    setIsCreateDialogOpen(true);
                  }}
                >
                  STA (Short-Term)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setAgreementType(AgreementType.LTA);
                    setIsCreateDialogOpen(true);
                  }}
                >
                  LTA (Long-Term)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">
              TOPLAM ANLAŞMA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-800">
              {summary.totalAgreements}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              (STA: {summary.staCount}, LTA: {summary.ltaCount})
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              AKTİF
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-800">
              {summary.activeCount}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">
              ONAY BEKLEYEN
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-800">
              {summary.pendingCount}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">
              TOPLAM CAP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-800">
              {formatCurrency(summary.totalCap)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Create Agreement Dialog */}
      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            setAgreementType(null);
          }
        }}
      >
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto p-0">
          {agreementType === AgreementType.LTA ? (
            <div className="p-6 h-full">
              <LTAAgreementForm
                onSubmit={handleCreate}
                onCancel={() => {
                  setIsCreateDialogOpen(false);
                  setAgreementType(null);
                }}
                isLoading={createMutation.isPending}
              />
            </div>
          ) : agreementType === AgreementType.STA ? (
            <div className="p-6 h-full">
              <STAAgreementForm
                onSubmit={handleCreate}
                onCancel={() => {
                  setIsCreateDialogOpen(false);
                  setAgreementType(null);
                }}
                isLoading={createMutation.isPending}
              />
            </div>
          ) : (
            <>
              <DialogHeader className="px-6 pt-6">
                <DialogTitle>Yeni Anlaşma Oluştur</DialogTitle>
                <DialogDescription>
                  Yeni bir anlaşma oluşturun
                </DialogDescription>
              </DialogHeader>
              <div className="px-6 pb-6">
                <AgreementForm
                  onSubmit={handleCreate}
                  onCancel={() => {
                    setIsCreateDialogOpen(false);
                    setAgreementType(null);
                  }}
                  isLoading={createMutation.isPending}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Agreements List */}
      <AgreementList agreements={agreementsArray} isLoading={isLoading} />
    </div>
  );
}
