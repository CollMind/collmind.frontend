import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { offInvoiceEndpoints } from '@/api/endpoints/off-invoice.endpoints';
import {
  onInvoiceEndpoints,
  OnInvoiceEntry,
} from '@/api/endpoints/on-invoice.endpoints';
import {
  AgreementTransaction,
  TransactionSummary,
} from '@/types/off-invoice.types';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/useToast';
import { useMe } from '@/services/users.service';
import { hasRole } from '@/utils/roleUtils';
import { UserRole } from '@/types/user.types';
import { OffInvoiceManualEntryModal } from './OffInvoiceManualEntryModal';

type Tab = 'off' | 'on' | 'all';

export function OffInvoiceTransactionsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  // T-277 / Z35: bu buton `POST /agreement-transactions`'ı çağırır
  // (agreement-transaction.controller.ts, `@Roles(ADMIN, FINANCE)`
  // — Z35 ile `/off-invoice/upload` ile EŞİTLENDİ, PLANNER düştü). Sayfanın
  // kendisi PLANNER/READONLY'ye açık (listeleme meşru); kapanan yalnız
  // bu YAZMA eylemi. `hasRole` ADMIN'i örtük olarak geçirir (roleUtils.ts).
  const { data: user } = useMe();
  const canManualEntry = hasRole(user?.role, [UserRole.FINANCE]);
  const [transactions, setTransactions] = useState<AgreementTransaction[]>([]);
  const [onInvoiceEntries, setOnInvoiceEntries] = useState<OnInvoiceEntry[]>(
    []
  );
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('off');
  // ⛔ `number | null` — `0` DEĞİL (§2.5, code-reviewer B2).
  // `allSettled`'a geçiş bu vakayı KÖTÜLEŞTİRMİŞTİ: `Promise.all` ikisini
  // birlikte düşürüyordu (belirgin bozukluk); `allSettled` ile reddedilen
  // sayaç `0` olarak render ediliyor ve "Off 0 | On 2 | Tümü 2" İNANDIRICI
  // görünüyordu. `null` = "bilinmiyor", `0` = "ölçüldü ve sıfır".
  const [offInvoiceCount, setOffInvoiceCount] = useState<number | null>(null);
  const [onInvoiceCount, setOnInvoiceCount] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCpl, setSelectedCpl] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isManualEntryModalOpen, setIsManualEntryModalOpen] = useState(false);

  // Load counts only once on mount
  // T-287 K3 vaka 2: `Promise.all` yerine `allSettled` — off-invoice ve
  // on-invoice sayaçları BAĞIMSIZ kaynaklardır (ayrı @Roles kümeleri, ayrı
  // uçlar); birinin reddi diğerinin gösterilmesini engellememeli.
  useEffect(() => {
    const loadCounts = async () => {
      const [offResult, onResult] = await Promise.allSettled([
        offInvoiceEndpoints.getCount(),
        onInvoiceEndpoints.getCount(),
      ]);
      if (offResult.status === 'fulfilled') {
        setOffInvoiceCount(offResult.value);
      } else {
        console.error(
          'Off-invoice count yüklenirken hata oluştu:',
          offResult.reason
        );
        setOffInvoiceCount(null);
      }
      if (onResult.status === 'fulfilled') {
        setOnInvoiceCount(onResult.value);
      } else {
        console.error(
          'On-invoice count yüklenirken hata oluştu:',
          onResult.reason
        );
        setOnInvoiceCount(null);
      }
      if (offResult.status === 'rejected' || onResult.status === 'rejected') {
        // §2.5: kullanıcı BİR ŞEYİN EKSİK olduğunu görmeli — console yetmez.
        toast.error('Bazı sayaçlar yüklenemedi; gösterilen sayılar eksik olabilir.');
      }
    };
    loadCounts();
  }, []);

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo, selectedCpl, selectedStatus]);

  // T-287 K3 vaka 2: `Promise.all` yerine `allSettled`. Off-invoice
  // (`agreement-transactions`, {A,F,P}) ve on-invoice (`on-invoice`,
  // {A,F,P,RO}) AYRI @Roles kümeleridir — biri 403 alsa bile diğeri kendi
  // başına render edilebilmeli. Önceki şekil (`Promise.all`) tek bir
  // reddi sayfanın TAMAMINA yayıyordu (bkz. T-287 brief §K3 vaka 2).
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [txResult, onInvoiceResult, summaryResult] =
        await Promise.allSettled([
          offInvoiceEndpoints.getTransactions({
            invoiceDateFrom: dateFrom || undefined,
            invoiceDateTo: dateTo || undefined,
            cplId: selectedCpl || undefined,
            status: selectedStatus || undefined,
          }),
          onInvoiceEndpoints.getEntries({
            invoiceDateFrom: dateFrom || undefined,
            invoiceDateTo: dateTo || undefined,
            status: selectedStatus || undefined,
          }),
          offInvoiceEndpoints.getSummary({
            invoiceDateFrom: dateFrom || undefined,
            invoiceDateTo: dateTo || undefined,
          }),
        ]);

      let hadFailure = false;

      if (txResult.status === 'fulfilled') {
        const txData = txResult.value;
        // Debug: Log first transaction to check CPL relation
        if (txData.length > 0) {
          console.log('First transaction:', txData[0]);
          console.log('CPL relation:', txData[0].agreement?.cpl);
        }
        setTransactions(txData);
      } else {
        hadFailure = true;
        console.error('Off-invoice işlemleri yüklenirken hata:', txResult.reason);
      }

      if (onInvoiceResult.status === 'fulfilled') {
        setOnInvoiceEntries(onInvoiceResult.value);
      } else {
        hadFailure = true;
        console.error(
          'On-invoice kayıtları yüklenirken hata:',
          onInvoiceResult.reason
        );
      }

      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value);
      } else {
        hadFailure = true;
        console.error('Özet yüklenirken hata:', summaryResult.reason);
      }

      if (hadFailure) {
        toast.error(
          'Bazı veriler yüklenemedi — sayfadaki içeriğin bir kısmı eksik olabilir'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
  };

  const filteredTransactions = transactions
    .filter((tx) => {
      if (activeTab === 'off') {
        return true;
      } else if (activeTab === 'on') {
        return false;
      }
      return true;
    })
    .filter((tx) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        tx.invoiceNo.toLowerCase().includes(query) ||
        tx.agreement?.agreementCode?.toLowerCase().includes(query) ||
        tx.agreement?.agreementName?.toLowerCase().includes(query) ||
        tx.customer?.name?.toLowerCase().includes(query) ||
        tx.customer?.code?.toLowerCase().includes(query) ||
        tx.batchId?.toLowerCase().includes(query)
      );
    });

  const filteredOnInvoiceEntries = onInvoiceEntries
    .filter((entry) => {
      if (activeTab === 'on') {
        return true;
      } else if (activeTab === 'off') {
        return false;
      }
      return true;
    })
    .filter((entry) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        entry.invoiceNo.toLowerCase().includes(query) ||
        entry.customerCode.toLowerCase().includes(query) ||
        entry.customer?.name?.toLowerCase().includes(query) ||
        entry.skuCode.toLowerCase().includes(query) ||
        entry.sku?.name?.toLowerCase().includes(query) ||
        entry.batchId.toLowerCase().includes(query) ||
        entry.batch?.batchCode?.toLowerCase().includes(query)
      );
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fatura İşlemleri</h1>
          <p className="text-gray-600 mt-1">
            Sisteme yüklenen tüm fatura, dekont ve satış verileri
          </p>
        </div>
        <div className="flex space-x-3">
          {canManualEntry && (
            <button
              onClick={() => setIsManualEntryModalOpen(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Manuel Giriş
            </button>
          )}
          <button
            onClick={() => navigate('/off-invoice/upload')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Off-Invoice Yükle
          </button>
          <button
            onClick={() => navigate('/on-invoice/upload')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            On-Invoice Yükle
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">BUGÜN YÜKLENEN</p>
            <p className="text-2xl font-bold">{summary.today.count}</p>
            <p className="text-lg text-gray-600">
              {formatCurrency(summary.today.amount)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">BEKLEYEN (PENDING)</p>
            <p className="text-2xl font-bold">{summary.pending.count}</p>
            <p className="text-lg text-gray-600">
              {formatCurrency(summary.pending.amount)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">TOPLAM İŞLEM</p>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.total.amount)}
            </p>
            <p className="text-lg text-gray-600">
              {summary.total.records} kayıt
            </p>
          </div>
        </div>
      )}

      {/* Off-Invoice Share */}
      {summary && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">OFF-INVOICE PAYI</p>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
              <div
                className="bg-blue-600 h-full flex items-center justify-center text-white text-sm font-medium"
                style={{ width: `${summary.offInvoiceShare.off.percentage}%` }}
              >
                {summary.offInvoiceShare.off.percentage}% Off
              </div>
              {summary.offInvoiceShare.on.percentage > 0 && (
                <div
                  className="bg-gray-400 h-full flex items-center justify-center text-white text-sm font-medium"
                  style={{ width: `${summary.offInvoiceShare.on.percentage}%` }}
                >
                  {summary.offInvoiceShare.on.percentage}% On
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs and Filters */}
      <div className="bg-white rounded-lg shadow">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-4 px-6">
            <button
              onClick={() => setActiveTab('off')}
              className={`py-4 px-2 border-b-2 ${
                activeTab === 'off'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600'
              }`}
            >
              Off-Invoice {offInvoiceCount ?? '?'}
            </button>
            <button
              onClick={() => setActiveTab('on')}
              className={`py-4 px-2 border-b-2 ${
                activeTab === 'on'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600'
              }`}
            >
              On-Invoice {onInvoiceCount ?? '?'}
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`py-4 px-2 border-b-2 ${
                activeTab === 'all'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600'
              }`}
            >
              {/* ⛔ Bilinmeyen bir sayaçla toplam ÜRETİLMEZ (§2.5): eksik
                  bir bileşenin toplamı, tam bir toplam gibi görünür. */}
              Tümü{' '}
              {offInvoiceCount === null || onInvoiceCount === null
                ? '?'
                : offInvoiceCount + onInvoiceCount}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-5 gap-4">
            <div>
              <input
                type="text"
                placeholder="Transaction ID, Anlaşma, Batch veya Fatura No..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <input
                type="date"
                placeholder="Başlangıç Tarihi"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <input
                type="date"
                placeholder="Bitiş Tarihi"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <select
                value={selectedCpl}
                onChange={(e) => setSelectedCpl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">CPL: Tümü</option>
                {/* TODO: Load CPLs */}
              </select>
            </div>
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Status: Tümü</option>
                <option value="POSTED">Posted</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <input type="checkbox" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tip
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Batch / Anlaşma
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fatura Detayı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tutar / İndirim
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  CPL / Müşteri
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Yükleme
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {/* Off-Invoice Transactions */}
              {activeTab === 'off' || activeTab === 'all'
                ? filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input type="checkbox" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {tx.invoiceNo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        OFF
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {tx.agreement?.agreementCode || tx.batchId || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {tx.invoiceNo} ({formatDate(tx.invoiceDate)})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {tx.agreement?.cpl?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          Posted
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatDate(tx.createdAt)} Admin
                      </td>
                    </tr>
                  ))
                : null}

              {/* On-Invoice Entries */}
              {activeTab === 'on' || activeTab === 'all'
                ? filteredOnInvoiceEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input type="checkbox" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {entry.invoiceNo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        ON
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {entry.batch?.batchCode || entry.batchId || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {entry.invoiceNo} ({formatDate(entry.invoiceDate)}) -{' '}
                        {entry.skuCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatCurrency(entry.discount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {entry.customer?.name || entry.customerCode || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            entry.status === 'POSTED'
                              ? 'bg-green-100 text-green-800'
                              : entry.status === 'PENDING'
                                ? 'bg-yellow-100 text-yellow-800'
                                : entry.status === 'ERROR'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatDate(entry.createdAt)}
                      </td>
                    </tr>
                  ))
                : null}

              {/* Empty State */}
              {((activeTab === 'off' && filteredTransactions.length === 0) ||
                (activeTab === 'on' && filteredOnInvoiceEntries.length === 0) ||
                (activeTab === 'all' &&
                  filteredTransactions.length === 0 &&
                  filteredOnInvoiceEntries.length === 0)) && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Kayıt bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Entry Modal */}
      <OffInvoiceManualEntryModal
        isOpen={isManualEntryModalOpen}
        onClose={() => setIsManualEntryModalOpen(false)}
        onSuccess={() => {
          setIsManualEntryModalOpen(false);
          loadData();
        }}
      />
    </div>
  );
}
