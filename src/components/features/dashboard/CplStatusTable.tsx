import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AgreementTypeBadge, StatusBadge } from './DashboardBadges';
import type { CplStatusItem } from '@/api/endpoints/dashboard.endpoints';

interface CplStatusTableProps {
  items: CplStatusItem[];
  canCreateAgreement: boolean;
}

export function CplStatusTable({ items, canCreateAgreement }: CplStatusTableProps) {
  const [query, setQuery] = useState('');

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('tr-TR');
    if (!normalized) return items;
    return items.filter((item) =>
      item.cplName.toLocaleLowerCase('tr-TR').includes(normalized)
    );
  }, [items, query]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-sm font-medium text-gray-900">
            Müşterilerim
          </CardTitle>
          <div className="flex flex-col gap-2 md:flex-row">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ara..."
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-xs text-gray-700 md:w-40 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            {canCreateAgreement && (
              <Link
                to="/agreements/new"
                className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700"
              >
                + Yeni Anlaşma
              </Link>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="grid min-w-[760px] grid-cols-[1.8fr_1fr_1.4fr_auto] border-b border-black/10 pb-2 text-[11px] text-gray-500">
            <div>Müşteri</div>
            <div>Aktif anlaşmalar</div>
            <div>Bekleyen görevler</div>
            <div>Aksiyon</div>
          </div>

          {filteredItems.length === 0 && (
            <p className="py-6 text-sm text-gray-500">Sonuç bulunamadı.</p>
          )}

          {filteredItems.map((item) => (
            <div
              key={item.cplId}
              className="grid min-w-[760px] grid-cols-[1.8fr_1fr_1.4fr_auto] items-center gap-3 border-b border-black/10 py-[10px]"
            >
              <div>
                <p className="text-[13px] font-medium text-gray-900">
                  {item.cplName}
                </p>
                <p className="text-[11px] text-gray-500">{item.channelCode}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                {item.staCount > 0 && (
                  <>
                    <AgreementTypeBadge type="STA" />
                    <span className="text-emerald-700">{item.staCount}</span>
                  </>
                )}
                {item.ltaCount > 0 && (
                  <>
                    <AgreementTypeBadge type="LTA" />
                    <span className="text-indigo-700">{item.ltaCount}</span>
                  </>
                )}
                {item.staCount + item.ltaCount === 0 && (
                  <span className="text-gray-400">—</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {item.pendingApproval > 0 && (
                  <StatusBadge
                    text={`${item.pendingApproval} onay`}
                    tone="approval"
                  />
                )}
                {item.pendingManual > 0 && (
                  <StatusBadge
                    text={`${item.pendingManual} hakediş`}
                    tone="claim"
                  />
                )}
                {item.awaitingInvoice > 0 && (
                  <StatusBadge
                    text={`${item.awaitingInvoice} fatura`}
                    tone="invoice"
                  />
                )}
                {item.isUpToDate && (
                  <StatusBadge text="Guncel" tone="success" />
                )}
                {item.staCount + item.ltaCount === 0 && (
                  <StatusBadge text="Anlaşma yok" tone="neutral" />
                )}
              </div>

              <div>
                {canCreateAgreement ? (
                  <Link
                    to={`/agreements/new?cpl_id=${encodeURIComponent(item.cplId)}`}
                    className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700"
                  >
                    + Anlaşma
                  </Link>
                ) : (
                  <Link
                    to="/reports/agreement-status"
                    className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700"
                  >
                    Rapor
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <Link to="/agreements" className="text-xs font-medium text-blue-700">
            Tüm anlaşmaları gor ({items.length})
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
