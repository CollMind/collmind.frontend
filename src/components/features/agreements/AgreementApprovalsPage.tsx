import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agreementEndpoints } from '@/api/endpoints/agreements.endpoints';
import { Agreement } from '@/types/agreement.types';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  AlertTriangle,
  Search,
  Eye,
  X,
  Check,
  Store,
  Calendar,
  User
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { userEndpoints } from '@/api/endpoints/users.endpoints';
import { useNavigate } from 'react-router-dom';
import { toNumber } from '@/utils/numberUtils';
import { useMe } from '@/services/users.service';
import { UserRole } from '@/types/user.types';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercentage = (value: number, decimals: number = 1) => {
  return `${value.toFixed(decimals)}%`;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
};

export function AgreementApprovalsPage() {
  const { data: user } = useMe();
  const toast = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  const [approveAgreement, setApproveAgreement] = useState<Agreement | null>(null);
  const [rejectAgreement, setRejectAgreement] = useState<Agreement | null>(null);
  const [approveComments, setApproveComments] = useState('');

  const { data: agreements, isLoading } = useQuery({
    queryKey: ['pending-approval-agreements'],
    queryFn: () => agreementEndpoints.getPendingApprovals().then(res => res.data),
  });

  const approveMutation = useMutation({
    mutationFn: ({ agreementId, comments }: {
      agreementId: string;
      comments?: string;
    }) => agreementEndpoints.approve(agreementId, { comments }),
    onSuccess: () => {
      toast.success('Anlaşma başarıyla onaylandı');
      queryClient.invalidateQueries({ queryKey: ['pending-approval-agreements'] });
      setSelectedAgreement(null);
      setApproveAgreement(null);
      setApproveComments('');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Anlaşma onaylanırken hata oluştu');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ agreementId, reason }: { agreementId: string; reason: string }) =>
      agreementEndpoints.reject(agreementId, { reason }),
    onSuccess: () => {
      toast.success('Anlaşma reddedildi');
      queryClient.invalidateQueries({ queryKey: ['pending-approval-agreements'] });
      setSelectedAgreement(null);
      setRejectAgreement(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Anlaşma reddedilirken hata oluştu');
    },
  });

  // Filter agreements by search query
  const filteredAgreements = (agreements || []).filter(agreement => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const agreementCode = agreement.agreementCode || agreement.agreementNumber || '';
    const agreementName = agreement.agreementName || '';
    return (
      agreementCode.toLowerCase().includes(query) ||
      agreementName.toLowerCase().includes(query)
    );
  });

  // Calculate summary statistics
  const pendingCount = agreements?.length || 0;
  const approvedTodayCount = 0; // TODO: Calculate from approved agreements
  
  // Backend'den gelen decimal değerleri number'a dönüştür
  const avgSpend = agreements && agreements.length > 0
    ? agreements.reduce((sum, a) => {
        let cap = 0;
        if (a.capTotalAmount != null) {
          cap = toNumber(a.capTotalAmount);
        }
        return sum + cap;
      }, 0) / agreements.length
    : 0;
  
  const highSpendCount = agreements?.filter(a => {
    let cap = 0;
    if (a.capTotalAmount != null) {
      const capValue = typeof a.capTotalAmount === 'string' 
        ? parseFloat(a.capTotalAmount.replace(/,/g, '')) 
        : Number(a.capTotalAmount);
      cap = isNaN(capValue) ? 0 : capValue;
    }
    return cap > 100000;
  }).length || 0;

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="text-sm text-gray-600">
        Anlaşmalar &gt; Anlaşma Onayları
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Anlaşma Onayları</h1>
        <p className="text-gray-600">
          Onay bekleyen anlaşmaları inceleyin ve onaylayın.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 uppercase mb-1">BEKLEYEN</div>
                <div className="text-2xl font-bold text-gray-900">{pendingCount}</div>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 uppercase mb-1">BUGÜN ONAYLANAN</div>
                <div className="text-2xl font-bold text-gray-900">{approvedTodayCount}</div>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-xs text-gray-500 uppercase">ORT. TUTAR</div>
                  <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                    ORT.
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(avgSpend)}</div>
                <div className="text-xs text-gray-500">(BEKLEYEN)</div>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 uppercase mb-1">YÜKSEK TUTAR</div>
                <div className="text-xs text-gray-500 mb-1">(&gt; 100K)</div>
                <div className="text-2xl font-bold text-gray-900">{highSpendCount}</div>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Anlaşma kodu veya adı ile ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Agreement List */}
      <div className="space-y-4">
        {filteredAgreements.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              {searchQuery ? 'Arama sonucu bulunamadı' : 'Onay bekleyen anlaşma bulunmamaktadır'}
            </CardContent>
          </Card>
        ) : (
          filteredAgreements.map((agreement) => (
            <AgreementApprovalCard
              key={agreement.id}
              agreement={agreement}
              userRole={user?.role}
              onReview={() => {
                setSelectedAgreement(agreement);
                navigate(`/agreements/${agreement.id}`);
              }}
              onApprove={() => setApproveAgreement(agreement)}
              onReject={() => setRejectAgreement(agreement)}
              isApproving={approveMutation.isPending}
              isRejecting={rejectMutation.isPending}
            />
          ))
        )}
      </div>

      {/* Approve Confirmation Modal */}
      {approveAgreement && (
        <ConfirmDialog
          isOpen={!!approveAgreement}
          onClose={() => {
            setApproveAgreement(null);
          }}
          onConfirm={(comments) => {
            approveMutation.mutate({
              agreementId: approveAgreement.id,
              comments: comments || undefined,
            });
          }}
          title="Anlaşmayı Onayla"
          description={`${approveAgreement.agreementCode || approveAgreement.agreementNumber} - ${approveAgreement.agreementName || 'Anlaşma'} onaylamak istediğinize emin misiniz?`}
          confirmText="Onayla"
          cancelText="İptal"
          variant="default"
          isLoading={approveMutation.isPending}
          showNote
          noteLabel="Onay Yorumu (opsiyonel)"
          notePlaceholder="Onay yorumunuzu yazın..."
          icon={<Check className="h-5 w-5 text-green-600" />}
        />
      )}

      {/* Reject Confirmation Modal */}
      {rejectAgreement && (
        <ConfirmDialog
          isOpen={!!rejectAgreement}
          onClose={() => setRejectAgreement(null)}
          onConfirm={(note) => {
            if (!note?.trim()) {
              toast.error('Red gerekçesi zorunludur');
              return;
            }
            rejectMutation.mutate({ agreementId: rejectAgreement.id, reason: note! });
          }}
          title="Anlaşmayı Reddet"
          description={`${rejectAgreement.agreementCode || rejectAgreement.agreementNumber} - ${rejectAgreement.agreementName || 'Anlaşma'} reddetmek istediğinize emin misiniz?`}
          confirmText="Reddet"
          cancelText="İptal"
          variant="destructive"
          isLoading={rejectMutation.isPending}
          showNote
          noteLabel="Red Gerekçesi (zorunlu)"
          notePlaceholder="Red gerekçenizi yazın..."
          icon={<X className="h-5 w-5 text-red-600" />}
        />
      )}
    </div>
  );
}

interface AgreementApprovalCardProps {
  agreement: Agreement;
  userRole?: string;
  onReview: () => void;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}

function AgreementApprovalCard({
  agreement,
  userRole,
  onReview,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: AgreementApprovalCardProps) {
  const createdBy = (agreement as any).createdBy;
  const { data: creatorUser } = useQuery({
    queryKey: ['user', createdBy],
    queryFn: () => userEndpoints.getById(createdBy!).then(res => res.data),
    enabled: !!createdBy,
  });

  const agreementCode = agreement.agreementCode || agreement.agreementNumber || 'N/A';
  // Backend'den gelen decimal değeri number'a dönüştür
  let totalSpend = 0;
  if (agreement.capTotalAmount != null) {
    totalSpend = toNumber(agreement.capTotalAmount);
  }
  const isHighSpend = totalSpend > 100000;
  const agreementType = agreement.agreementType || 'N/A';

  return (
    <Card className="border-gray-200">
      <CardContent className="p-6">
        {/* Agreement Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-semibold text-gray-900">{agreementCode}</span>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">YENİ</Badge>
              <Badge variant="outline" className="text-xs">
                {agreementType}
              </Badge>
            </div>
            <h3 className="text-xl font-bold text-gray-900">{agreement.agreementName || 'Anlaşma'}</h3>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            <span>{creatorUser?.fullName || createdBy || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(agreement.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Store className="h-4 w-4" />
            <span>
              {agreement.channelName || 'N/A'} • {agreement.cplName || 'N/A'}
            </span>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">TOPLAM TUTAR</div>
            <div className="text-sm font-semibold text-gray-900">{formatCurrency(totalSpend)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">BAŞLANGIÇ</div>
            <div className="text-sm font-semibold text-gray-900">{formatDate(agreement.startDate)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">BİTİŞ</div>
            <div className="text-sm font-semibold text-gray-900">{formatDate(agreement.endDate)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">SPEND TİPİ</div>
            <div className="text-sm font-semibold text-gray-900">{agreement.spendType || 'N/A'}</div>
          </div>
        </div>

        {/* Warning Banner */}
        {isHighSpend && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              Yüksek tutarlı anlaşma ({formatCurrency(totalSpend)}). Dikkatli inceleme önerilir.
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onReview}
            className="flex-1"
          >
            <Eye className="mr-2 h-4 w-4" />
            Detay İncele
          </Button>
          {userRole === UserRole.MANAGER && (
            <>
              <Button
                variant="destructive"
                onClick={onReject}
                disabled={isRejecting || isApproving}
                className="flex-1"
              >
                <X className="mr-2 h-4 w-4" />
                Reddet
              </Button>
              <Button
                onClick={onApprove}
                disabled={isApproving || isRejecting}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Check className="mr-2 h-4 w-4" />
                Onayla
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
